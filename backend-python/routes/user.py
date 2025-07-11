from flask import Blueprint, request, jsonify
import logging
from urllib.parse import unquote
from db.connection import query, get_pool
from contextlib import contextmanager

user_routes = Blueprint('user_routes', __name__)

# Database connection pool (should be initialized elsewhere)
db_pool = get_pool

def init_db_pool(pool):
    global db_pool
    db_pool = pool

@contextmanager
def get_db_connection():
    pool = get_pool()
    conn = None
    try:
        conn = pool.getconn()
        yield conn
    finally:
        if conn:
            pool.putconn(conn)

# Helper function to execute queries
def query(sql, params=None):
    with get_db_connection() as conn:
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params or [])
                if cur.description:  # If it's a SELECT query
                    columns = [desc[0] for desc in cur.description]
                    rows = cur.fetchall()
                    return {'rows': [dict(zip(columns, row)) for row in rows]}
                else:  # For INSERT, UPDATE, DELETE
                    conn.commit()
                    return {'rowCount': cur.rowcount}
        except Exception as e:
            conn.rollback()
            raise e

# ============================================
# 🔐 GET ROLE OF USER BY EMAIL
# ============================================
@user_routes.route('/role/<email>', methods=['GET'])
def get_user_role(email):
    email = unquote(email)
    
    try:
        result = query(
            "SELECT role FROM sms_platform.employees WHERE username = %s",
            [email]
        )

        if not result['rows']:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'role': result['rows'][0]['role']})
    except Exception as err:
        logging.error('Error fetching role: %s', str(err))
        return jsonify({'error': 'Internal server error'}), 500

# Example: Get user info (optional)
@user_routes.route('/<email>', methods=['GET'])
def get_user_info(email):
    email = unquote(email)

    try:
        result = query(
            """SELECT u.id, u.email, e.role
               FROM sms_platform.users u
               JOIN sms_platform.employees e ON u.id = e.user_id
               WHERE u.email = %s""",
            [email]
        )

        if not result['rows']:
            return jsonify({'error': 'User not found'}), 404

        return jsonify(result['rows'][0])
    except Exception as err:
        logging.error('Error fetching user info: %s', str(err))
        return jsonify({'error': 'Internal server error'}), 500

# ✅ GET ALL USERS WITH role = 2
@user_routes.route('/role/2/all', methods=['GET'])
def get_role_2_users():
    try:
        result = query(
            "SELECT user_id, username AS email FROM sms_platform.employees WHERE role = 2"
        )
        return jsonify(result['rows'])
    except Exception as err:
        logging.error('Error fetching users with role 2: %s', str(err))
        return jsonify({'error': 'Internal server error'}), 500

# ============================================
# 🗑️ DELETE USER (ADMIN ONLY)
# ============================================
@user_routes.route('/<email>', methods=['DELETE'])
def delete_user(email):
    user_email = unquote(email)
    admin_email = request.json.get('adminEmail')

    if not admin_email:
        return jsonify({'error': 'Admin email is required'}), 400

    # Prevent self-deletion
    if user_email == admin_email:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    try:
        # Check if user exists
        user_check = query(
            "SELECT user_id FROM sms_platform.employees WHERE username = %s",
            [user_email]
        )

        if not user_check['rows']:
            return jsonify({'error': 'User not found'}), 404

        user_id = user_check['rows'][0]['user_id']

        # Begin transaction
        query('BEGIN')

        try:
            # Get all campaign IDs for this user first
            campaigns = query(
                "SELECT id FROM sms_platform.campaigns WHERE user_id = %s",
                [user_id]
            )

            # Delete messages for each campaign
            for campaign in campaigns['rows']:
                query(
                    "DELETE FROM sms_platform.messages WHERE campaign_id = %s",
                    [campaign['id']]
                )

            # Now delete campaigns
            query(
                "DELETE FROM sms_platform.campaigns WHERE user_id = %s",
                [user_id]
            )

            # Delete Twilio numbers
            query(
                "DELETE FROM sms_platform.twilio_numbers WHERE user_id = %s",
                [user_id]
            )

            # Delete from employees table
            query(
                "DELETE FROM sms_platform.employees WHERE user_id = %s",
                [user_id]
            )

            query('COMMIT')
            return jsonify({
                'success': True,
                'message': 'User and all related data deleted successfully',
                'deletedUser': user_email
            })
            
        except Exception as err:
            query('ROLLBACK')
            logging.error('Transaction error: %s', {
                'message': str(err),
                'detail': getattr(err, 'detail', None),
                'constraint': getattr(err, 'constraint', None)
            })
            return jsonify({
                'error': 'Database operation failed',
                'details': getattr(err, 'detail', str(err))
            }), 500

    except Exception as err:
        logging.error('Error in DELETE /user: %s', str(err))
        return jsonify({
            'error': 'Server error while processing deletion',
            'details': str(err)
        }), 500