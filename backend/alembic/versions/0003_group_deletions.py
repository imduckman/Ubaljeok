"""그룹 삭제 후 파일 정리를 재시도하기 위한 임시 기록."""

import sqlalchemy as sa
from alembic import op

revision = "0003_group_deletions"
down_revision = "0002_regions_visits_photos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "group_deletions",
        sa.Column("group_id", sa.BigInteger(), nullable=False),
        sa.Column("requested_by", sa.BigInteger(), nullable=False),
        sa.Column("file_paths", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("group_id", name=op.f("pk_group_deletions")),
    )


def downgrade() -> None:
    op.drop_table("group_deletions")
