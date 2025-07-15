"""migrate_contractors_to_companies

Revision ID: 7f73460b3b1f
Revises: 2b4f49ecf641
Create Date: 2025-07-15 18:37:24.658859

"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f73460b3b1f"
down_revision: Union[str, None] = "28fda6f2c2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("description", sa.String(length=256), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("phone", sa.String(length=12), nullable=False, server_default=""))
    op.add_column("companies", sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="true"))

    op.add_column("events", sa.Column("company_id", sa.Integer(), nullable=True))
    op.add_column("insurrances", sa.Column("company_id", sa.Integer(), nullable=True))
    op.add_column("refuels", sa.Column("company_id", sa.Integer(), nullable=True))

    op.execute(
        """
        INSERT INTO companies (name, post_code, address1, address2, city, country, nip, description, phone, is_internal)
        SELECT DISTINCT name, post_code, address1, address2, city, country, nip, '', '', false
        FROM contractors
        WHERE name NOT IN (SELECT name FROM companies)
    """
    )

    op.execute(
        """
        UPDATE events
        SET company_id = companies.id
        FROM contractors, companies
        WHERE events.contractor_id = contractors.id
        AND contractors.name = companies.name
    """
    )

    op.execute(
        """
        UPDATE insurrances
        SET company_id = companies.id
        FROM contractors, companies
        WHERE insurrances.contractor_id = contractors.id
        AND contractors.name = companies.name
    """
    )

    op.execute(
        """
        UPDATE refuels
        SET company_id = companies.id
        FROM contractors, companies
        WHERE refuels.contractor_id = contractors.id
        AND contractors.name = companies.name
    """
    )

    op.alter_column("events", "company_id", nullable=False)
    op.alter_column("insurrances", "company_id", nullable=False)
    op.alter_column("refuels", "company_id", nullable=False)

    op.create_foreign_key("events_company_id_fkey", "events", "companies", ["company_id"], ["id"])
    op.create_foreign_key("insurrances_company_id_fkey", "insurrances", "companies", ["company_id"], ["id"])
    op.create_foreign_key("refuels_company_id_fkey", "refuels", "companies", ["company_id"], ["id"])

    op.drop_constraint("events_contractor_id_fkey", "events", type_="foreignkey")
    op.drop_constraint("insurrances_contractor_id_fkey", "insurrances", type_="foreignkey")
    op.drop_constraint("refuels_contractor_id_fkey", "refuels", type_="foreignkey")

    op.drop_column("events", "contractor_id")
    op.drop_column("insurrances", "contractor_id")
    op.drop_column("refuels", "contractor_id")

    op.drop_table("contractors")


def downgrade() -> None:
    op.create_table(
        "contractors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("post_code", sa.String(length=8), nullable=False),
        sa.Column("address1", sa.String(length=128), nullable=False),
        sa.Column("address2", sa.String(length=128), nullable=False),
        sa.Column("city", sa.String(length=128), nullable=False),
        sa.Column("country", sa.String(length=128), nullable=False),
        sa.Column("nip", sa.String(length=10), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("events", sa.Column("contractor_id", sa.Integer(), nullable=True))
    op.add_column("insurrances", sa.Column("contractor_id", sa.Integer(), nullable=True))
    op.add_column("refuels", sa.Column("contractor_id", sa.Integer(), nullable=True))

    raise NotImplementedError("This migration cannot be automatically reversed due to data consolidation")
