from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")).fetchall()
    print("Tables:")
    for r in res:
        print(r[0])
        
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'repurposed_videos';")).fetchall()
    print("\nColumns in repurposed_videos:")
    for r in res:
        print(f"{r[0]} ({r[1]})")
