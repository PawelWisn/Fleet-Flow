from commons import Page, get_filters, get_from_qs_or_404, raise_perm_error, validate_company_reference, validate_obj_reference
from companies.models import Company
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, Query, Response, status
from fastapi_pagination.ext.sqlalchemy import paginate
from permissions import require_role
from sqlalchemy.sql import Select
from users.models import User, UserRole
from vehicles.models import Vehicle, VehicleCreate, VehicleRead
from vehicles.utils import VehicleFuelUsageReportGenerator

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def get_queryset(request_user: User) -> Select[Vehicle]:
    return Vehicle.for_user(request_user)


@router.get("/")
async def list_vehicles(
    session: SessionDep,
    request_user: LoginReqDep,
    company_id: int = Query(None),
    search: str = Query(None, description="Search by model or registration number"),
    status: str = Query(None, description="Filter by vehicle availability status"),
) -> Page[VehicleRead]:
    filters = get_filters({"company_id": company_id})
    qs = get_queryset(request_user).filter_by(**filters)
    qs = Vehicle.with_search(qs, search)
    qs = Vehicle.with_status(qs, status)

    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle: VehicleCreate,
    response: Response,
) -> VehicleRead:
    validate_obj_reference(session, vehicle, Company, vehicle.company_id)
    validate_company_reference(session, vehicle, request_user)

    db_vehicle = Vehicle.model_validate(vehicle)
    session.add(db_vehicle)
    session.commit()
    session.refresh(db_vehicle)
    response.status_code = status.HTTP_201_CREATED
    return db_vehicle


@router.get("/{vehicle_id}/")
async def retrive_vehicle(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int,
) -> VehicleRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, vehicle_id)


@router.get("/{vehicle_id}/reports/fuel/")
@require_role([UserRole.ADMIN, UserRole.MANAGER])
async def generate_vehicle_fuel_report(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int,
) -> Response:
    if request_user.is_worker:
        raise_perm_error()
    qs = get_queryset(request_user)
    vehicle = get_from_qs_or_404(session, qs, vehicle_id)
    generator = VehicleFuelUsageReportGenerator(vehicle)
    headers = {"Content-Disposition": f'inline; filename="vehicle_{vehicle.registration_number}_report.pdf"'}
    return Response(content=generator.report(), media_type="application/pdf", headers=headers)


@router.put("/{vehicle_id}/")
async def update_vehicle(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int,
    vehicle: VehicleCreate,
) -> VehicleRead:
    validate_obj_reference(session, vehicle, Company, vehicle.company_id)
    validate_company_reference(session, vehicle, request_user)

    qs = get_queryset(request_user)
    db_vehicle = get_from_qs_or_404(session, qs, vehicle_id)
    db_vehicle.sqlmodel_update(vehicle)
    session.commit()
    session.refresh(db_vehicle)
    return db_vehicle


@router.delete("/{vehicle_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    session: SessionDep,
    request_user: LoginReqDep,
    vehicle_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_vehicle = get_from_qs_or_404(session, qs, vehicle_id)
    session.delete(db_vehicle)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT
