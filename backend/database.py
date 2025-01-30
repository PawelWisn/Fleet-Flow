import logging
import os
import subprocess

from sqlmodel import Session, SQLModel, create_engine

logger = logging.getLogger("uvicorn.critical")

DB_URL = os.getenv("DB_URL")
engine = create_engine(DB_URL)
logger.info("Database engine created")


def create_db_and_tables():
    logger.info(f"Database models creation started")
    SQLModel.metadata.create_all(engine)
    logger.info(f"Database models created")


def run_migrations():
    logger.info("Running migrations")
    subprocess.run(["alembic", "upgrade", "head"])
    logger.info("Migrations complete")


def get_session():
    with Session(engine) as session:
        logger.debug("Session opened")
        yield session
        logger.debug("Session closed")
