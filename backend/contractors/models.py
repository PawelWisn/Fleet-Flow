from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from companies.models import Company, CompanyNestedRead
    from events.models import Event, EventNestedRead
    from insurrances.models import Insurrance, InsurranceNestedRead
    from refuels.models import Refuel, RefuelNestedRead
    from users.models import User


class ContractorBase(SQLModel):
    name: str = Field(max_length=128)
    description: str = Field(max_length=256)
    phone: str = Field(max_length=12)
    post_code: str = Field(max_length=8)
    address1: str = Field(max_length=128)
    address2: str = Field(max_length=128)
    city: str = Field(max_length=128)
    country: str = Field(max_length=128)
    nip: str = Field(max_length=10)
    company_id: int = Field(foreign_key="companies.id", ondelete="CASCADE")


class Contractor(ContractorBase, table=True):
    __tablename__ = "contractors"
    id: int | None = Field(primary_key=True, default=None)
    company: "Company" = Relationship(back_populates="contractors")
    refuels: list["Refuel"] = Relationship(back_populates="contractor", cascade_delete=True)
    events: list["Event"] = Relationship(back_populates="contractor", cascade_delete=True)
    insurrances: list["Insurrance"] = Relationship(back_populates="contractor", cascade_delete=True)

    @classmethod
    def for_user(cls, user: "User") -> Select["Contractor"]:
        return select(cls)


class ContractorRead(ContractorBase):
    id: int
    company: "CompanyNestedRead"
    refuels: list["RefuelNestedRead"]
    events: list["EventNestedRead"]
    insurrances: list["InsurranceNestedRead"]


class ContractorNestedRead(ContractorBase):
    id: int


class ContractorCreate(ContractorBase):
    pass
