from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2 import pool
import os
import requests
from datetime import datetime, timedelta
import threading
import time
import logging
import asyncio

from backports.zoneinfo import ZoneInfo
from datetime import datetime, timezone

cst = ZoneInfo("America/Chicago")
now_cst = datetime.now(cst)
print(now_cst)

def parse_to_utc(dt_str, tz="America/Chicago"):
    # Remove Z if present
    if dt_str.endswith('Z'):
        dt_str = dt_str[:-1]
        dt = datetime.strptime(dt_str, "%Y-%m-%dT%H:%M:%S.%f")
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    else:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo(tz))
    return dt.astimezone(ZoneInfo("UTC"))

campaign_routes = Blueprint('campaign_routes', __name__)
api_base_url = os.getenv('BASE_API_URL')

# Database connection pool (should be initialized elsewhere and passed to this module)
db_pool = None

def init_db_pool(pool):
    global db_pool
    db_pool = pool

# Helper function to execute count queries
def count(q, params=None):
    conn = None
    try:
        conn = db_pool.getconn()
        with conn.cursor() as cur:
            cur.execute(q, params or [])
            return int(cur.fetchone()[0])
    finally:
        if conn:
            db_pool.putconn(conn)

@campaign_routes.route('/dashboard-stats', methods=['GET'])
def dashboard_stats():
    email = request.args.get('email')
    role = request.args.get('role')
    selected_user = request.args.get('selectedUser')
    time_filter = request.args.get('timeFilter')
    is_admin = role == '1' or role == 1
    user_email = selected_user or email

    try:
        # Time Filtering
        time_message_condition = ''
        time_opt_out_condition = ''

        if time_filter == '1h':
            time_message_condition = "AND sent_at >= NOW() - INTERVAL '1 hour'"
            time_opt_out_condition = "AND opted_out_at >= NOW() - INTERVAL '1 hour'"
        elif time_filter == '24h':
            time_message_condition = "AND sent_at >= NOW() - INTERVAL '24 hours'"
            time_opt_out_condition = "AND opted_out_at >= NOW() - INTERVAL '24 hours'"
        elif time_filter == '7d':
            time_message_condition = "AND sent_at >= NOW() - INTERVAL '7 days'"
            time_opt_out_condition = "AND opted_out_at >= NOW() - INTERVAL '7 days'"
        elif time_filter == '30d':
            time_message_condition = "AND sent_at >= NOW() - INTERVAL '30 days'"
            time_opt_out_condition = "AND opted_out_at >= NOW() - INTERVAL '30 days'"
        elif time_filter == '1m':
            time_message_condition = "AND sent_at >= NOW() - INTERVAL '1 month'"
            time_opt_out_condition = "AND opted_out_at >= NOW() - INTERVAL '1 month'"
        elif time_filter == '1y':
            time_message_condition = "AND sent_at >= NOW() - INTERVAL '1 year'"
            time_opt_out_condition = "AND opted_out_at >= NOW() - INTERVAL '1 year'"
        elif time_filter == 'all' or not time_filter:
            time_message_condition = ''
            time_opt_out_condition = ''

        # Sent Messages
        logging.info(f"Sent messages query for user: {user_email}, is_admin: {is_admin}")
        if is_admin and not selected_user:
            sent_messages = count(f"""
                SELECT COUNT(*) FROM sms_platform.messages
                WHERE direction = 'outbound' {time_message_condition}
            """)
        else:
            sent_messages = count(f"""
                SELECT COUNT(*) FROM sms_platform.messages
                WHERE direction = 'outbound' AND email = %s {time_message_condition}
            """, [user_email])

        # Incoming Messages
        logging.info(f"Incoming messages query for user: {user_email}, is_admin: {is_admin}")
        if is_admin and (not selected_user or selected_user == email):
            incoming_messages = count(f"""
                SELECT COUNT(*) FROM sms_platform.messages
                WHERE direction = 'inbound' {time_message_condition}
            """)
        else:
            conn = db_pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT phone_number
                        FROM sms_platform.twilio_numbers
                        WHERE username = %s
                    """, [user_email])
                    rows = cur.fetchall()
                    numbers = [r[0] for r in rows]

                    if numbers:
                        incoming_messages = count(f"""
                            SELECT COUNT(*) FROM sms_platform.messages
                            WHERE direction = 'inbound'
                            AND to_number = ANY(%s)
                            {time_message_condition}
                        """, [numbers])
                    else:
                        incoming_messages = 0
            finally:
                db_pool.putconn(conn)

        # Opt-Out Count
        logging.info(f"Opt-out count query for user: {user_email}, is_admin: {is_admin}")
        if is_admin and (not selected_user or selected_user == email):
            opt_out_count = count(f"""
                SELECT COUNT(*) FROM sms_platform.opt_outs
                WHERE TRUE {time_opt_out_condition}
            """)
        else:
            conn = db_pool.getconn()
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT phone_number
                        FROM sms_platform.twilio_numbers
                        WHERE username = %s
                    """, [user_email])
                    rows = cur.fetchall()
                    numbers = [r[0] for r in rows]

                    if numbers:
                        opt_out_count = count(f"""
                            SELECT COUNT(*) FROM sms_platform.opt_outs
                            WHERE phone_number = ANY(%s)
                            {time_opt_out_condition}
                        """, [numbers])
                    else:
                        opt_out_count = 0
            finally:
                db_pool.putconn(conn)

        return jsonify({
            'sentMessages': sent_messages,
            'incomingMessages': incoming_messages,
            'totalMessages': sent_messages + incoming_messages,
            'optOutCount': opt_out_count
        })
    except Exception as err:
        logging.error('Dashboard stats error: %s', err, exc_info=True)
        return jsonify({
            'error': 'Failed to fetch dashboard stats',
            'details': str(err)
        }), 500


