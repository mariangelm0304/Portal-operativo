import enum


class Actividad(str, enum.Enum):
    """Las 3 actividades semanales del portal, cada una con un rol responsable distinto."""

    inventario = "inventario"
    calidad = "calidad"
    pistoleo = "pistoleo"


class Rol(str, enum.Enum):
    coordinador = "coordinador"
    tecnico = "tecnico"
    auxiliar = "auxiliar"
    admin = "admin"


class EstadoRegistro(str, enum.Enum):
    """Espejo de EST en el portal original (index.html) — el significado de cada
    estado y si cuenta como cumplimiento vive en app/services/cumplimiento.py."""

    REPORTADO = "REPORTADO"
    SIN_REPORTE = "SIN_REPORTE"
    ENVIADA = "ENVIADA"
    NO_ENVIADA = "NO_ENVIADA"
    SIN_TECNICO = "SIN_TECNICO"
    REGISTRADO = "REGISTRADO"
    NO_REALIZADO = "NO_REALIZADO"
    AUSENCIA = "AUSENCIA"
    PENDIENTE = "PENDIENTE"
    SIN_DATO = "SIN_DATO"


class SyncEstado(str, enum.Enum):
    """Estado de la sincronización con Google Sheets/Drive (ver services/sync_google.py).
    Nunca bloquea el guardado en Postgres: es informativo, con reintento manual desde Admin."""

    PENDIENTE = "pendiente"
    OK = "ok"
    ERROR = "error"
