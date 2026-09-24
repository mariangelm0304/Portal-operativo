from datetime import datetime

from pydantic import BaseModel

from app.models.enums import SyncEstado


class EvidenciaOut(BaseModel):
    id: int
    registro_id: int
    ranura: str
    etiqueta: str
    nombre_original: str
    tipo_mime: str
    tamano_bytes: int
    subido_por: str
    subido_en: datetime
    sync_estado: SyncEstado
    # Desnormalizado a propósito para el tab Admin → Archivos: evita que el frontend tenga
    # que cruzar evidencias con registros y tiendas solo para pintar una tabla.
    tienda_nombre: str
    zona: str
    actividad: str
    semana: int

    model_config = {"from_attributes": True}
