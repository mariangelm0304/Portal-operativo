from pathlib import Path

from app.storage.base import Storage


class LocalStorage(Storage):
    """Implementación de desarrollo: guarda en disco bajo `raiz`. En producción no se usa
    (ver docker-compose/README): el disco de la mayoría de PaaS no es persistente."""

    def __init__(self, raiz: str):
        self.raiz = Path(raiz)
        self.raiz.mkdir(parents=True, exist_ok=True)

    def _resolver(self, ruta: str) -> Path:
        destino = (self.raiz / ruta).resolve()
        if self.raiz.resolve() not in destino.parents and destino != self.raiz.resolve():
            raise ValueError("Ruta fuera del directorio de almacenamiento")
        return destino

    def guardar(self, ruta: str, contenido: bytes) -> str:
        destino = self._resolver(ruta)
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(contenido)
        return ruta

    def leer(self, ruta: str) -> bytes:
        return self._resolver(ruta).read_bytes()

    def eliminar(self, ruta: str) -> None:
        destino = self._resolver(ruta)
        if destino.exists():
            destino.unlink()
