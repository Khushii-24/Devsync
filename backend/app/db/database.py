from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings

# engine = the actual connection pool to PostgreSQL
engine = create_engine(settings.DATABASE_URL)

# SessionLocal is a factory — calling SessionLocal() gives a new, isolated DB session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the parent class every model inherits from.
# SQLAlchemy uses Base.metadata to know what tables exist — Alembic reads this too.
class Base(DeclarativeBase):
    pass

# FastAPI dependency: yields a session, guarantees it closes even if the request errors
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()