import os
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# Database connection pool
db_pool = None

try:
    # Create connection pool
    db_pool = psycopg2.pool.SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=os.getenv('DATABASE_URL'),
        sslmode='require',
        sslrootcert='',
        sslcert='',
        sslkey=''
    )

    # Test the connection immediately
    conn = db_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        print('✅ Database connected')
    except Exception as e:
        print(f'❌ Database connection failed: {str(e)}')
        sys.exit(1)  # Stop the server if DB fails
    finally:
        db_pool.putconn(conn)

except Exception as e:
    print(f'❌ Failed to create database pool: {str(e)}')
    sys.exit(1)

# Export the pool
__all__ = ['db_pool']