@campaign_routes.route('/latestcampaign', methods=['GET'])
def latest_campaign():
    twilio_number = request.args.get('twilio_number')
    contact_phone = request.args.get('contact_phone')
    logging.info('📥 Received request with: %s', {'twilio_number': twilio_number, 'contact_phone': contact_phone})

    if not twilio_number or not contact_phone:
        return jsonify({'error': 'twilio_number and contact_phone are required'}), 400

    try:
        query_text = """
            SELECT 
                m.campaign_id,
                c.name AS campaign_name,
                m.sent_at
            FROM sms_platform.messages m
            JOIN sms_platform.campaigns c ON m.campaign_id = c.id
            WHERE 
                m.from_number = %s
                AND m.to_number = %s
                AND m.direction = 'outbound'
                AND m.campaign_id IS NOT NULL
            ORDER BY m.sent_at DESC
            LIMIT 1
        """

        logging.info('📤 Executing query: %s', query_text)
        logging.info('📦 With values: %s', [twilio_number, contact_phone])

        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(query_text, [twilio_number, contact_phone])
                rows = cur.fetchall()
                logging.info('🔍 Found %d matching campaign(s)', len(rows))

                if len(rows) == 0:
                    return jsonify({'campaign_name': None})

                latest = rows[0]
                logging.info('✅ Latest campaign result: %s', latest)

                return jsonify({
                    'campaign_id': latest[0],
                    'campaign_name': latest[1],
                    'sent_at': latest[2]
                })
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error('❌ Database error: %s', err)
        return jsonify({
            'error': 'Internal server error',
            'details': str(err)
        }), 500

