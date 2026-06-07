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
