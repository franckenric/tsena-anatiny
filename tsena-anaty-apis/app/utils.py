import ast
import json
import random
import uuid
from datetime import datetime


def camel_to_snake(name):
    """Convert CamelCase to snake_case."""
    snake_case = ""
    for i, char in enumerate(name):
        if char.isupper() and i != 0:
            snake_case += "_"
        snake_case += char.lower()
    return snake_case


def parse_query_array(value, default=None):
    """
    Parse a query parameter that is expected to hold a JSON array (or legacy
    Python literal) such as ``relation``, ``where``, ``where_relation`` or
    ``base_columns``.

    The front-end serializes these with ``JSON.stringify``, which produces
    ``null`` for ``undefined``/``NaN`` — something ``ast.literal_eval`` cannot
    parse (it only understands Python literals, where the equivalent is
    ``None``). JSON is parsed first; Python literals are kept as a fallback for
    older clients.
    """
    if value in (None, "", [], "[]"):
        return default

    if isinstance(value, (list, dict)):
        return value

    try:
        return json.loads(value)
    except (TypeError, ValueError):
        pass

    try:
        return ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return default
