import os
from typing import Optional

from commons import get_filters, get_from_qs_or_404, validate_obj_reference
from dependencies import LoginReqDep, SessionDep
from fastapi import APIRouter, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from fastapi_pagination import Page
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy.sql import Select
from users.models import User
from vehicles.models import Vehicle

from .models import Document, DocumentCreate, DocumentCreateWithFile, DocumentRead, DocumentUpdate
from .utils import DocumentFileManager, FileStorageError

router = APIRouter(prefix="/documents", tags=["documents"])
document_file_manager = DocumentFileManager()


def get_queryset(request_user: User) -> Select[Document]:
    return Document.for_user(request_user)


@router.get("/")
async def list_documents(
    session: SessionDep,
    request_user: LoginReqDep,
    search: str = Query(None, description="Search by document title, description, vehicle plates, or user name"),
    document_type: str = Query(None, description="Filter by document type"),
) -> Page[DocumentRead]:
    filters = get_filters({})
    qs = get_queryset(request_user).filter_by(**filters)
    qs = Document.with_search(qs, search)
    qs = Document.with_type(qs, document_type)

    return paginate(session, qs)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_document(
    session: SessionDep,
    request_user: LoginReqDep,
    response: Response,
    title: str = Form(...),
    description: str = Form(default=""),
    file_type: str = Form(...),
    vehicle_id: int = Form(...),
    user_id: int = Form(...),
    file: Optional[UploadFile] = File(None),
) -> DocumentRead:
    file_content = None
    original_filename = None
    if file and file.filename:
        file_content = await file.read()
        original_filename = file.filename

    document_form = DocumentCreateWithFile(
        title=title, description=description, file_type=file_type, vehicle_id=vehicle_id, user_id=user_id, file=file_content, filename=original_filename
    )

    validate_obj_reference(session, document_form, Vehicle, document_form.vehicle_id)
    validate_obj_reference(session, document_form, User, document_form.user_id)

    file_path, file_size = None, None
    if file and file.filename:
        try:
            file_path, file_size = await document_file_manager.store_file(file)
        except FileStorageError as e:
            raise HTTPException(status_code=400, detail=str(e))

    document_data = DocumentCreate(
        title=document_form.title, description=document_form.description, file_type=document_form.file_type, vehicle_id=document_form.vehicle_id, user_id=document_form.user_id
    )

    db_document = Document.model_validate(document_data)
    db_document.file_path = file_path
    db_document.file_size = file_size

    session.add(db_document)
    session.commit()
    session.refresh(db_document)

    response.status_code = status.HTTP_201_CREATED
    return db_document


@router.get("/{document_id}/")
async def retrive_document(
    session: SessionDep,
    request_user: LoginReqDep,
    document_id: int,
) -> DocumentRead:
    qs = get_queryset(request_user)
    return get_from_qs_or_404(session, qs, document_id)


@router.put("/{document_id}/")
async def update_document(
    session: SessionDep,
    request_user: LoginReqDep,
    document_id: int,
    title: str = Form(None),
    description: str = Form(None),
    file_type: str = Form(None),
    vehicle_id: int = Form(None),
    user_id: int = Form(None),
    file: Optional[UploadFile] = File(None),
) -> DocumentRead:
    qs = get_queryset(request_user)
    db_document = get_from_qs_or_404(session, qs, document_id)

    if vehicle_id:
        validate_obj_reference(session, {"vehicle_id": vehicle_id}, Vehicle, vehicle_id)
    if user_id:
        validate_obj_reference(session, {"user_id": user_id}, User, user_id)

    if file and file.filename:
        if db_document.file_path and document_file_manager.file_exists(db_document.file_path):
            document_file_manager.delete_file(db_document.file_path)

        try:
            file_path, file_size = await document_file_manager.store_file(file)
            db_document.file_path = file_path
            db_document.file_size = file_size
        except FileStorageError as e:
            raise HTTPException(status_code=400, detail=str(e))

    if title is not None:
        db_document.title = title
    if description is not None:
        db_document.description = description
    if file_type is not None:
        db_document.file_type = file_type
    if vehicle_id is not None:
        db_document.vehicle_id = vehicle_id
    if user_id is not None:
        db_document.user_id = user_id

    session.commit()
    session.refresh(db_document)
    return db_document


@router.delete("/{document_id}/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    session: SessionDep,
    request_user: LoginReqDep,
    document_id: int,
    response: Response,
) -> None:
    qs = get_queryset(request_user)
    db_document = get_from_qs_or_404(session, qs, document_id)

    if db_document.file_path:
        document_file_manager.delete_file(db_document.file_path)

    session.delete(db_document)
    session.commit()
    response.status_code = status.HTTP_204_NO_CONTENT


@router.get("/{document_id}/download")
async def download_document_file(
    session: SessionDep,
    request_user: LoginReqDep,
    document_id: int,
) -> FileResponse:
    qs = get_queryset(request_user)
    db_document = get_from_qs_or_404(session, qs, document_id)

    if not db_document.file_path or not document_file_manager.file_exists(db_document.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    file_extension = os.path.splitext(db_document.file_path)[1]
    filename = f"{db_document.title}{file_extension}"

    return FileResponse(path=db_document.file_path, filename=filename, media_type="application/octet-stream")
