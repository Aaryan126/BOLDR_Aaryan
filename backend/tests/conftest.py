import pytest

from app.core.config import get_settings


@pytest.fixture(autouse=True)
def disable_live_ai_for_tests(monkeypatch):
    monkeypatch.setenv("AI_LIVE_ENABLED", "false")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
