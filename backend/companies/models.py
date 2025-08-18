from typing import TYPE_CHECKING

from database import SQLModel
from sqlalchemy import or_
from sqlalchemy.sql import Select
from sqlmodel import Field, Relationship, select

if TYPE_CHECKING:
    from events.models import Event, EventNestedRead
    from insurrances.models import Insurrance, InsurranceNestedRead
    from users.models import User, UserNestedRead
    from vehicles.models import Vehicle, VehicleNestedRead


class CompanyBase(SQLModel):
    name: str = Field(max_length=128)
    description: str = Field(max_length=256, default="")
    phone: str = Field(max_length=12, default="")
    post_code: str = Field(max_length=8)
    address1: str = Field(max_length=128)
    address2: str = Field(max_length=128)
    city: str = Field(max_length=128)
    country: str = Field(max_length=128)
    nip: str = Field(max_length=10)
    is_internal: bool = Field(default=True)


class Company(CompanyBase, table=True):
    __tablename__ = "companies"
    id: int | None = Field(primary_key=True, default=None)
    vehicles: list["Vehicle"] = Relationship(back_populates="company", cascade_delete=True)
    users: list["User"] = Relationship(back_populates="company", cascade_delete=True)
    events: list["Event"] = Relationship(back_populates="company", cascade_delete=True)
    insurrances: list["Insurrance"] = Relationship(back_populates="company", cascade_delete=True)

    @classmethod
    def for_user(cls, user: "User") -> Select["Company"]:
        from users.models import User

        qs = select(cls)
        if not user.is_admin:
            qs = qs.filter(cls.users.any(User.id == user.id))
        return qs

    @classmethod
    def with_search(cls, query: Select["Company"], search_term: str) -> Select["Company"]:
        if not search_term:
            return query

        search_pattern = f"%{search_term}%"
        return query.filter(or_(cls.name.ilike(search_pattern), cls.nip.ilike(search_pattern)))


class CompanyRead(CompanyBase):
    id: int
    vehicles: list["VehicleNestedRead"]
    users: list["UserNestedRead"]
    events: list["EventNestedRead"]
    insurrances: list["InsurranceNestedRead"]


class CompanyNestedRead(CompanyBase):
    id: int


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    phone: str | None = None
    post_code: str | None = None
    address1: str | None = None
    address2: str | None = None
    city: str | None = None
    country: str | None = None
    nip: str | None = None
    is_internal: bool | None = None


class CompanyCreate(CompanyBase):
    pass
