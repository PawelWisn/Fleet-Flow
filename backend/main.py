import logging
from contextlib import asynccontextmanager

from comments.views import router as comments_router
from commons import rebuild_models
from companies.views import router as companies_router
from contractors.views import router as contractors_router
from database import create_db_and_tables, run_migrations
from documents.views import router as documents_router
from entrypoint import entrypoint
from events.views import router as events_router
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi_pagination import add_pagination
from insurrances.views import router as insurrances_router
from refuels.views import router as refuels_router
from reservations.views import router as reservations_router
from users.views import router as user_router
from vehicles.views import router as vehicles_router

logger = logging.getLogger("uvicorn.critical")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    run_migrations()
    entrypoint()
    yield


app = FastAPI(
    lifespan=lifespan,
    title="FleetFlow",
    description="App for managing vehicles on a large scale",
    version="0.0.1",
    responses={401: {"description": "Please login to the system"}},
)

add_pagination(app)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:7050"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/", status_code=status.HTTP_301_MOVED_PERMANENTLY)
async def redirect_to_documentation() -> RedirectResponse:
    return RedirectResponse(url=app.docs_url)


# Please maintain alphabetic order
app.include_router(comments_router)
app.include_router(companies_router)
app.include_router(contractors_router)
app.include_router(documents_router)
app.include_router(events_router)
app.include_router(insurrances_router)
app.include_router(refuels_router)
app.include_router(reservations_router)
app.include_router(user_router)
app.include_router(vehicles_router)

rebuild_models()
