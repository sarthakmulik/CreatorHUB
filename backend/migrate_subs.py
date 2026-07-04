import os
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

load_dotenv()
db_url = os.environ.get('DATABASE_URL')
engine = sqlalchemy.create_engine(db_url)

with engine.connect() as conn:
    conn.execution_options(isolation_level='AUTOCOMMIT')
    
    try:
        conn.execute(text("CREATE TYPE subscriptiontier AS ENUM ('free', 'pro', 'elite')"))
        print('Enum created')
        conn.commit()
    except Exception as e:
        print('Enum probably exists:', str(e)[:100])
        conn.rollback()
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_tier subscriptiontier NOT NULL DEFAULT 'free'"))
        print('Column subscription_tier added')
        conn.commit()
    except Exception as e:
        print('Column subscription_tier error:', str(e)[:100])
        conn.rollback()
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN razorpay_customer_id VARCHAR(200)"))
        print('Column razorpay_customer_id added')
        conn.commit()
    except Exception as e:
        print('Column razorpay_customer_id error:', str(e)[:100])
        conn.rollback()
        
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN razorpay_subscription_id VARCHAR(200)"))
        print('Column razorpay_subscription_id added')
        conn.commit()
    except Exception as e:
        print('Column razorpay_subscription_id error:', str(e)[:100])
        conn.rollback()

print('Done!')
