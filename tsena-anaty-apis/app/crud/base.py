import json
import re
from datetime import datetime, timedelta, date
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

import regex
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import and_, asc, desc, extract, func, inspect, or_, case
from sqlalchemy.orm import (
    Session,
    joinedload,
    load_only,
    with_loader_criteria,
)
from sqlalchemy.sql.sqltypes import Date as SQLAlchemyDate, DateTime as SQLAlchemyDateTime

from app.db.base_class import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).

        **Parameters**

        * `model`: A SQLAlchemy model class
        * `schema`: A Pydantic model (schema) class
        """
        self.model = model

    def _normalize_temporal_value(self, column_name: str, value: Any) -> Any:
        if not isinstance(value, str):
            return value

        column = self.model.__table__.columns.get(column_name)
        if column is None:
            return value

        if isinstance(column.type, SQLAlchemyDateTime):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return value

        if isinstance(column.type, SQLAlchemyDate):
            try:
                return date.fromisoformat(value)
            except ValueError:
                return value

        return value

    def _normalize_model_values(self, values: Dict[str, Any]) -> Dict[str, Any]:
        return {
            key: self._normalize_temporal_value(key, value)
            for key, value in values.items()
        }

    # -------------------------------------------------------------------------
    # Helpers pour les relations & filtres
    # -------------------------------------------------------------------------

    def build_filter_condition(self, attribute, operator: str, value: Any):
        """
        Factorise toute la logique des opérateurs pour pouvoir la réutiliser
        aussi bien dans get_attrs que dans where_relation.
        """
        filter_condition = None

        if operator == "==":
            filter_condition = attribute == value
        elif operator == "!=":
            filter_condition = attribute != value
        elif operator == ">":
            filter_condition = attribute > value
        elif operator == "<":
            filter_condition = attribute < value
        elif operator == "like":
            filter_condition = attribute.like("%" + str(value) + "%")
        elif operator == "month":
            if value is None:
                filter_condition = extract("month", attribute).is_(None)
            else:
                filter_condition = extract("month", attribute) == value
        elif operator == "date":
            date_value = datetime.strptime(value, "%Y-%m-%d").date()
            filter_condition = func.date(attribute) == date_value
        elif operator == "last_24h":
            now = datetime.now()
            twenty_four_hours_ago = now - timedelta(hours=24)
            filter_condition = attribute.between(twenty_four_hours_ago, now)
        elif operator == "between_date":
            date_split = str(value).split(",")
            date_1 = datetime.strptime(
                self.getStringDateTimeFormat(date_split[0]),
                "%Y-%m-%d %H:%M",
            ).date()
            date_2 = datetime.strptime(
                self.getStringDateTimeFormat(date_split[1]),
                "%Y-%m-%d %H:%M",
            ).date()
            filter_condition = attribute.between(date_1, date_2)
        elif operator == "year":
            if value is None:
                filter_condition = extract("year", attribute).is_(None)
            else:
                filter_condition = extract("year", attribute) == value
        elif operator == "lower_or_equal_year":
            if value is None:
                filter_condition = extract("year", attribute).is_(None)
            else:
                filter_condition = extract("year", attribute) <= value
        elif operator == "greater_or_equal_year":
            if value is None:
                filter_condition = extract("year", attribute).is_(None)
            else:
                filter_condition = extract("year", attribute) >= value
        elif operator == "week":
            if value is None:
                filter_condition = extract("week", attribute).is_(None)
            else:
                filter_condition = extract("week", attribute) == value
        elif operator == "isNull":
            filter_condition = attribute.is_(None)
        elif operator == "isNotNull":
            filter_condition = attribute.isnot(None)
        elif operator == "isTrue":
            filter_condition = attribute.is_(True)
        elif operator == "isFalse":
            filter_condition = attribute.is_(False)
        elif operator == "notIn":
            filter_condition = attribute.notin_(value)
        elif operator == "in":
            filter_condition = attribute.in_(value)
        elif operator == "in_date_range":
            filter_condition = self.get_date_filter_by_range(
                date_column=attribute, date_list=value
            )
        elif operator.startswith("json."):
            json_key = "$." + operator.split(".")[1]
            col_value = func.json_extract(
                func.json_unquote(attribute), json_key
            )
            if value == "isNull":
                filter_condition = or_(
                    col_value.is_(None),
                    col_value.is_(False),
                    col_value.like("false"),
                )
            elif value == "isNotNull":
                filter_condition = col_value.isnot(None)
            else:
                filter_condition = col_value.like(value)
        elif operator == "ratio":
            # value = [string, pourcentage]
            filter_condition = func.levenshtein_ratio(
                func.upper(attribute), func.upper(value[0])
            ) > (value[1] / 100)

        return filter_condition

    def apply_where_relation(self, query, where_relation: Optional[List[Dict[str, Any]]]):
        """
        Applique des filtres sur les *relations* sans filtrer le modèle parent
        grâce à with_loader_criteria.

        Exemple d'entrée :
        where_relation = [
            {"key": "annual_register.id_academic_year", "operator": "==", "value": 1},
            {"key": "annual_register.register_semester.id_semester", "operator": "==", "value": 1},
        ]
        """
        if not where_relation:
            return query

        for condition in where_relation:
            key = condition.get("key")
            operator = condition.get("operator")
            value = condition.get("value")

            if not key or not operator:
                continue
            if isinstance(key, list):
                # Pour simplifier, on ne gère pas encore les listes ici
                continue

            path_parts = key.split(".")
            if len(path_parts) < 2:
                # pas une relation, on ignore ici (logique parent-only dans where)
                continue

            # Tout sauf le dernier élément = chaîne de relations
            relation_parts = path_parts[:-1]
            column_name = path_parts[-1]

            # On remonte la chaîne de relations pour trouver le modèle cible
            current_model = self.model
            for rel_name in relation_parts:
                rel_attr = getattr(current_model, rel_name)
                current_model = rel_attr.property.mapper.class_

            target_model = current_model

            # On construit directement la condition SQLAlchemy sur le modèle cible
            col = getattr(target_model, column_name)
            condition_expr = self.build_filter_condition(col, operator, value)

            if condition_expr is None:
                continue

            query = query.options(
                with_loader_criteria(
                    target_model,
                    condition_expr,  # ⚠️ ICI : expression directe, plus de lambda
                    include_aliases=True,
                )
            )

        return query

    # -------------------------------------------------------------------------
    # Relations loading
    # -------------------------------------------------------------------------

    def get_all_relations(self, relations: List[str]):
        # Wrapper simple pour garder la compatibilité avec le reste du code
        return self.get_joined_load(relations)

    def get_joined_load(self, relations: List[str]):
        def process_relation(relation: str):
            parts = relation.split(".")
            previous_model = self.model
            result = None

            for i in range(len(parts)):
                part = parts[i]

                if "{" in part and "}" in part:
                    relationship, columns = part.split("{")
                    columns = columns.rstrip("}").split(",")
                else:
                    relationship = part
                    columns = []

                attr = getattr(previous_model, relationship)

                if result:
                    result = result.joinedload(attr)
                else:
                    result = joinedload(attr)

                # Use current model BEFORE updating previous_model
                current_model = attr.property.mapper.class_

                if columns:
                    result = result.load_only(*[getattr(current_model, col) for col in columns])
                else:
                    result = result.load_only(getattr(current_model, "id"))

                previous_model = current_model

            return result

        options = []
        for relation in relations:
            options.append(process_relation(relation))

        return options

    # -------------------------------------------------------------------------
    # Parsing des clés/conditions
    # -------------------------------------------------------------------------

    def get_key_parts(self, key):
        subpart_start_idx = key.find(".[")
        last_index_of_parts1 = len(key)
        if subpart_start_idx >= 0:
            last_index_of_parts1 = subpart_start_idx
        result = key[:last_index_of_parts1].split(".")
        if subpart_start_idx >= 0:
            subpart_keys = regex.sub(
                r"(?<=\[[^\]]*),(?=[^\[]*\])",
                ";",
                key[subpart_start_idx + 2: len(key) - 1],
            ).split(",")
            all_sub_parts = []

            for i in range(0, len(subpart_keys)):
                subpart = self.get_key_parts(regex.sub(";", ",", subpart_keys[i]))
                all_sub_parts.append(subpart)

            if len(all_sub_parts) > 0:
                result.append(all_sub_parts)

        return result

    def get_cond_reccur(self, attrs, condition_operator: Any = and_):
        attrs.reverse()
        cond = None
        for i in range(0, len(attrs)):
            if isinstance(attrs[i], list):
                conditions = []
                for sub in attrs[i]:
                    conditions.append(self.get_cond_reccur(sub))
                cond = condition_operator(*conditions)
            else:
                attr, all = attrs[i]
                if i == 0:
                    cond = attr
                else:
                    try:
                        cond = attr.has(cond)
                    except:
                        cond = attr.any(cond)
                        if all:
                            cond = ~cond
        return cond

    def get_condition_deep_multiple(self, condition):
        key = condition.get("key", None)
        value = condition.get("value", None)
        operator = condition.get("operator", None)
        # key, value, operator must be an array and with same length
        # If `key` is a list, combine the per-key conditions using the
        # requested `match` (defaults to AND). Previously this branch
        # always OR'ed the subconditions which made multi-key
        # conditions behave incorrectly when `match` == "and".
        if isinstance(key, list):
            cond_arr_sql = []
            # operators may be a string like '==,==' or already a list
            ops = operator if isinstance(operator, list) else operator.split(",")
            vals = []
            if value is None:
                vals = [None] * len(key)
            elif isinstance(value, list):
                vals = value
            else:
                vals = str(value).split(",")

            for i in range(len(key)):
                current_cond = {
                    "key": key[i],
                    "operator": ops[i] if i < len(ops) else ops[-1],
                    "value": vals[i] if i < len(vals) else None,
                }
                cond_sql = self.sub_get_condition_deep_multiple(
                    condition=current_cond
                )
                if cond_sql is not None:
                    cond_arr_sql.append(cond_sql)

            if not cond_arr_sql:
                return None

            match = condition.get("match", "and")
            return or_(*cond_arr_sql) if match == "or" else and_(*cond_arr_sql)

        return self.sub_get_condition_deep_multiple(
            condition=condition
        )

    def sub_get_condition_deep_multiple(self, condition):
        keys = self.get_key_parts(condition["key"])
        operators = condition["operator"].split(",")
        values = [condition.get("value", None)]
        match = condition.get("match", "and")
        if len(operators) > 1 and values[0]:
            if "[[" in values[0]:
                values = json.loads(values[0])
            else:
                values = str(values[0]).split(",")
        condition_operator = or_ if match == "or" else and_
        current_idx = {"value": 0}
        attrs = self.get_attrs(self.model, current_idx, keys, operators, values)
        cond = self.get_cond_reccur(attrs=attrs, condition_operator=condition_operator)
        return cond

    def getStringDateTimeFormat(self, date_string):
        if len(date_string.split(" ")) >= 2:
            return date_string
        else:
            parsed_date = datetime.strptime(date_string, "%Y-%m-%d")
            formatted_string = parsed_date.strftime("%Y-%m-%d %H:%M")
        return formatted_string

    def get_attrs(self, parent_model, current_idx, keys, operators, values):
        previous_model = parent_model
        attrs = []
        for i in range(0, len(keys)):
            if i < len(keys) - 1:
                key_temp = keys[i]
                all = False
                if key_temp.startswith("~"):
                    key_temp = key_temp[1:]
                    all = True
                attr = getattr(previous_model, key_temp)
                previous_model = attr.property.mapper.class_
                attrs.append((attr, all))
            else:
                if isinstance(keys[i], str):
                    idx = current_idx["value"]
                    operator = operators[idx]
                    value = values[idx]
                    filter_condition = None
                    if keys[i].startswith("@"):
                        method_name = keys[i]
                        args = value["args"]
                        value = value["operator_value"]
                        method = getattr(previous_model, method_name.replace("@", ""))
                        attribute = method(*args)
                    else:
                        attribute = getattr(previous_model, keys[i])

                    # On utilise maintenant le helper factorisé
                    filter_condition = self.build_filter_condition(attribute, operator, value)

                    idx += 1
                    current_idx["value"] = idx
                    attrs.append((filter_condition, False))
                else:
                    same_level = []
                    for key in keys[i]:
                        same_level.append(
                            self.get_attrs(
                                previous_model, current_idx, key, operators, values
                            )
                        )
                    attrs.append(same_level)

        return attrs

    # -------------------------------------------------------------------------
    # READ
    # -------------------------------------------------------------------------

    def get(
            self,
            db: Session,
            id: Any,
            where: Any = None,
            where_relation: Any = None,
            relations=None,
            include_deleted=False,
    ) -> Optional[ModelType]:
        query = db.query(self.model).filter(self.model.id == id)

        if where is not None and isinstance(where, list):
            conditions = self.get_full_condition(
                where=where,
                include_deleted=include_deleted,
            )
            if conditions is not None:
                query = query.filter(conditions)

        # Nouveau : filtres sur les relations qui ne touchent pas le parent
        if where_relation is not None and isinstance(where_relation, list):
            query = self.apply_where_relation(query, where_relation)

        if relations is not None and len(relations) > 0:
            query = query.options(*self.get_all_relations(relations))

        return query.first()

    def get_first_where_array(
            self, db: Session, *, where: Any = None, where_relation: Any = None,
            relations=None, base_columns=None
    ) -> List[ModelType]:
        query = db.query(self.model)
        conditions = self.get_full_condition(
            where=where
        )
        if conditions is not None:
            query = query.filter(conditions)

        if where_relation is not None and isinstance(where_relation, list):
            query = self.apply_where_relation(query, where_relation)

        if base_columns is not None and len(base_columns) > 0:
            print(base_columns)
            query = query.options(load_only(*[getattr(self.model, col) for col in base_columns]))

        if relations is not None and len(relations) > 0:
            load_options = self.get_joined_load(relations)
            query = query.options(*load_options)

        result = query.first()

        return result

    def get_multi_where_array(
            self,
            db: Session,
            *,
            skip: int = 0,
            limit: int = 100,
            order_by: str = "id",
            where: Any = None,
            where_relation: Any = None,
            order: str = "DESC",
            base_columns=None,
            relations=None,
            include_deleted: bool = False,
            order_by_subquery=None,
            today_first: bool = False,
    ) -> List[ModelType]:
        query = db.query(self.model)
        conditions = self.get_full_condition(
            where=where,
            include_deleted=include_deleted,
        )
        if conditions is not None:
            query = query.filter(conditions)

        # Nouveau : filtres relationnels non filtrants pour le parent
        if where_relation is not None and isinstance(where_relation, list):
            query = self.apply_where_relation(query, where_relation)

        order_function = asc
        if order == "DESC":
            order_function = desc

        if order_by_subquery is not None:
            query = query.order_by(order_function(order_by_subquery))
        else:
            today = date.today()
            if len(order_by.split(".")) > 1:
                if today_first:
                    order_by_subquery = self.get_order_by_subquery(
                        db=db, order_by_key=order_by
                    )
                    query = query.order_by(
                        case([(func.date(order_by_subquery) == today, 0)], else_=1),
                        order_function(order_by_subquery),
                    )
                else:
                    order_by_subquery = self.get_order_by_subquery(
                        db=db, order_by_key=order_by
                    )
                    query = query.order_by(order_function(order_by_subquery))
            else:
                if today_first:
                    order_by_attribute = getattr(self.model, order_by)

                    query = query.order_by(
                        case([(func.date(order_by_attribute) == today, 0)], else_=1),
                        order_function(order_by_attribute),
                    )
                else:
                    order_by_attribute = getattr(self.model, order_by)
                    query = query.order_by(order_function(order_by_attribute))

        query = (
            query.order_by(
                desc(getattr(self.model, "id")),
            )
            .offset(skip)
            .limit(limit)
        )
        print(len(base_columns), base_columns)
        if base_columns is not None and len(base_columns) > 0:
            cols_to_load = list(base_columns)
            pk_cols = [key.name for key in inspect(self.model).primary_key]
            for pk in pk_cols:
                if pk not in cols_to_load:
                    cols_to_load.append(pk)

            query = query.options(load_only(*[getattr(self.model, col) for col in cols_to_load]))

        if relations is not None and len(relations) > 0:
            load_options = self.get_joined_load(relations)
            query = query.options(*load_options)

        result = query.all()
        return result

    def get_order_by_subquery(self, db: Session, *, order_by_key):
        key_segments = order_by_key.split(".")
        subquery_filter = True
        attribute = getattr(self.model, key_segments[0])
        joins = []
        last_attribut = self.model
        first_attribut = attribute.property.mapper.class_
        if len(key_segments) > 1:
            for segment in key_segments[1:]:
                last_attribut = attribute.property.mapper.class_

                if segment.startswith("@"):
                    pattern = r"@(\w+)(\(.*\))"
                    match = re.search(pattern, segment)
                    method_name = match.group(1)
                    argument = match.group(2)
                    attribute = eval("method" + argument)
                else:
                    attribute = getattr(attribute.property.mapper.class_, segment)

                if segment != key_segments[-1]:
                    joins.insert(0, attribute)

        model_mapper = inspect(first_attribut)

        for relationship in model_mapper.relationships:

            if relationship.mapper.class_ == self.model:
                foreign_key_column = list(relationship.local_columns)[0]
                subquery_filter = foreign_key_column == self.model.id
                break

        subquery_query = db.query(attribute).select_from(last_attribut)
        for relation in joins:
            subquery_query = subquery_query.join(relation)
        subquery = subquery_query.filter(subquery_filter).limit(1).as_scalar()
        return subquery

    # -------------------------------------------------------------------------
    # CREATE / UPDATE / DELETE
    # -------------------------------------------------------------------------

    def create(
            self,
            db: Session,
            *,
            obj_in: CreateSchemaType,
            user_id: int = None,
            commit: bool = True,
            refresh: bool = True,
    ) -> ModelType:
        # Convert to dict and ensure datetime objects are properly handled
        obj_in_data = self._normalize_model_values(obj_in.model_dump())

        # Create the database object
        db_obj = (
            self.model(**obj_in_data)
            if not user_id
            else self.model(**obj_in_data, last_user_to_interact=user_id)
        )

        db.add(db_obj)
        if commit:
            db.commit()
        if refresh:
            db.refresh(db_obj)
        return db_obj

    def update(
            self,
            db: Session,
            *,
            db_obj: ModelType,
            obj_in: Union[UpdateSchemaType, Dict[str, Any]],
            user_id: int = None,
            commit: bool = True,
    ) -> ModelType:
        obj_data = jsonable_encoder(db_obj)

        # 🔁 Pydantic v2 compliant way to extract data
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        update_data = self._normalize_model_values(update_data)

        update_data["updated_at"] = func.now()

        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        if commit:
            db.commit()
            db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, *, id: int, commit: bool = True) -> ModelType:
        obj = db.get(self.model, id)
        db.delete(obj)
        if commit:
            db.commit()
        return obj

    # -------------------------------------------------------------------------
    # COUNT / CONDITIONS FULL
    # -------------------------------------------------------------------------

    def get_count_where_array(
            self,
            db: Session,
            where: Any = None,
            include_deleted=False,
    ) -> int:
        query = db.query(self.model.id)

        conditions = self.get_full_condition(
            where=where,
            include_deleted=include_deleted,
        )
        if conditions is not None:
            query = query.filter(conditions)

        result = query.count()
        return result

    def get_full_condition(
            self, where: Any = None, include_deleted=False
    ) -> Any:
        if not include_deleted:
            if not where:
                where = []
            where.append(
                {
                    "key": "deleted_at",
                    "operator": "isNull",
                }
            )
        if where is not None:
            conditions = []
            for parent_condition in where:
                if isinstance(parent_condition, list):
                    # This is an OR condition - any of the conditions in the list should be true
                    temp_conditions = []
                    for condition in parent_condition:
                        filter_condition = self.get_condition_deep_multiple(
                            condition=condition
                        )
                        if filter_condition is not None:
                            temp_conditions.append(filter_condition)
                    if temp_conditions:
                        conditions.append(or_(*temp_conditions))
                else:
                    # This is a normal AND condition
                    filter_condition = self.get_condition_deep_multiple(
                        condition=parent_condition
                    )
                    if filter_condition is not None:
                        conditions.append(filter_condition)

            if conditions:
                return and_(*conditions)
        return None

    # -------------------------------------------------------------------------
    # Date helpers
    # -------------------------------------------------------------------------

    def get_date_filter_by_range(self, date_column, date_list):
        filters = []
        for date_value in date_list:
            parts = date_value.split("-")
            if len(parts) == 1:
                year = int(parts[0])
                filters.append(extract("year", date_column) == year)
            elif len(parts) == 2:
                year = int(parts[0])
                month = int(parts[1])
                filters.append(
                    and_(
                        extract("year", date_column) == year,
                        extract("month", date_column) == month,
                    )
                )
        return or_(*filters)
