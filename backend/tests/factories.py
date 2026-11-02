"""Tiny row factories. Each helper commits and returns the persisted object."""

import itertools
from datetime import datetime, timedelta

from comments.models import Comment
from companies.models import Company
from documents.models import Document
from events.models import Event
from insurrances.models import Insurrance, InsurrenceType
from refuels.models import Refuel
from reservations.models import Reservation
from users.models import User, UserRole
from users.utils import hash_password
from vehicles.models import GearboxType, TireType, Vehicle, VehicleAvailability

PASSWORD = "Passw0rd!x"
# bcrypt is deliberately slow; hash once and share the result between all fixture users
_PASSWORD_HASH = hash_password(PASSWORD)
_counter = itertools.count(1)


def _save(session, obj):
    session.add(obj)
    session.commit()
    session.refresh(obj)
    return obj


def make_company(session, **kwargs) -> Company:
    n = next(_counter)
    data = dict(
        name=f"Company {n}",
        description="",
        phone="",
        post_code="00-001",
        address1="Main St 1",
        address2="",
        city="Warsaw",
        country="Poland",
        nip=f"{n:010d}",
        is_internal=True,
    )
    return _save(session, Company(**{**data, **kwargs}))


def make_user(session, role: UserRole = UserRole.WORKER, company: Company | None = None, **kwargs) -> User:
    n = next(_counter)
    data = dict(email=f"user{n}@example.com", name=f"User {n}", role=role, company_id=company.id if company else None, password=_PASSWORD_HASH)
    return _save(session, User(**{**data, **kwargs}))


def make_vehicle(session, company: Company, **kwargs) -> Vehicle:
    n = next(_counter)
    data = dict(
        id_number=f"ID{n}",
        vin=f"VIN{n:014d}",
        weight=2000.0,
        registration_number=f"REG-{n:03d}",
        brand="Ford",
        model="Transit",
        production_year=2020,
        kilometrage=10000,
        gearbox_type=GearboxType.MANUAL,
        availability=VehicleAvailability.AVAILABLE,
        tire_type=TireType.SUMMER,
        company_id=company.id,
    )
    return _save(session, Vehicle(**{**data, **kwargs}))


def make_document(session, vehicle: Vehicle, user: User, **kwargs) -> Document:
    n = next(_counter)
    data = dict(title=f"Document {n}", description="", file_type="other", vehicle_id=vehicle.id, user_id=user.id)
    return _save(session, Document(**{**data, **kwargs}))


def make_refuel(session, vehicle: Vehicle, user: User, document: Document, **kwargs) -> Refuel:
    data = dict(
        date=datetime.now(),
        fuel_amount=40.0,
        price=250.0,
        kilometrage_during_refuel=12000,
        gas_station="Orlen",
        vehicle_id=vehicle.id,
        document_id=document.id,
        user_id=user.id,
    )
    return _save(session, Refuel(**{**data, **kwargs}))


def make_event(session, vehicle: Vehicle, document: Document, company: Company, **kwargs) -> Event:
    data = dict(event_type="maintenance", date=datetime.now(), description="Oil change", price=100.0, vehicle_id=vehicle.id, document_id=document.id, company_id=company.id)
    return _save(session, Event(**{**data, **kwargs}))


def make_insurrance(session, vehicle: Vehicle, document: Document, company: Company, **kwargs) -> Insurrance:
    n = next(_counter)
    data = dict(
        insurer="PZU",
        policy_number=f"POL-{n}",
        date_from=datetime.now() - timedelta(days=100),
        date_to=datetime.now() + timedelta(days=265),
        description="Full cover",
        price=1200.0,
        insurrance_type=InsurrenceType.OCAC,
        vehicle_id=vehicle.id,
        document_id=document.id,
        company_id=company.id,
    )
    return _save(session, Insurrance(**{**data, **kwargs}))


def make_comment(session, vehicle: Vehicle, user: User, **kwargs) -> Comment:
    data = dict(content="Looks fine", vehicle_id=vehicle.id, user_id=user.id)
    return _save(session, Comment(**{**data, **kwargs}))


def make_reservation(session, vehicle: Vehicle, user: User, **kwargs) -> Reservation:
    start = datetime.now() + timedelta(days=5)
    data = dict(date_from=start, date_to=start + timedelta(days=2), vehicle_id=vehicle.id, user_id=user.id)
    return _save(session, Reservation(**{**data, **kwargs}))
