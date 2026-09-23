"""Sincronización con Google Sheets/Drive — mejora del backend original (que llamaba a un
Apps Script Web App de forma síncrona, bloqueando al operario si Drive fallaba a mitad de
una subida). Aquí corre desacoplada como BackgroundTask después de guardar en Postgres:
Postgres es la fuente de verdad, esto es un espejo de solo-consulta para Trade Marketing.

Implementación pendiente (fase 6 del plan de migración): usar las Sheets API / Drive API
oficiales con una cuenta de servicio (GOOGLE_SERVICE_ACCOUNT_JSON en el .env, nunca en el
cliente). Por ahora deja todo en sync_estado=PENDIENTE sin fallar, para que subir un
archivo o guardar un registro funcione igual sin esa integración configurada.
"""

from __future__ import annotations

import logging

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.evidencia import Evidencia
from app.models.enums import SyncEstado

logger = logging.getLogger(__name__)


def _configurado() -> bool:
    settings = get_settings()
    return bool(settings.google_service_account_json and settings.google_sheet_id)


def sincronizar_evidencia(evidencia_id: int) -> None:
    if not _configurado():
        return  # sin credenciales configuradas todavía: queda en PENDIENTE, no es un error

    db = SessionLocal()
    try:
        evidencia = db.get(Evidencia, evidencia_id)
        if evidencia is None:
            return
        try:
            _subir_a_drive(evidencia)
            evidencia.sync_estado = SyncEstado.OK
            evidencia.sync_error = None
        except Exception as exc:  # noqa: BLE001 — se registra el error, nunca se pierde el archivo
            logger.exception("Fallo sincronizando evidencia %s con Drive", evidencia_id)
            evidencia.sync_estado = SyncEstado.ERROR
            evidencia.sync_error = str(exc)[:500]
        db.commit()
    finally:
        db.close()


def _subir_a_drive(evidencia: Evidencia) -> None:
    raise NotImplementedError("Integración con Drive pendiente — fase 6 del plan de migración")
