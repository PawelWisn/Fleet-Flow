"""remove_company_id_from_refuels

Revision ID: 04b3ce1830c9
Revises: 7f73460b3b1f
Create Date: 2025-07-15 18:57:20.546034

"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "04b3ce1830c9"
down_revision: Union[str, None] = "7f73460b3b1f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("refuels_company_id_fkey", "refuels", type_="foreignkey")
    op.drop_column("refuels", "company_id")


def downgrade() -> None:
    op.add_column("refuels", sa.Column("company_id", sa.Integer(), nullable=False))
    op.create_foreign_key("refuels_company_id_fkey", "refuels", "companies", ["company_id"], ["id"])
