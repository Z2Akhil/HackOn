"""Unit tests for CORS/Origin validation (Task 1.4).

Tests the get_allowed_origins() and validate_ws_origin() functions.
Heavy ML dependencies are mocked via conftest.py.
"""
import os
import sys
from unittest.mock import patch, MagicMock

import pytest


def _import_main():
    """Import main module, handling YOLO model loading mock."""
    # Remove cached main to get fresh import with current env
    if "main" in sys.modules:
        del sys.modules["main"]

    # Mock the _load_yolo_model to avoid sys.exit
    with patch.dict(os.environ, os.environ.copy()):
        # Patch sys.exit so YOLO loader doesn't kill process
        with patch("sys.exit"):
            import main
    return main


class TestGetAllowedOrigins:
    """Tests for the get_allowed_origins helper function."""

    def test_default_when_env_not_set(self):
        """Should return localhost:3000 when ALLOWED_ORIGINS is not set."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            result = main.get_allowed_origins()
            assert result == ["http://localhost:3000"]

    def test_default_when_env_is_empty(self):
        """Should return localhost:3000 when ALLOWED_ORIGINS is empty string."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = ""
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            result = main.get_allowed_origins()
            assert result == ["http://localhost:3000"]

    def test_default_when_env_is_whitespace(self):
        """Should return localhost:3000 when ALLOWED_ORIGINS is just spaces."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = "   "
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            result = main.get_allowed_origins()
            assert result == ["http://localhost:3000"]

    def test_single_origin_from_env(self):
        """Should parse a single origin from ALLOWED_ORIGINS."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = "https://example.com"
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            result = main.get_allowed_origins()
            assert result == ["https://example.com"]

    def test_multiple_origins_from_env(self):
        """Should parse comma-separated origins from ALLOWED_ORIGINS."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = "https://app.example.com,http://localhost:3000,https://staging.example.com"
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            result = main.get_allowed_origins()
            assert result == [
                "https://app.example.com",
                "http://localhost:3000",
                "https://staging.example.com",
            ]

    def test_trims_whitespace_around_origins(self):
        """Should trim whitespace around each origin in the comma-separated list."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = " https://a.com , https://b.com "
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            result = main.get_allowed_origins()
            assert result == ["https://a.com", "https://b.com"]

    def test_ignores_empty_entries_from_trailing_commas(self):
        """Should ignore empty entries caused by trailing commas."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = "https://a.com,,https://b.com,"
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            result = main.get_allowed_origins()
            assert result == ["https://a.com", "https://b.com"]


class TestValidateWsOrigin:
    """Tests for WebSocket origin validation."""

    @pytest.mark.asyncio
    async def test_accepts_allowed_origin(self):
        """Should return True when origin matches the default allowed origin."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            ws = MagicMock()
            ws.headers = {"origin": "http://localhost:3000"}
            result = await main.validate_ws_origin(ws)
            assert result is True

    @pytest.mark.asyncio
    async def test_rejects_disallowed_origin(self):
        """Should return False when origin does not match any allowed origin."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            ws = MagicMock()
            ws.headers = {"origin": "http://evil.com"}
            result = await main.validate_ws_origin(ws)
            assert result is False

    @pytest.mark.asyncio
    async def test_rejects_empty_origin(self):
        """Should return False when origin header is missing."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            ws = MagicMock()
            ws.headers = {}
            result = await main.validate_ws_origin(ws)
            assert result is False

    @pytest.mark.asyncio
    async def test_accepts_configured_custom_origin(self):
        """Should accept an origin configured via ALLOWED_ORIGINS env var."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = "https://myapp.com,https://staging.myapp.com"
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            ws = MagicMock()
            ws.headers = {"origin": "https://staging.myapp.com"}
            result = await main.validate_ws_origin(ws)
            assert result is True

    @pytest.mark.asyncio
    async def test_rejects_partial_match(self):
        """Should reject origins that only partially match (no substring matching)."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = "http://localhost:3000"
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            ws = MagicMock()
            ws.headers = {"origin": "http://localhost:3000.evil.com"}
            result = await main.validate_ws_origin(ws)
            assert result is False

    @pytest.mark.asyncio
    async def test_rejects_origin_with_trailing_slash(self):
        """Should reject origin with trailing slash if not in allowed list."""
        env = {k: v for k, v in os.environ.items() if k != "ALLOWED_ORIGINS"}
        env["ALLOWED_ORIGINS"] = "http://localhost:3000"
        with patch.dict(os.environ, env, clear=True):
            main = _import_main()
            ws = MagicMock()
            ws.headers = {"origin": "http://localhost:3000/"}
            result = await main.validate_ws_origin(ws)
            assert result is False
