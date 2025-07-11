from flask import Blueprint, request, jsonify
import logging
from datetime import datetime
from psycopg2 import pool
from db.connection import query, get_pool

twilionumber_routes = Blueprint('twilionumber_routes', __name__)

# Database connection pool (should be initialized elsewhere)
db_pool = get_pool

def init_db_pool(pool):
    global db_pool
    db_pool = pool

def query(sql, params=None):
    conn = None
    try:
        conn = db_pool.getconn()
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            if cur.description:  # SELECT query
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                return {'rows': [dict(zip(columns, row)) for row in rows]}
            else:  # INSERT, UPDATE, DELETE
                conn.commit()
                return {'rowCount': cur.rowcount}
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            db_pool.putconn(conn)

# ✅ Assign a Twilio number to a user
@twilionumber_routes.route('/', methods=['POST'])
def assign_number():
    data = request.get_json()
    phone_number = data.get('phone_number')
    user_id = data.get('user_id')

    if not phone_number or not user_id:
        return jsonify({'error': 'phone_number and user_id are required'}), 400

    conn = None
    try:
        conn = db_pool.getconn()
        with conn.cursor() as cur:

            # Check if employee exists
            cur.execute("SELECT username FROM sms_platform.employees WHERE user_id = %s", (user_id,))
            employee = cur.fetchone()
            if not employee:
                return jsonify({'error': 'Employee not found. Please create the employee first.'}), 400
            username = employee[0]

            # Check for duplicate assignment
            cur.execute("SELECT 1 FROM sms_platform.twilio_numbers WHERE phone_number = %s AND username = %s", (phone_number, username))
            if cur.fetchone():
                return jsonify({
                    'error': f'You are trying to assign the same Twilio number ({phone_number}) to the same employee ({username}) again.'
                }), 400

            logging.info("Inserting the phone number into twilio_numbers table")

            # Insert the number
            cur.execute(
                """INSERT INTO sms_platform.twilio_numbers (phone_number, username, user_id, created_at)
                   VALUES (%s, %s, %s, NOW()) RETURNING *""",
                (phone_number, username, user_id)
            )
            inserted_row = cur.fetchone()
            conn.commit()

        logging.info("Inserted the phone number into twilio_numbers table")
        # Map returned row to dict keys
        columns = [desc[0] for desc in cur.description]
        inserted_data = dict(zip(columns, inserted_row))

        return jsonify(inserted_data), 201

    except Exception as err:
        if conn:
            conn.rollback()
        logging.error(f"Error assigning Twilio number: {str(err)}")
        return jsonify({'error': 'Failed to assign number'}), 500

    finally:
        if conn:
            db_pool.putconn(conn)


# ✅ Get all Twilio numbers (not tied to a user)
@twilionumber_routes.route('/', methods=['GET'])
def get_all_numbers():
    try:
        result = query("SELECT phone_number, username FROM sms_platform.twilio_numbers")
        return jsonify(result['rows'])
    except Exception as err:
        logging.error(str(err))
        return jsonify({'error': 'Failed to fetch Twilio numbers'}), 500

# ✅ Get numbers assigned to a specific user by email
@twilionumber_routes.route('/user-numbers/<email>', methods=['GET'])
def get_user_numbers(email):
    try:
        employee_result = query(
            "SELECT user_id FROM sms_platform.employees WHERE username = %s",
            [email]
        )
        
        logging.info('Employee Result: %s', employee_result['rows'])  # Log the result for debugging
        
        if not employee_result['rows']:
            return jsonify({'numbers': []})

        user_id = employee_result['rows'][0]['user_id']

        numbers_result = query(
            "SELECT phone_number FROM sms_platform.twilio_numbers WHERE user_id = %s",
            [user_id]
        )

        return jsonify({
            'numbers': [row['phone_number'] for row in numbers_result['rows']]
        })
    except Exception as err:
        logging.error(str(err))
        return jsonify({'error': 'Failed to fetch user numbers'}), 500

@twilionumber_routes.route('/', methods=['DELETE'])
def delete_number():
    data = request.get_json()
    phone_number = data.get('phone_number')
    username = data.get('username')

    conn = None
    try:
        conn = db_pool.getconn()
        with conn.cursor() as cur:
            cur.execute(
                """DELETE FROM sms_platform.twilio_numbers 
                   WHERE phone_number = %s AND username = %s 
                   RETURNING *""",
                [phone_number, username]
            )
            deleted_rows = cur.fetchall()
            conn.commit()  # Explicit commit here

        logging.info(f"Deleted rows: {deleted_rows}")

        if not deleted_rows:
            return jsonify({'error': 'Number not found or already deleted.'}), 404

        return jsonify({'message': 'Twilio number deleted successfully.'}), 200
    except Exception as err:
        if conn:
            conn.rollback()
        logging.error(str(err))
        return jsonify({'error': 'Failed to delete number'}), 500
    finally:
        if conn:
            db_pool.putconn(conn)

   