"""Use a neutral name for the unmarried-parents case.

Revision ID: 20260717_0002
Revises: 20260717_0001
Create Date: 2026-07-17
"""

from alembic import op

revision = "20260717_0002"
down_revision = "20260717_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE procedure_cases "
        "SET name = 'Cha mẹ chưa đăng ký kết hôn' "
        "WHERE code = 'out_of_wedlock'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE procedure_cases "
        "SET name = 'Con ngoài giá thú' "
        "WHERE code = 'out_of_wedlock'"
    )
