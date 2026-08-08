from typing import List, Optional
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.product_variants import ProductVariants
from app.schemas.product_variants import ProductVariantCreate, ProductVariantUpdate


class CRUDProductVariant(CRUDBase[ProductVariants, ProductVariantCreate, ProductVariantUpdate]):
    def get_multi_by_product(self, db: Session, *, product_id: int) -> List[ProductVariants]:
        return db.query(ProductVariants).filter(ProductVariants.product_id == product_id).all()

    def get_roots(self, db: Session, *, product_id: int) -> List[ProductVariants]:
        return (
            db.query(ProductVariants)
            .filter(ProductVariants.product_id == product_id, ProductVariants.parent_id.is_(None))
            .all()
        )

    def get_by_name(
        self, db: Session, *, product_id: int, parent_id: Optional[int], name: str
    ) -> Optional[ProductVariants]:
        query = db.query(ProductVariants).filter(
            ProductVariants.product_id == product_id,
            ProductVariants.name == name,
        )
        if parent_id is None:
            query = query.filter(ProductVariants.parent_id.is_(None))
        else:
            query = query.filter(ProductVariants.parent_id == parent_id)
        return query.first()

    def has_children(self, db: Session, *, variant_id: int) -> bool:
        return (
            db.query(ProductVariants.id)
            .filter(ProductVariants.parent_id == variant_id)
            .first()
            is not None
        )

    def get_children(self, db: Session, *, parent_id: int) -> List[ProductVariants]:
        return (
            db.query(ProductVariants)
            .filter(ProductVariants.parent_id == parent_id)
            .order_by(ProductVariants.id.asc())
            .all()
        )

    def get_subtree_ids(self, db: Session, *, variant_id: int) -> set:
        """Identifiants du nœud et de tous ses descendants."""
        result: set = set()
        stack = [variant_id]
        while stack:
            node_id = stack.pop()
            if node_id in result:
                continue
            result.add(node_id)
            for child in self.get_children(db, parent_id=node_id):
                stack.append(child.id)
        return result

    def get_leaves(self, db: Session, *, variant_id: int) -> List[ProductVariants]:
        """Feuilles vendables de la sous-arborescence (le nœud lui-même s'il est une feuille)."""
        subtree_ids = self.get_subtree_ids(db, variant_id=variant_id)
        if len(subtree_ids) <= 1:
            node = self.get(db, id=variant_id)
            return [node] if node else []
        parent_ids = {
            child.parent_id
            for child in db.query(ProductVariants)
            .filter(ProductVariants.parent_id.in_(subtree_ids))
            .all()
        }
        leaf_ids = subtree_ids - parent_ids
        return (
            db.query(ProductVariants)
            .filter(ProductVariants.id.in_(leaf_ids))
            .order_by(ProductVariants.id.asc())
            .all()
        )

    def effective_quantity(self, db: Session, *, variant_id: int) -> int:
        """Stock d'une variante = somme des quantités de ses sous-variantes (feuilles)."""
        return sum(leaf.quantity or 0 for leaf in self.get_leaves(db, variant_id=variant_id))

    def sum_quantity(self, db: Session, *, product_id: int) -> int:
        roots = self.get_roots(db, product_id=product_id)
        return sum(self.effective_quantity(db, variant_id=root.id) for root in roots)


product_variants = CRUDProductVariant(ProductVariants)
