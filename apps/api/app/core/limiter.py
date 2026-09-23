from slowapi import Limiter
from slowapi.util import get_remote_address

# Un solo Limiter compartido por toda la app; se registra en app/main.py.
# El login es el endpoint que más lo necesita: un PIN de 4 dígitos es fuerza-bruteable
# rápido sin esto (ver CLAUDE.md, checklist de seguridad).
limiter = Limiter(key_func=get_remote_address)
