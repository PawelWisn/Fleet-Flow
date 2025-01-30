from datetime import datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Column
from sqlmodel import Enum as EnumSQL
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from contractors.models import Contractor, ContractorNestedRead
    from documents.models import Document, DocumentNestedRead
    from users.models import User
    from vehicles.models import Vehicle, VehicleNestedRead


class InsurrenceType(str, Enum):
    OC = "OC"
    AC = "AC"
    OCAC = "OC/AC"


class InsurranceBase(SQLModel):
    insurer: str = Field(max_length=128)
    policy_number: str = Field(max_length=64)
    date_from: datetime
    date_to: datetime
    description: str = Field(max_length=1024)
    price: float
    insurrance_type: InsurrenceType = Field(sa_column=Column(EnumSQL(InsurrenceType)))
    vehicle_id: int = Field(foreign_key="vehicles.id", ondelete="CASCADE")
    document_id: int = Field(foreign_key="documents.id", ondelete="CASCADE")
    contractor_id: int = Field(foreign_key="contractors.id", ondelete="CASCADE")


class Insurrance(InsurranceBase, table=True):
    __tablename__ = "insurrances"
    id: int | None = Field(primary_key=True, default=None)
    vehicle: "Vehicle" = Relationship(back_populates="insurrances")
    document: "Document" = Relationship(back_populates="insurrances")
    contractor: "Contractor" = Relationship(back_populates="insurrances")

    @classmethod
    def for_user(cls, user: "User") -> Select["Insurrance"]:
        from vehicles.models import Vehicle

        if not user.is_admin:
            return select(cls).join(Vehicle).filter(Vehicle.company_id == user.company_id)
        return select(cls)

    @classmethod
    def finishing(cls, qs: Select["Insurrance"], delta: timedelta = timedelta(days=31)) -> Select["Insurrance"]:
        start = datetime.now()
        end = start + delta
        return qs.filter(cls.date_to > start, cls.date_to <= end).order_by(cls.date_to)


class InsurranceRead(InsurranceBase):
    id: int
    vehicle: "VehicleNestedRead"
    document: "DocumentNestedRead"
    contractor: "ContractorNestedRead | None"


class InsurranceNestedRead(InsurranceBase):
    id: int


class InsurranceCreate(InsurranceBase):
    pass
