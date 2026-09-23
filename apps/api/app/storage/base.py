from abc import ABC, abstractmethod


class Storage(ABC):
    """Interfaz mínima de almacenamiento de archivos. Ningún router habla directo con
    disco/S3: siempre pasa por aquí (ver CLAUDE.md)."""

    @abstractmethod
    def guardar(self, ruta: str, contenido: bytes) -> str:
        """Guarda el contenido bajo `ruta` y devuelve la ruta de almacenamiento
        (la misma clave que luego se guarda en Evidencia.ruta_almacenamiento)."""

    @abstractmethod
    def leer(self, ruta: str) -> bytes:
        ...

    @abstractmethod
    def eliminar(self, ruta: str) -> None:
        ...