@campaign_routes.route('/<email>', methods=['GET'])
def get_campaigns_by_email(email):
    try:
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                if email:
                    cur.execute(
                        "SELECT user_id FROM sms_platform.employees WHERE username = %s", 
                        [email]
                    )
                    user = cur.fetchone()

                    if user and user[0]:
                        cur.execute("""
                            SELECT id, name AS campaign_name, created_at, user_id, scheduled_at, sent, status
                            FROM sms_platform.campaigns 
                            WHERE user_id = %s 
                            ORDER BY created_at DESC
                        """, [user[0]])
                    else:
                        cur.execute("""
                            SELECT id, name AS campaign_name, created_at, user_id, scheduled_at, sent, status
                            FROM sms_platform.campaigns 
                            ORDER BY created_at DESC
                        """)
                else:
                    cur.execute("""
                        SELECT id, name AS campaign_name, created_at, user_id, scheduled_at, sent, status
                        FROM sms_platform.campaigns 
                        ORDER BY created_at DESC
                    """)

                campaigns = []
                for row in cur.fetchall():
                    campaigns.append({
                        'id': row[0],
                        'campaign_name': row[1],
                        'created_at': row[2],
                        'user_id': row[3],
                        'scheduled_at': row[4],
                        'sent': row[5],
                        'status': row[6]
                    })

                return jsonify(campaigns)
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error("❌ Error fetching campaigns: %s", str(err))
        return jsonify({'error': 'Internal server error while fetching campaigns'}), 500

@campaign_routes.route('/details/<id>', methods=['GET'])
def get_campaign_details(id):
    email = request.args.get('email')
    
    try:
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                user_id = None
                if email:
                    cur.execute(
                        "SELECT user_id FROM sms_platform.employees WHERE username = %s", 
                        [email]
                    )
                    user_row = cur.fetchone()
                    user_id = user_row[0] if user_row else None

                query = """
                    SELECT c.id, c.name as campaign_name, c.sender_phone_number, c.created_at, 
                           c.message_template, c.user_id, c.scheduled_at, c.sent, c.status,
                           e.username as user_email
                    FROM sms_platform.campaigns c
                    LEFT JOIN sms_platform.employees e ON c.user_id = e.user_id
                    WHERE c.id = %s
                """
                query_params = [id]
                
                if user_id:
                    query += " AND c.user_id = %s"
                    query_params.append(user_id)

                cur.execute(query, query_params)
                campaign_row = cur.fetchone()
                
                if not campaign_row:
                    return jsonify({'error': 'Campaign not found'}), 404

                campaign = {
                    'id': campaign_row[0],
                    'campaign_name': campaign_row[1],
                    'sender_phone_number': campaign_row[2],
                    'created_at': campaign_row[3],
                    'message_template': campaign_row[4],
                    'user_id': campaign_row[5],
                    'scheduled_at': campaign_row[6],
                    'sent': campaign_row[7],
                    'status': campaign_row[8],
                    'user_email': campaign_row[9]
                }

                # Get status report
                cur.execute(
                    "SELECT delivered, failed, queued FROM sms_platform.campaigns WHERE id = %s",
                    [id]
                )
                status_row = cur.fetchone()
                report = {
                    'delivered': status_row[0] if status_row else None,
                    'failed': status_row[1] if status_row else None,
                    'queued': status_row[2] if status_row else None
                }

                # Get contacts
                cur.execute(
                    """SELECT first_name, last_name, phone_number 
                       FROM sms_platform.campaign_target_lists 
                       WHERE campaign_id = %s""",
                    [id]
                )
                contacts = []
                for row in cur.fetchall():
                    contacts.append({
                        'first_name': row[0],
                        'last_name': row[1],
                        'phone_number': row[2]
                    })

                return jsonify({
                    **campaign,
                    'report': report,
                    'contacts': contacts
                })
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error("Error fetching campaign details: %s", str(err))
        return jsonify({'error': 'Internal server error'}), 500

