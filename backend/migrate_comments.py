from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE comments ADD COLUMN platform_comment_id VARCHAR(200) UNIQUE;"))
            conn.commit()
            print("Successfully added platform_comment_id")
        except Exception as e:
            print("Error or already exists:", e)

if __name__ == "__main__":
    migrate()
