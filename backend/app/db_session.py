import os
from contextlib import contextmanager
from threading import Lock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
from app.config import DATA_DIR
from app.models import (
    Base, UserDB, TeamDB, AnnouncementDB, 
    NotificationDB, FAQEscalationDB, KnowledgeItemDB, TimerStateDB
)

_db_lock = Lock()
_current_engine = None
_session_factory = None

DB_PATH = os.path.join(DATA_DIR, "hackathon.db")
SQLITE_URL = f"sqlite:///{DB_PATH}"

def init_db():
    global _current_engine, _session_factory
    with _db_lock:
        os.makedirs(DATA_DIR, exist_ok=True)
        engine_args = {
            "connect_args": {"check_same_thread": False},
            "pool_pre_ping": True
        }
        _current_engine = create_engine(SQLITE_URL, **engine_args)

        # Ensure SQLite foreign keys are enabled
        with _current_engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=ON"))

        # Create all tables if they do not exist
        Base.metadata.create_all(bind=_current_engine)
        _session_factory = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=_current_engine))
        print(f"[Database] SQLite Engine initialized successfully at {DB_PATH}")

def get_engine():
    global _current_engine
    if _current_engine is None:
        init_db()
    return _current_engine

def get_session():
    global _session_factory
    if _session_factory is None:
        init_db()
    return _session_factory()

@contextmanager
def db_session_scope():
    """Provide a transactional scope around a series of operations."""
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_db_status():
    """Returns telemetry and table statistics for the SQLite database."""
    file_size_kb = 0
    if os.path.exists(DB_PATH):
        file_size_kb = round(os.path.getsize(DB_PATH) / 1024, 2)

    status = {
        "dialect": "SQLite 3",
        "databaseFile": "hackathon.db",
        "fullPath": DB_PATH,
        "sizeKB": file_size_kb,
        "connected": True,
        "storageType": "Server Local Relational File Storage"
    }

    try:
        with db_session_scope() as session:
            status["counts"] = {
                "users": session.query(UserDB).count(),
                "teams": session.query(TeamDB).count(),
                "escalations": session.query(FAQEscalationDB).count(),
                "announcements": session.query(AnnouncementDB).count(),
                "knowledgeItems": session.query(KnowledgeItemDB).count(),
                "notifications": session.query(NotificationDB).count(),
            }
    except Exception as e:
        status["counts"] = {"users": 0, "teams": 0, "escalations": 0, "announcements": 0, "knowledgeItems": 0, "notifications": 0}
        status["counts_error"] = str(e)

    return status

# Initialize SQLite database immediately
init_db()
