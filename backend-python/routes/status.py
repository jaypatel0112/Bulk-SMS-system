from flask import Blueprint, request
import logging
from datetime import datetime
from psycopg2 import pool
import time

status_routes = Blueprint('status_routes', __name__)

# Database connection pool (should be initialized elsewhere)
db_pool = None

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


@status_routes.route('/status', methods=['POST'])
def handle_status():
    data = request.form
    message_sid = data.get('MessageSid')
    message_status = data.get('MessageStatus')
    to_number = data.get('To')
    from_number = data.get('From')
    sms_status = data.get('SmsStatus')
    error_code = data.get('ErrorCode')
    error_message = data.get('ErrorMessage')

    logging.info('Twilio status callback received: %s', data)

    try:
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                # Update the message status
                cur.execute(
                    """UPDATE sms_platform.messages 
                       SET status = %s::VARCHAR, 
                           delivered_at = CASE WHEN %s = 'delivered' THEN NOW() ELSE delivered_at END 
                       WHERE twilio_sid = %s""",
                    [message_status or sms_status, message_status or sms_status, message_sid]
                )
                MAX_RETRIES = 10
                DELAY_MS = 300
                message_row = None
                for attempt in range(MAX_RETRIES):
                    cur.execute("SELECT campaign_id FROM sms_platform.messages WHERE twilio_sid = %s", [message_sid])
                    message_row = cur.fetchone()
                    if message_row:
                        break
                    time.sleep(DELAY_MS / 1000)

                if not message_row:
                    logging.warning(f"❌ Message not found for SID {message_sid} after {MAX_RETRIES} retries")
                    return 'Message not found', 404


                campaign_id = message_row[0]

                # Determine normalized status column
                status_lower = (message_status or sms_status or "").lower()

                valid_statuses = {
                    'delivered': 'delivered',
                    'failed': 'failed',
                    'undelivered': 'failed',
                    'queued': 'queued',
                    'sent': 'queued',
                    'accepted': 'queued'
                }

                status_column = valid_statuses.get(status_lower)

                if not status_column:
                    logging.warning(f"❌ Unexpected message status received: {status_lower}")
                    return 'Invalid message status', 400

                # Safely update the campaign status count
                if campaign_id:
                    # Use string interpolation carefully since status_column is whitelisted
                    query_str = f"""UPDATE sms_platform.campaigns
                                    SET {status_column} = COALESCE({status_column}, 0) + 1
                                    WHERE id = %s"""
                    cur.execute(query_str, [campaign_id])

                conn.commit()
                return 'Status received', 200
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error('Error updating message status: %s', str(err))
        return 'Internal Server Error', 500


# Helper delay function for retry
def delay(ms):
    time.sleep(ms / 1000)