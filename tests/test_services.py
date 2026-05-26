from server.app.services.autocomplete import build_autocomplete_input, normalize_style


def test_normalize_style_defaults_unknown_values_to_ig() -> None:
    assert normalize_style("") == "ig"
    assert normalize_style("unknown") == "ig"
    assert normalize_style(" REDDIT ") == "reddit"


def test_build_autocomplete_input_marks_context_as_private() -> None:
    text = build_autocomplete_input("sounds good", "are you free later?", "ig")

    assert "Latest received message. Use as private context only" in text
    assert "are you free later?" in text
    assert "sounds good" in text

