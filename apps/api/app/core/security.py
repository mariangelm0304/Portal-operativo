from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_pin(pin: str, pin_hash: str) -> bool:
    return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))


def crear_token(datos: dict[str, Any]) -> str:
    settings = get_settings()
    expira = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expira_minutos)
    payload = {**datos, "exp": expira}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decodificar_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
