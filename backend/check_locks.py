from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT pid, mode, granted, relname FROM pg_locks l JOIN pg_class t ON l.relation = t.oid WHERE relname = 'connected_accounts'"))
    print(res.fetchall())
