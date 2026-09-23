"""esquema inicial

Revision ID: 800fe22e7ab6
Revises:
Create Date: 2026-09-23 14:20:13.496751

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '800fe22e7ab6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tiendas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ag", sa.String(4), nullable=False),
        sa.Column("nombre", sa.String(80), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("zona", sa.String(60), nullable=False),
        sa.Column("nombre_pistoleo", sa.String(80), nullable=False),
        sa.Column("verificar", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("coordinador", sa.String(120), nullable=True),
        sa.Column("estado_coordinador", sa.String(20), nullable=False, server_default="SIN_ASIGNAR"),
        sa.Column("tecnico", sa.String(120), nullable=True),
        sa.Column("estado_tecnico", sa.String(20), nullable=False, server_default="SIN_ASIGNAR"),
        sa.Column("auxiliar", sa.String(120), nullable=True),
        sa.Column("estado_auxiliar", sa.String(20), nullable=False, server_default="SIN_ASIGNAR"),
        sa.Column("pin_hash", sa.String(120), nullable=False),
    )
    op.create_index("ix_tiendas_ag", "tiendas", ["ag"], unique=True)
    op.create_index("ix_tiendas_slug", "tiendas", ["slug"], unique=True)

    op.create_table(
        "personas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tienda_id", sa.Integer(), sa.ForeignKey("tiendas.id"), nullable=False),
        sa.Column("rol", sa.String(20), nullable=False),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "registros",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actividad", sa.String(20), nullable=False),
        sa.Column("tienda_id", sa.Integer(), sa.ForeignKey("tiendas.id"), nullable=False),
        sa.Column("semana", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("datos", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("reportado_por", sa.String(120), nullable=False),
        sa.Column("reportado_rol", sa.String(20), nullable=False),
        sa.Column("sync_estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("sync_error", sa.String(500), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "actualizado_en",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("actividad", "tienda_id", "semana", name="uq_registro_semana"),
    )
    op.create_index("ix_registros_actividad", "registros", ["actividad"])
    op.create_index("ix_registros_tienda_id", "registros", ["tienda_id"])
    op.create_index("ix_registros_semana", "registros", ["semana"])

    op.create_table(
        "evidencias",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("registro_id", sa.Integer(), sa.ForeignKey("registros.id"), nullable=False),
        sa.Column("ranura", sa.String(40), nullable=False),
        sa.Column("etiqueta", sa.String(120), nullable=False),
        sa.Column("nombre_original", sa.String(255), nullable=False),
        sa.Column("ruta_almacenamiento", sa.String(500), nullable=False),
        sa.Column("tipo_mime", sa.String(120), nullable=False),
        sa.Column("tamano_bytes", sa.BigInteger(), nullable=False),
        sa.Column("subido_por", sa.String(120), nullable=False),
        sa.Column("subido_en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("sync_estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("sync_error", sa.String(500), nullable=True),
    )
    op.create_index("ix_evidencias_registro_id", "evidencias", ["registro_id"])

    op.create_table(
        "trazas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actividad", sa.String(20), nullable=False),
        sa.Column("tienda_id", sa.Integer(), sa.ForeignKey("tiendas.id"), nullable=False),
        sa.Column("tienda_nombre", sa.String(80), nullable=False),
        sa.Column("semana", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("por", sa.String(120), nullable=False),
        sa.Column("rol", sa.String(20), nullable=False),
        sa.Column("en", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "admin_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_pin_hash", sa.String(120), nullable=False),
        sa.Column("retencion_semanas", sa.Integer(), nullable=False, server_default="3"),
    )


def downgrade() -> None:
    op.drop_table("admin_config")
    op.drop_table("trazas")
    op.drop_index("ix_evidencias_registro_id", table_name="evidencias")
    op.drop_table("evidencias")
    op.drop_index("ix_registros_semana", table_name="registros")
    op.drop_index("ix_registros_tienda_id", table_name="registros")
    op.drop_index("ix_registros_actividad", table_name="registros")
    op.drop_table("registros")
    op.drop_table("personas")
    op.drop_index("ix_tiendas_slug", table_name="tiendas")
    op.drop_index("ix_tiendas_ag", table_name="tiendas")
    op.drop_table("tiendas")
