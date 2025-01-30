from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy.sql import Select
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from contractors.models import Contractor, ContractorNestedRead
    from users.models import User, UserNestedRead
    from vehicles.models import Vehicle, VehicleNestedRead


class CompanyBase(SQLModel):
    name: str = Field(max_length=128)
    post_code: str = Field(max_length=8)
    address1: str = Field(max_length=128)
    address2: str = Field(max_length=128)
    city: str = Field(max_length=128)
    country: str = Field(max_length=128)
    nip: str = Field(max_length=10)


class Company(CompanyBase, table=True):
    __tablename__ = "companies"
    id: int | None = Field(primary_key=True, default=None)
    vehicles: list["Vehicle"] = Relationship(back_populates="company", cascade_delete=True)
    contractors: list["Contractor"] = Relationship(back_populates="company", cascade_delete=True)
    users: list["User"] = Relationship(back_populates="company", cascade_delete=True)

    @classmethod
    def for_user(cls, user: "User") -> Select["Company"]:
        from users.models import User

        qs = select(cls)
        if not user.is_admin:
            qs = qs.filter(cls.users.any(User.id == user.id))
        return qs


class CompanyRead(CompanyBase):
    id: int
    vehicles: list["VehicleNestedRead"]
    contractors: list["ContractorNestedRead"]
    users: list["UserNestedRead"]


class CompanyNestedRead(CompanyBase):
    id: int


class CompanyCreate(CompanyBase):
    pass
