from flask import Blueprint, request, jsonify
import logging
from db.connection import query
from contextlib import contextmanager

auth_routes = Blueprint('auth_routes', __name__)

# ============================================
# 👤 SIGNUP ROUTE FOR EMPLOYEE
# ============================================
@auth_routes.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')

    if not all([username, password, role]):
        return jsonify({'message': 'Missing required fields'}), 400

    try:
        # Verify connection by running a test query
        query('SELECT 1 FROM sms_platform.employees LIMIT 1')
        
        # Check for existing user
        check_user = query(
            "SELECT 1 FROM sms_platform.employees WHERE username = %s LIMIT 1",
            [username]
        )

        if check_user:  # Not empty means user exists
            return jsonify({'message': 'Username already exists'}), 400

        user_id = None
        
        # If the role is 'user' (role = 2), assign a user_id
        if role == 2:
            user_id_result = query(
                "SELECT COALESCE(MAX(user_id), 0) + 1 AS next_user_id FROM sms_platform.employees WHERE role = 2"
            )
            user_id = user_id_result[0][0]  # If tuple, else [0]['next_user_id']

        # Insert new user with or without user_id
        result = query(
            """INSERT INTO sms_platform.employees (user_id, username, password, role) 
               VALUES (%s, %s, %s, %s) 
               RETURNING id, user_id, username, role""",
            [user_id, username, password, role]
        )

        return jsonify({
            'message': 'User created successfully',
            'user': {
                'id': result[0][0],
                'user_id': result[0][1],
                'username': result[0][2],
                'role': result[0][3]
            }
        }), 201

    except Exception as error:
        logging.error('Full error object: %s', str(error))
        return jsonify({
            'message': 'Database operation failed',
            'error': {
                'code': getattr(error, 'code', None),
                'message': str(error),
                'detail': getattr(error, 'detail', None)
            }
        }), 500


# ============================================
# 🔑 LOGIN ROUTE
# ============================================
@auth_routes.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        return jsonify({'message': 'Missing username or password'}), 400

    try:
        # Get raw query results
        results = query(
            'SELECT id, user_id, username, password, role FROM sms_platform.employees WHERE username = %s',
            [username]
        )
        
        if not results:  # Empty list means no user found
            return jsonify({'message': 'User not found'}), 400

        # Access tuple elements by position
        user = {
            'id': results[0][0],
            'user_id': results[0][1],
            'username': results[0][2],
            'password': results[0][3],
            'role': results[0][4]
        }

        if user['password'] != password:
            return jsonify({'message': 'Invalid credentials'}), 400

        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'user_id': user['user_id'],
                'username': user['username'],
                'role': user['role']
            }
        })

    except Exception as error:
        logging.error('Error during login: %s', str(error))
        return jsonify({'message': 'Server error'}), 500
    