"""PostGIS 확장, regions·visits·photos 생성

Revision ID: 0002_regions_visits_photos
Revises: 0001_auth_groups
Create Date: 2026-11-14

regions.boundary(경계)는 ORM 모델에 매핑하지 않고 여기서만 만든다.
경계 데이터 적재: python -m app.scripts.load_regions
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_regions_visits_photos"
down_revision: str | None = "0001_auth_groups"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "regions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("region_code", sa.String(length=10), nullable=False),
        sa.Column("adm_cd", sa.String(length=8), nullable=False),
        sa.Column("name", sa.String(length=30), nullable=False),
        sa.Column("sigungu_name", sa.String(length=30), nullable=False),
        sa.Column("data_version", sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_regions")),
        sa.UniqueConstraint("region_code", name=op.f("uq_regions_region_code")),
    )
    # 위치 판정용 원본 경계. 빈 테이블이라 NOT NULL을 바로 걸 수 있다
    op.execute("ALTER TABLE regions ADD COLUMN boundary geometry(MultiPolygon, 4326) NOT NULL")
    op.execute("CREATE INDEX ix_regions_boundary ON regions USING GIST (boundary)")

    op.create_table(
        "visits",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("region_id", sa.BigInteger(), nullable=False),
        sa.Column("visit_date", sa.Date(), nullable=False),
        sa.Column(
            "reward_eligible", sa.Boolean(), server_default=sa.false(), nullable=False
        ),
        sa.Column("eligible_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], name=op.f("fk_visits_group_id_groups"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["region_id"], ["regions.id"], name=op.f("fk_visits_region_id_regions")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_visits")),
        sa.UniqueConstraint(
            "group_id", "visit_date", "region_id", name=op.f("uq_visits_group_id")
        ),
    )

    op.create_table(
        "photos",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("visit_id", sa.BigInteger(), nullable=False),
        sa.Column("uploader_id", sa.BigInteger(), nullable=False),
        sa.Column("file_path", sa.String(length=255), nullable=False),
        sa.Column("original_sha256", sa.String(length=64), nullable=False),
        sa.Column("taken_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location_source", sa.String(length=10), nullable=False),
        sa.Column("reward_eligible", sa.Boolean(), nullable=False),
        sa.Column("ineligible_reason", sa.String(length=30), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "location_source IN ('exif', 'manual')", name=op.f("ck_photos_location_source")
        ),
        sa.ForeignKeyConstraint(
            ["group_id"], ["groups.id"], name=op.f("fk_photos_group_id_groups"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["visit_id"], ["visits.id"], name=op.f("fk_photos_visit_id_visits"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["uploader_id"], ["users.id"], name=op.f("fk_photos_uploader_id_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_photos")),
        sa.UniqueConstraint("group_id", "original_sha256", name=op.f("uq_photos_group_id")),
    )
    op.create_index(op.f("ix_photos_visit_id"), "photos", ["visit_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_photos_visit_id"), table_name="photos")
    op.drop_table("photos")
    op.drop_table("visits")
    op.drop_table("regions")
    # postgis 확장은 다른 데이터가 쓸 수 있어 지우지 않는다
