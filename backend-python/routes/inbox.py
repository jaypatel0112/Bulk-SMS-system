from flask import Blueprint, jsonify, request
from urllib.parse import unquote
import logging
from contextlib import contextmanager
from collections import defaultdict

# Blueprint
inbox_routes = Blueprint('inbox_routes', __name__)
logger = logging.getLogger(__name__)

# Database pool (set by init_db_pool)
db_pool = None

def init_db_pool(pool):
    global db_pool
    db_pool = pool

@contextmanager
def get_db_connection():
    conn = None
    try:
        conn = db_pool.getconn()
        yield conn
    finally:
        if conn:
            db_pool.putconn(conn)

def query(sql, params=None):
    conn = None
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                if cur.description:  # SELECT
                    columns = [desc[0] for desc in cur.description]
                    rows = cur.fetchall()
                    return {'rows': [dict(zip(columns, row)) for row in rows]}
                else:
                    conn.commit()
                    return {'rowCount': cur.rowcount}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Query failed: {e}", exc_info=True)
        raise

@inbox_routes.route('/inbox/<email>')
def get_inbox(email):
    email = unquote(email)
    try:
        # 1. Find user and their role
        employee_result = query(
            "SELECT user_id, role FROM sms_platform.employees WHERE username = %s",
            (email,)
        )
        if not employee_result['rows']:
            return jsonify({"message": "Employee not found"}), 404

        employee = employee_result['rows'][0]
        user_id, role = employee['user_id'], employee['role']

        # 2. Get all conversations (consider adding pagination here)
        base_query = """
            SELECT 
                c.id as conversation_id,
                c.contact_phone,
                c.twilio_number,
                c.status,
                c.last_message_at,
                c.has_unread,
                con.first_name as contact_first_name,
                con.last_name as contact_last_name,
                m.body as last_message_body,
                m.direction as last_message_direction,
                m.sent_at as last_message_time
            FROM sms_platform.conversations c
            LEFT JOIN sms_platform.contacts con ON c.contact_phone = con.phone_number
            LEFT JOIN LATERAL (
                SELECT body, direction, sent_at
                FROM sms_platform.messages
                WHERE conversation_id = c.id
                ORDER BY sent_at DESC
                LIMIT 1
            ) m ON true
        """
        query_params = []
        if role != 1:  # Not admin
            base_query += """
                JOIN sms_platform.twilio_numbers tn ON c.twilio_number = tn.phone_number
                WHERE tn.user_id = %s
            """
            query_params.append(user_id)
        base_query += " ORDER BY c.last_message_at DESC"

        conversations_result = query(base_query, tuple(query_params))
        conversations = conversations_result['rows']

        # 3. Batch fetch all messages for these conversations
        conversation_ids = [conv['conversation_id'] for conv in conversations]
        messages_by_conv = defaultdict(list)
        if conversation_ids:
            placeholders = ','.join(['%s'] * len(conversation_ids))
            messages_result = query(
                f"""SELECT id, body, direction, sent_at as timestamp, conversation_id
                    FROM sms_platform.messages
                    WHERE conversation_id IN ({placeholders})
                    ORDER BY sent_at ASC""",
                tuple(conversation_ids)
            )
            for msg in messages_result['rows']:
                messages_by_conv[msg['conversation_id']].append(msg)

        # 4. Build the response
        conversations_with_messages = []
        for conv in conversations:
            contact_display = (
                f"{conv['contact_first_name'] or ''} {conv['contact_last_name'] or ''}".strip()
                or conv['contact_phone']
            )
            conversations_with_messages.append({
                "id": conv['conversation_id'],
                "twilio_number": conv['twilio_number'],
                "contact_phone": conv['contact_phone'],
                "contact_first_name": conv['contact_first_name'],
                "contact_last_name": conv['contact_last_name'],
                "contact_display": contact_display,
                "status": conv['status'],
                "last_message_at": conv['last_message_time'],
                "has_unread": conv['has_unread'],
                "messages": messages_by_conv.get(conv['conversation_id'], [])
            })

        return jsonify(conversations_with_messages)

    except Exception as err:
        logger.error(f"Error fetching inbox: {str(err)}", exc_info=True)
        return jsonify({"message": "Server error"}), 500

# Optional: For quick DB health check
@inbox_routes.route('/testdb')
def test_db():
    try:
        result = query("SELECT NOW() as now")
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
