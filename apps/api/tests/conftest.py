import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_pin
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.admin_config import AdminConfig
from app.models.tienda import Tienda

PIN_TIENDA = "1234"
PIN_ADMIN = "JAMAR2026"


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def tienda_principal(db_session):
    tienda = Tienda(
        ag="01",
        nombre="PRINCIPAL",
        slug="PRINCIPAL",
        zona="Atlántico",
        nombre_pistoleo="PRINCIPAL",
        verificar=False,
        coordinador="Mariano Lozano",
        tecnico="Carlos Gonzalez",
        pin_hash=hash_pin(PIN_TIENDA),
    )
    db_session.add(tienda)
    db_session.add(AdminConfig(id=1, admin_pin_hash=hash_pin(PIN_ADMIN), retencion_semanas=3))
    db_session.commit()
    db_session.refresh(tienda)
    return tienda
