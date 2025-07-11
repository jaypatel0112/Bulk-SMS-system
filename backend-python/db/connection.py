import os
from dotenv import load_dotenv
import psycopg2
from psycopg2 import pool
import logging

# Load environment variables
load_dotenv()
import urllib.parse
db_url = urllib.parse.unquote(os.getenv('DATABASE_URL'))
pool_config = {
    'dsn': db_url,
    'sslmode': 'require'  # Equivalent to ssl: { rejectUnauthorized: False } for Supabase
}

connection_pool = None

def get_pool():
    global connection_pool
    if not connection_pool:
        try:
            connection_pool = pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                host=os.environ.get('DB_HOST', 'localhost'),
                database=os.environ.get('DB_NAME', 'pittgabi'),
                user=os.environ.get('DB_USER', 'pgapp'),
                password=os.environ.get('DB_PASSWORD', 'PittGabi@2024'),
                port=int(os.environ.get('DB_PORT', 5432)),
                sslmode=os.environ.get('DB_SSLMODE', 'disable')
            )
            print('✅ Database pool created')
        except Exception as err:
            print('❌ Failed to create database pool:', err)
            raise err
    return connection_pool

# Test connection helper
async def test_connection():
    test_pool = get_pool()
    try:
        with test_pool.getconn() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT NOW()')
                res = cur.fetchone()
                print('✅ Database connection successful at:', res[0])
                return True
    except Exception as err:
        print('❌ Database connection failed:', err)
        return False

def query(text, params=None):
    conn = None
    try:
        conn = get_pool().getconn()
        with conn.cursor() as cur:
            cur.execute(text, params)
            result = None

            if cur.description:  # SELECT or INSERT ... RETURNING
                result = cur.fetchall()

            conn.commit()  # ✅ Always commit after execute (even if SELECT does nothing harmful)

            return result
    except Exception as err:
        if conn:
            conn.rollback()
        logging.error('Query failed: %s', err)
        raise err
    finally:
        if conn:
            get_pool().putconn(conn)
            
# Export the functions
__all__ = ['get_pool', 'test_connection', 'query']