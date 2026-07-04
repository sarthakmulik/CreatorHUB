import sys
from sqlalchemy import create_engine
from sqlalchemy.schema import CreateTable
from app.models.models import Base

def dump_schema():
    engine = create_engine("postgresql://postgres:postgres@localhost/postgres")
    
    # We use a mock engine to just compile the DDL for the tables
    with open("schema.sql", "w") as f:
        for table in Base.metadata.sorted_tables:
            f.write(str(CreateTable(table).compile(engine)).strip() + ";\n\n")

if __name__ == "__main__":
    dump_schema()
    print("Schema dumped to schema.sql")
