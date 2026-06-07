# begin #
# ---write your code here--- #
# end #

from app.utils import camel_to_snake

def test_camel_to_snake():
    """Test that camel_to_snake converts CamelCase to snake_case."""

    # Basic conversions
    assert camel_to_snake('TestValue') == 'test_value'
    assert camel_to_snake('CamelCase') == 'camel_case'

    # Single word
    assert camel_to_snake('single') == 'single'
    assert camel_to_snake('Word') == 'word'

    # Already snake_case
    assert camel_to_snake('already_snake') == 'already_snake'

    # All caps
    assert camel_to_snake('ABC') == 'a_b_c'
    assert camel_to_snake('XML') == 'x_m_l'

    # Edge cases
    assert camel_to_snake('') == ''


# begin #
# ---write your code here--- #
# end #