@campaign_routes.route('/upload', methods=['POST'])
def upload_campaign():
    data = request.get_json()
    campaign_name = data.get('campaign_name')
    sender_id = data.get('sender_id')
    message_template = data.get('message_template')
    contacts = data.get('contacts')
    scheduled_at = data.get('scheduled_at')
    user_email = data.get('user_email')

    if not campaign_name or not contacts or len(contacts) == 0:
        return jsonify({'error': 'Campaign name and contacts are required.'}), 400

    conn = None
    try:
        conn = db_pool.getconn()
        conn.autocommit = False
        cur = conn.cursor()

        # Get user_id
        cur.execute(
            "SELECT user_id FROM sms_platform.employees WHERE username = %s",
            [user_email]
        )
        user_row = cur.fetchone()
        user_id = user_row[0] if user_row else None

        is_scheduled = bool(scheduled_at)
        initial_status = 'pending' if is_scheduled else 'processing'
        logging.info("UserName: %s", user_email)
        logging.info("UserID: %s", user_id)

        if scheduled_at:
            scheduled_at_utc = parse_to_utc(scheduled_at)
        else:
            scheduled_at_utc = None

        # Insert campaign
        cur.execute(
            """INSERT INTO sms_platform.campaigns 
               (name, created_at, sender_phone_number, message_template, scheduled_at, user_id, sent, status, user_email) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) 
               RETURNING id""",
            [
                campaign_name,
                now_cst,
                sender_id,
                message_template,
                scheduled_at_utc,
                user_id,
                not is_scheduled,
                initial_status,
                user_email
            ]
        )
        campaign_id = cur.fetchone()[0]

        # Prepare personalized messages and insert into target list
        personalized_messages = []
        for contact in contacts:
            personalized_message = message_template
            if contact.get('first_name'):
                personalized_message = personalized_message.replace('{{first_name}}', contact['first_name'])
            if contact.get('last_name'):
                personalized_message = personalized_message.replace('{{last_name}}', contact['last_name'])

            personalized_messages.append({
                'first_name': contact.get('first_name'),
                'last_name': contact.get('last_name'),
                'phone_number': contact.get('phone_number'),
                'message': personalized_message
            })

            cur.execute(
                """INSERT INTO sms_platform.campaign_target_lists 
                   (campaign_id, first_name, last_name, phone_number, message, sender_phone_number)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                [
                    campaign_id,
                    contact.get('first_name'),
                    contact.get('last_name'),
                    contact.get('phone_number'),
                    personalized_message,
                    sender_id
                ]
            )

        conn.commit()

        # If campaign is not scheduled, immediately send it
        if not is_scheduled:
            try:
                response = requests.post(
                    f"{api_base_url}/api/message/send-bulk",
                    json={
                        'message': message_template,
                        'twilioNumber': sender_id,
                        'contacts': personalized_messages,
                        'campaign_id': campaign_id,
                        'user_id': user_id,
                        'user_email': user_email
                    }
                )

                update_conn = db_pool.getconn()
                try:
                    update_cur = update_conn.cursor()
                    if response.status_code == 200:
                        try:
                            res_json = response.json()
                            if res_json.get('success'):
                                update_cur.execute(
                                    """UPDATE sms_platform.campaigns 
                                       SET status = 'sent', processed_at = %s
                                       WHERE id = %s""",
                                    [now_cst, campaign_id]
                                )
                                update_conn.commit()
                            else:
                                raise Exception('Bulk send API responded but did not return success')
                        except Exception as json_err:
                            raise Exception(f'Bulk send API JSON error: {str(json_err)}')
                    else:
                        raise Exception(f'Bulk send API failed with status {response.status_code}: {response.text}')
                finally:
                    db_pool.putconn(update_conn)
            except Exception as send_error:
                update_conn = db_pool.getconn()
                try:
                    update_cur = update_conn.cursor()
                    update_cur.execute(
                        """UPDATE sms_platform.campaigns 
                           SET status = 'failed', last_error = %s
                           WHERE id = %s""",
                        [str(send_error)[:255], campaign_id]
                    )
                    update_conn.commit()
                finally:
                    db_pool.putconn(update_conn)

        return jsonify({'success': True, 'campaignId': campaign_id})
    except Exception as err:
        if conn:
            conn.rollback()
        logging.error('❌ Error uploading campaign: %s', str(err))
        return jsonify({'error': 'Internal server error while uploading campaign'}), 500
    finally:
        if conn:
            conn.autocommit = True
            db_pool.putconn(conn)


@campaign_routes.route('/status-numbers/<id>', methods=['GET'])
def status_numbers(id):
    status = request.args.get('status')
    
    valid_statuses = ['failed', 'undelivered', 'delivered', 'queued', 'sent']
    if not status or status not in valid_statuses:
        return jsonify({'error': 'Invalid status'}), 400

    # If status is 'failed', include both 'failed' and 'undelivered'
    status_values = []
    if status == 'failed':
        status_values = ['failed', 'undelivered']
    elif status == 'delivered':
        status_values = ['delivered', 'sent']
    else:
        status_values = [status]

    try:
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """SELECT to_number AS phone_number
                       FROM sms_platform.messages
                       WHERE campaign_id = %s AND status = ANY(%s)""",
                    [id, status_values]
                )
                numbers = [row[0] for row in cur.fetchall()]
                return jsonify({'numbers': numbers})
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error('Error fetching status numbers: %s', err)
        return jsonify({'error': 'Failed to fetch status numbers'}), 500

@campaign_routes.route('/replies-count/<campaignId>', methods=['GET'])
def replies_count(campaignId):
    try:
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(DISTINCT m_in.from_number) AS replies
                    FROM sms_platform.messages m_out
                    JOIN sms_platform.messages m_in
                      ON m_out.to_number = m_in.from_number
                      AND m_out.campaign_id = %s
                      AND m_out.created_at < m_in.created_at
                    WHERE m_out.direction = 'outbound'
                      AND m_in.direction = 'inbound'
                """, [campaignId])
                result = cur.fetchone()
                return jsonify({'replies': int(result[0]) if result else 0})
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error('Error fetching replies count: %s', err)
        return jsonify({'error': 'Failed to fetch replies count'}), 500

