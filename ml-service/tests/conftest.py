"""Conftest to mock heavy dependencies for unit testing."""
import sys
from unittest.mock import MagicMock

# Mock all heavy dependencies that aren't available in test environment
_modules_to_mock = [
    "cv2",
    "numpy",
    "ultralytics",
    "fastapi",
    "fastapi.middleware",
    "fastapi.middleware.cors",
    "pydantic",
]

for mod_name in _modules_to_mock:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = MagicMock()

# Set up specific mock attributes needed by main.py
_fastapi_mock = sys.modules["fastapi"]

# FastAPI class mock
_app_mock = MagicMock()
_fastapi_mock.FastAPI = MagicMock(return_value=_app_mock)

# WebSocket class mock
class _FakeWebSocket:
    pass

_fastapi_mock.WebSocket = _FakeWebSocket
_fastapi_mock.HTTPException = Exception
_fastapi_mock.WebSocketDisconnect = Exception

# CORS middleware mock
_cors_mock = sys.modules["fastapi.middleware.cors"]
_cors_mock.CORSMiddleware = MagicMock()

# Pydantic BaseModel mock
_pydantic_mock = sys.modules["pydantic"]
_pydantic_mock.BaseModel = object

# numpy mock
_np = sys.modules["numpy"]
_np.uint8 = 0
_np.array = MagicMock()
_np.frombuffer = MagicMock()
