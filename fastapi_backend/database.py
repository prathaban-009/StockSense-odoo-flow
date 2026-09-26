import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Standard PostgreSQL connection or Cloud SQL unix domain socket
DB_USER = os.getenv("SQL_USER", "postgres")
DB_PASS = os.getenv("SQL_PASSWORD", "")
DB_NAME = os.getenv("SQL_DB_NAME", "postgres")
DB_HOST = os.getenv("SQL_HOST", "localhost")
DB_PORT = os.getenv("SQL_PORT", "5432")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