@campaign_routes.route('/replied-numbers/<campaignId>', methods=['GET'])
def replied_numbers(campaignId):
    try:
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT m_in.from_number AS number
                    FROM sms_platform.messages m_out
                    JOIN sms_platform.messages m_in
                      ON m_out.to_number = m_in.from_number
                      AND m_out.campaign_id = %s
                      AND m_out.created_at < m_in.created_at
                    WHERE m_out.direction = 'outbound'
                      AND m_in.direction = 'inbound'
                """, [campaignId])
                numbers = [row[0] for row in cur.fetchall()]
                return jsonify({'numbers': numbers})
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error('Error fetching replied numbers: %s', err)
        return jsonify({'error': 'Failed to fetch replied numbers'}), 500

@campaign_routes.route('/campaign-name/<campaignId>', methods=['GET'])
def campaign_name(campaignId):
    try:
        conn = db_pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT name FROM sms_platform.campaigns WHERE id = %s",
                    [campaignId]
                )
                result = cur.fetchone()
                if not result:
                    return jsonify({'error': 'Campaign not found'}), 404
                return jsonify({'name': result[0]})
        finally:
            db_pool.putconn(conn)
    except Exception as err:
        logging.error('Error fetching campaign name: %s', err)
        return jsonify({'error': 'Failed to fetch campaign name'}), 500

# Scheduler
scheduler_started = False

def initialize_scheduler():
    global scheduler_started
    if scheduler_started:
        return  # Prevent re-entry
    scheduler_started = True

    logging.info('⏰ Initializing campaign scheduler...')

    # Run once on server start
    try:
        asyncio.run(process_due_campaigns())
    except Exception as err:
        logging.error('❌ Initial campaign check failed: %s', str(err))

    # Start periodic checking
    def scheduler_loop():
        while True:
            try:
                logging.info(f"[⏱️ Scheduler] Checking campaigns at {now_cst.isoformat()}")
                asyncio.run(process_due_campaigns())
            except Exception as err:
                logging.error('❌ Scheduled campaign check failed: %s', str(err))
            time.sleep(15)

    thread = threading.Thread(target=scheduler_loop, daemon=True)
    thread.start()

def process_due_campaigns():
    conn = None
    try:
        conn = db_pool.getconn()
        conn.autocommit = False
        cur = conn.cursor()

        now = datetime.now(timezone.utc)
        print("Printing time:",now)
        logging.info(f"🔍 Checking for scheduled campaigns at {now.isoformat()}")

        cur.execute("""
            UPDATE sms_platform.campaigns 
            SET status = 'processing'
            WHERE sent = false 
            AND scheduled_at IS NOT NULL 
            AND scheduled_at <= %s
            AND status IN ('pending', 'failed')
            RETURNING id, name, message_template, sender_phone_number, user_id, user_email
        """, [now])
        campaigns = cur.fetchall()
        logging.info(f"Found {len(campaigns)} campaigns to process")

        for campaign in campaigns:
            campaign_id = campaign[0]
            try:
                cur.execute("""
                    SELECT first_name, last_name, phone_number, message 
                    FROM sms_platform.campaign_target_lists 
                    WHERE campaign_id = %s
                """, [campaign_id])
                contacts = []
                for row in cur.fetchall():
                    contacts.append({
                        'first_name': row[0],
                        'last_name': row[1],
                        'phone_number': row[2],
                        'message': row[3]
                    })

                logging.info("Campaign email for schedule time: %s", campaign[5])

                # Consider making this HTTP request async too (see note below)
                response = requests.post(
                    f"{api_base_url}/api/message/send-bulk",
                    json={
                        'message': campaign[2],
                        'twilioNumber': campaign[3],
                        'contacts': contacts,
                        'campaign_id': campaign_id,
                        'user_id': campaign[4],
                        'user_email': campaign[5]
                    }
                )

                if not response.json().get('success'):
                    raise Exception('Message API did not return success')

                cur.execute("""
                    UPDATE sms_platform.campaigns 
                    SET sent = true, status = 'sent', processed_at = %s
                    WHERE id = %s
                """, [now_cst, campaign_id])

                logging.info(f"✅ Successfully sent campaign {campaign_id}")
            except Exception as campaign_error:
                logging.error(f"❌ Failed to process campaign {campaign_id}: {str(campaign_error)}")

                cur.execute("""
                    UPDATE sms_platform.campaigns 
                    SET status = 'failed', last_error = %s
                    WHERE id = %s
                """, [str(campaign_error)[:255], campaign_id])

        conn.commit()
        return len(campaigns)
    except Exception as err:
        if conn:
            conn.rollback()
        logging.error("❌ Error during scheduled campaign check: %s", str(err))
        raise err
    finally:
        if conn:
            conn.autocommit = True
            db_pool.putconn(conn)

def scheduled_campaign_check():
    while True:
        try:
            processed_count = process_due_campaigns()
            logging.info(f"Scheduled campaign check processed {processed_count} campaigns.")
        except Exception as e:
            logging.error(f"❌ Scheduled campaign check failed: {e}", exc_info=True)
        time.sleep(60)

# To start the background thread when your app starts:
def start_scheduler():
    thread = threading.Thread(target=scheduled_campaign_check, daemon=True)
    thread.start()

# Updated Lambda handler
def async_handler(event, context):
    logging.info('⏰ Lambda campaign scheduler triggered')
    try:
        processed_count = process_due_campaigns()
        return {
            'statusCode': 200,
            'body': {
                'message': 'Campaign processing complete',
                'processedCount': processed_count
            }
        }
    except Exception as err:
        logging.error('❌ Lambda handler error: %s', err)
        return {
            'statusCode': 500,
            'body': {'error': str(err)}
        }

# Wrapper for Lambda
def handler(event, context):
    #return asyncio.run(async_handler(event, context))
    return async_handler(event, context)

