from fastapi import APIRouter

from app.api.v1 import actividades, admin, auth, calendario, evidencias, export, registros, tiendas, trazas

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(tiendas.router, prefix="/tiendas", tags=["tiendas"])
router.include_router(actividades.router, prefix="/actividades", tags=["actividades"])
router.include_router(calendario.router, prefix="/calendario", tags=["calendario"])
router.include_router(registros.router, prefix="/registros", tags=["registros"])
router.include_router(evidencias.router, prefix="/evidencias", tags=["evidencias"])
router.include_router(trazas.router, prefix="/trazas", tags=["trazas"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
router.include_router(export.router, prefix="/export", tags=["export"])
