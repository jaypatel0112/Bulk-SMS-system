from flask import Blueprint, request, jsonify, Response
import os
import re
import logging
import requests
import json
from twilio.rest import Client
from db.connection import query

from backports.zoneinfo import ZoneInfo
from datetime import datetime

cst = ZoneInfo("America/Chicago")
now_cst = datetime.now(cst)
print(now_cst)
# Initialize Flask Blueprint
message_routes = Blueprint('message_routes', __name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Initialize Twilio client
if not os.getenv('TWILIO_ACCOUNT_SID') or not os.getenv('TWILIO_AUTH_TOKEN'):
    raise ValueError('Twilio credentials not configured')

twilio_client = Client(os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))

from threading import Thread
import logging

@message_routes.route('/send-bulk', methods=['POST'])
def send_bulk():
    data = request.get_json()
    message = data.get('message')
    twilio_number = data.get('twilioNumber')
    contacts = data.get('contacts')
    campaign_id = data.get('campaign_id')
    user_id = data.get('user_id')
    user_email = data.get('user_email')

    logging.info('user_email: %s', user_email)
    logging.info('contacts count: %d', len(contacts or []))
    logging.info('📤 Starting bulk send for campaign: %s', campaign_id)

    if not isinstance(contacts, list):
        return jsonify({'error': 'contacts must be a list'}), 400

    threads = []
    results = []

    def send_message_thread(contact):
        try:
            phone_number = re.sub(r'\D', '', contact.get('phone_number', ''))
            if len(phone_number) == 10:
                phone_number = f"+1{phone_number}"
            elif not phone_number.startswith('+'):
                phone_number = f"+{phone_number}"

            # Check opt-out
            opt_out = query("SELECT 1 FROM sms_platform.opt_outs WHERE phone_number = %s LIMIT 1", [phone_number])
            if opt_out:
                logging.info(f'🚫 Skipping opted-out: {phone_number}')
                if campaign_id:
                    query("UPDATE sms_platform.campaigns SET failed = COALESCE(failed, 0) + 1 WHERE id = %s", [campaign_id])
                return

            # Personalize message
            first_name = contact.get('first_name')
            last_name = contact.get('last_name')
            personalized_message = contact.get('message', message)
            if not isinstance(personalized_message, str):
                personalized_message = str(personalized_message)
            personalized_message = personalized_message.replace('${first_name}', first_name or '')
            personalized_message = personalized_message.replace('${last_name}', last_name or '')

            # ✅ Send message via Twilio
            message_sent = twilio_client.messages.create(
                body=personalized_message,
                from_=twilio_number,
                to=phone_number,
                status_callback=f"{os.getenv('BASE_API_URL')}/api/status/status"
            )

            # ✅ Immediately insert into messages table (even before conversations)
            query("""INSERT INTO sms_platform.messages (
                        twilio_sid, direction, status, body, 
                        from_number, to_number, sent_at, 
                        user_id, conversation_id, campaign_id, email
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, NULL, %s, %s)""",
                [message_sent.sid, 'outbound', message_sent.status, personalized_message,
                twilio_number, phone_number, user_id, campaign_id, user_email])

            # 💬 (Optional) Add conversation after ensuring message record exists
            conv = query("""SELECT id FROM sms_platform.conversations 
                            WHERE contact_phone = %s ORDER BY last_message_at DESC LIMIT 1""", [phone_number])
            conversation_id = conv[0][0] if conv else None

            if not conversation_id:
                new_conv = query("""INSERT INTO sms_platform.conversations 
                                    (contact_phone, status, last_message_at, twilio_number) 
                                    VALUES (%s, %s, NOW(), %s) RETURNING id""",
                                [phone_number, 'active', twilio_number])
                conversation_id = new_conv[0][0]

            # ✅ Update message with conversation_id after it's created
            query("""UPDATE sms_platform.messages SET conversation_id = %s WHERE twilio_sid = %s""",
                [conversation_id, message_sent.sid])

        except Exception as e:
            logging.error(f'❌ Error sending to {contact.get("phone_number")}: {e}')
            if campaign_id:
                query("UPDATE sms_platform.campaigns SET failed = COALESCE(failed, 0) + 1 WHERE id = %s", [campaign_id])
            # Insert failed message
            query("""INSERT INTO sms_platform.messages (
                        twilio_sid, direction, status, body, 
                        from_number, to_number, sent_at, 
                        user_id, conversation_id, campaign_id, email
                    ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s)""",
                [None, 'outbound', 'failed', personalized_message,
                twilio_number, phone_number, user_id, None, campaign_id, user_email])

    for contact in contacts:
        t = Thread(target=send_message_thread, args=(contact,))
        threads.append(t)
        t.start()

    # Wait for all threads to finish
    for t in threads:
        t.join()

    return jsonify({
        'success': True,
        'message': '✅ Bulk messages processed (sent in parallel)',
        'stats': {
            'total_contacts': len(contacts),
            'user_id': user_id
        }
    })


@message_routes.route('/single', methods=['POST'])
def send_single():
    data = request.get_json()
    from_number = data.get('fromNumber')
    to_number = data.get('toNumber')
    message = data.get('message')
    email = data.get('email')

    logging.info('📤 Starting single message send from: %s', email)
    logging.info('From: %s, To: %s', from_number, to_number)

    try:
        # Validate required fields
        if not from_number or not to_number or not message or not email:
            return jsonify({
                'error': 'Missing required fields (fromNumber, toNumber, message, email)'
            }), 400

        # Normalize phone number helper
        def normalize_phone(phone):
            normalized = re.sub(r'\D', '', phone)
            if len(normalized) == 10:
                normalized = f"+1{normalized}"
            elif not normalized.startswith('+'):
                normalized = f"+{normalized}"
            return normalized

        normalized_from = normalize_phone(from_number)
        normalized_to = normalize_phone(to_number)

        logging.info('Normalized From: %s, To: %s', normalized_from, normalized_to)

        # Check if recipient has opted out
        opt_out_result = query(
            "SELECT 1 FROM sms_platform.opt_outs WHERE phone_number = %s LIMIT 1",
            [normalized_to]
        )
        if opt_out_result:
            logging.info('🚫 Message not sent - recipient has opted out')
            return jsonify({
                'error': 'Message not sent - recipient has opted out'
            }), 400

        # Get user_id from email (username)
        user_result = query(
            "SELECT id FROM sms_platform.employees WHERE username = %s LIMIT 1",
            [email]
        )
        if not user_result:
            return jsonify({'error': 'User not found'}), 400
        
        user_id = user_result[0][0]
        logging.info('✅ Resolved user_id: %s', user_id)

        # Send message via Twilio
        try:
            message_sent = twilio_client.messages.create(
                body=message,
                from_=normalized_from,
                to=normalized_to,
                status_callback=f"{os.getenv('BASE_API_URL')}/api/status/status"
            )
            logging.info('✅ Message sent with SID: %s', message_sent.sid)
        except Exception as twilio_error:
            logging.error('❌ Twilio error: %s', str(twilio_error))
            return jsonify({
                'error': 'Failed to send message via Twilio',
                'details': str(twilio_error)
            }), 500

        # Lookup existing conversation
        conv_result = query(
            """SELECT id FROM sms_platform.conversations 
               WHERE contact_phone = %s AND twilio_number = %s
               ORDER BY last_message_at DESC LIMIT 1""",
            [normalized_to, normalized_from]
        )
        
        conversation_id = conv_result[0][0] if conv_result else None
        
        # Create new conversation if none exists
        if not conversation_id:
            new_conv = query(
                """INSERT INTO sms_platform.conversations 
                   (contact_phone, status, last_message_at, twilio_number) 
                   VALUES (%s, 'active', %s, %s) RETURNING id""",
                [normalized_to, now_cst, normalized_from]
            )
            conversation_id = new_conv[0][0]
            logging.info('🆕 Created new conversation: %s', conversation_id)

        # Insert message record
        query(
            """INSERT INTO sms_platform.messages (
                twilio_sid, direction, status, body, 
                from_number, to_number, sent_at, 
                user_id, conversation_id, email
            ) VALUES (%s, 'outbound', %s, %s, %s, %s, %s, %s, %s, %s)""",
            [
                message_sent.sid,
                message_sent.status,
                message,
                normalized_from,
                normalized_to,
                now_cst,
                user_id,
                conversation_id,
                email
            ]
        )

        # Update last message time on conversation
        query(
            """UPDATE sms_platform.conversations 
               SET last_message_at = %s 
               WHERE id = %s""",
            [now_cst, conversation_id]
        )

        return jsonify({
            'success': True,
            'message': 'Message sent successfully',
            'messageSid': message_sent.sid,
            'conversationId': conversation_id
        })
    
    except Exception as err:
        logging.error('❌ Error in /send: %s', str(err))
        return jsonify({
            'error': 'Internal server error',
            'details': str(err)
        }), 500

@message_routes.route('/incoming', methods=['POST'])
def incoming_message():
    try:
        # Use UTC time instead of pytz timezone for simplicity
        now_utc = datetime.utcnow()

        # Grab Twilio message SID from possible keys (case variations)
        message_sid = (request.form.get('MessageSid') or
                       request.form.get('SmsSid') or
                       request.form.get('SmsMessageSid'))
        body = request.form.get('Body')
        from_number = request.form.get('From')
        to_number = request.form.get('To')

        print("request.form:", request.form)
        print("request.data:", request.data)
        print("request.content_type:", request.content_type)

        logging.info('📩 Incoming message from: %s to Twilio number: %s', from_number, to_number)

        # Validate required fields
        if not all([message_sid, body, from_number, to_number]):
            logging.error('Missing one or more required fields in the incoming request.')
            twiml_response = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
            return Response(twiml_response, status=400, mimetype='text/xml')

        lowered = body.strip().lower()
        opt_out_keywords = ['stop', 'unsubscribe', 'cancel', 'quit', 'end']
        is_opt_out = lowered in opt_out_keywords
        re_subscribe_keywords = ['start', 'resubscribe']
        is_re_subscribe = lowered in re_subscribe_keywords

        print("Storing the data in database...")
        print("From Number:::", from_number)
        print("To Number:::", to_number)
        # 1. Find or create conversation BEFORE inserting message
        existing_conversation = query(
            """SELECT id FROM sms_platform.conversations 
               WHERE contact_phone = %s AND twilio_number = %s AND status != 'deactivated_by_user'
               ORDER BY last_message_at DESC LIMIT 1""",
            [from_number, to_number]
        )
        print("Conversation id:::", existing_conversation)
        if existing_conversation:
            conversation_id = existing_conversation[0][0]
        else:
            status = 'deactivated_by_user' if is_opt_out else 'active'
            new_conv = query(
                """INSERT INTO sms_platform.conversations 
                   (contact_phone, twilio_number, status, last_message_at)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                [from_number, to_number, status, now_utc]
            )
            conversation_id = new_conv[0][0]

        # 2. Insert message with conversation_id
        message_result = query(
            """INSERT INTO sms_platform.messages 
               (twilio_sid, direction, status, body, from_number, to_number, sent_at, conversation_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            [message_sid, 'inbound', 'received', body, from_number, to_number, now_utc, conversation_id]
        )
        message_id = message_result[0][0]

        # 3. Update conversation last_message_at
        query(
            "UPDATE sms_platform.conversations SET last_message_at = %s WHERE id = %s",
            [now_utc, conversation_id]
        )

        # 4. Handle re-subscribe logic
        if is_re_subscribe:
            was_opted_out = query(
                "SELECT 1 FROM sms_platform.opt_outs WHERE contact_phone = %s LIMIT 1",
                [from_number]
            )
            
            if was_opted_out:
                query(
                    "DELETE FROM sms_platform.opt_outs WHERE contact_phone = %s",
                    [from_number]
                )

                reactivated_convo = query(
                    """UPDATE sms_platform.conversations SET status = 'active'
                       WHERE contact_phone = %s AND twilio_number = %s
                       RETURNING id""",
                    [from_number, to_number]
                )
                conv_id = reactivated_convo[0][0] if reactivated_convo else None

                if conv_id:
                    query(
                        """UPDATE sms_platform.conversations 
                           SET last_message_at = %s, has_unread = TRUE 
                           WHERE id = %s""",
                        [now_utc, conv_id]
                    )
                
                    query(
                        "UPDATE sms_platform.messages SET conversation_id = %s WHERE twilio_sid = %s",
                        [conv_id, message_sid]
                    )

                twiml_response = """<?xml version="1.0" encoding="UTF-8"?><Response><Message>You're now resubscribed and will continue receiving messages from us.</Message></Response>"""
                logging.info('✅ %s has been resubscribed to Twilio %s.', from_number, to_number)
                return Response(twiml_response, mimetype='text/xml')
            else:
                logging.info('ℹ️ %s tried to resubscribe, but was not opted out.', from_number)
                twiml_response = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
                return Response(twiml_response, mimetype='text/xml')

        # 5. Handle opt-out
        if is_opt_out:
            already_opted_out = query(
                "SELECT 1 FROM sms_platform.opt_outs WHERE contact_phone = %s LIMIT 1",
                [from_number]
            )

            if not already_opted_out:
                query(
                    """INSERT INTO sms_platform.contacts (phone_number)
                       VALUES (%s) ON CONFLICT DO NOTHING""",
                    [from_number]
                )

                query(
                    """INSERT INTO sms_platform.opt_outs 
                       (phone_number, contact_phone, reason, opt_out_keyword, processed_in_twilio)
                       VALUES (%s, %s, %s, %s, %s)""",
                    [to_number, from_number, 'User replied with opt-out keyword', lowered, False]
                )

            # Update conversation status and notify user
            query(
                "UPDATE sms_platform.conversations SET status = %s WHERE id = %s",
                ['deactivated_by_user', conversation_id]
            )

            twiml_response = """<?xml version="1.0" encoding="UTF-8"?><Response><Message>You've been unsubscribed and will no longer receive messages from us.</Message></Response>"""
            logging.info('🚫 %s opted out of Twilio %s.', from_number, to_number)
            return Response(twiml_response, mimetype='text/xml')
        
        
        # 6. Special processing for specific Twilio number
        if to_number == "+12244452204":
            campaign_result = query(
                """
                SELECT c.name, c.id, m.to_number
                FROM sms_platform.campaigns c
                JOIN sms_platform.messages m ON m.campaign_id = c.id
                WHERE m.to_number = %s AND m.from_number = %s
                ORDER BY m.sent_at DESC
                LIMIT 1
                """,
                [from_number, to_number]
            )

            
            if not campaign_result:
                raise Exception('No campaign found for this number')
            print("Campaign Name:", campaign_result)
            campaign_name = str(campaign_result[0][0])
            campaign_id = str(campaign_result[0][1])
            match = re.search(r'\d+', campaign_name)
            req_id = match.group() if match else None
            print(req_id)

            if not req_id:
                raise Exception('No campaign number found in campaign name')

            
            contact_result = query(
                """SELECT first_name, last_name, custom_attributes 
                   FROM sms_platform.contacts 
                   WHERE phone_number = %s LIMIT 1""",
                [from_number]
            )
            
            first_name = None
            last_name = None
            custom_attribute = {}
            if contact_result:
                contact = contact_result[0]
                first_name = contact[0]
                last_name = contact[1]
                attr = contact[2]
                if isinstance(attr, str):
                    try:
                        custom_attribute = json.loads(attr)
                    except:
                        custom_attribute = {}
                elif isinstance(attr, dict):
                    custom_attribute = attr
            
            print("Sending to the chatbot webhook")

            try:
                headers = {
                    'Content-Type': 'application/json' # optional but often useful for tracking
                }
                requests.post(
                    'http://3.144.222.211:5001/webhook',
                    json={
                        'sender': from_number,
                        'to': to_number,
                        'message': body,
                        'metadata': {
                            'reqId': req_id,
                            'campaignId': campaign_id,
                            'conversationId': conversation_id,
                            'messageSid': message_sid,
                            'first_name': first_name,
                            'last_name': last_name,
                            'custom_attribute': custom_attribute
                        }
                    },
                    headers = headers
                )
            except Exception as e:
                logging.error(f"Failed sending to chatbot webhook: {e}")

        # Default: No reply needed, return empty TwiML
        twiml_response = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        return Response(twiml_response, mimetype='text/xml')

    except Exception as error:
        import traceback
        logging.error('❌ Error processing incoming message: %s', str(error))
        logging.error(traceback.format_exc())
        twiml_response = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        return Response(twiml_response, status=500, mimetype='text/xml')


@message_routes.route('/conversations', methods=['GET'])
def get_conversations():
    try:
        # Query to fetch latest 20 conversations with last message and user email
        result = query(
            """
            SELECT 
                c.id, 
                c.contact_phone, 
                c.status, 
                c.last_message_at,
                m.body AS last_message, 
                m.sent_at, 
                m.direction, 
                u.email AS user_email
            FROM sms_platform.conversations c
            LEFT JOIN LATERAL (
                SELECT body, sent_at, direction, user_id
                FROM sms_platform.messages
                WHERE conversation_id = c.id
                ORDER BY sent_at DESC
                LIMIT 1
            ) m ON true
            LEFT JOIN sms_platform.users u ON m.user_id = u.id
            ORDER BY c.last_message_at DESC
            """
        )
        
        conversations = []
        for row in result.get('rows', []):
            conversations.append({
                'id': row.get('id'),
                'contact_phone': row.get('contact_phone'),
                'status': row.get('status'),
                'last_message_at': row.get('last_message_at').isoformat() if row.get('last_message_at') else None,
                'last_message': row.get('last_message'),
                'sent_at': row.get('sent_at').isoformat() if row.get('sent_at') else None,
                'direction': row.get('direction'),
                'user_email': row.get('user_email')
            })
            
        return jsonify(conversations), 200

    except Exception as err:
        logging.error('❌ Error fetching conversations: %s', str(err))
        return jsonify({'error': 'Failed to fetch conversations'}), 500

@message_routes.route('/conversations/<conversation_id>/messages', methods=['GET'])
def get_conversation_messages(conversation_id):
    try:
        result = query(
            """
            SELECT 
                m.id,
                m.body,
                m.sent_at,
                m.direction,
                m.from_number,
                m.to_number,
                m.status,
                u.email AS user_email
            FROM sms_platform.messages m
            LEFT JOIN sms_platform.users u ON m.user_id = u.id
            WHERE m.conversation_id = %s
            ORDER BY m.sent_at ASC
            """,
            [conversation_id]
        )

        formatted_messages = []
        for row in result.get('rows', []):
            sent_at = row.get('sent_at')
            formatted_messages.append({
                'id': row.get('id'),
                'body': row.get('body'),
                'sent_at': sent_at.isoformat() if sent_at else None,
                'direction': 'outgoing' if row.get('direction') == 'outbound' else 'incoming',
                'from_number': row.get('from_number'),
                'to_number': row.get('to_number'),
                'status': row.get('status'),
                'user_email': row.get('user_email')
            })

        return jsonify(formatted_messages), 200

    except Exception as err:
        logging.error('❌ Error fetching conversation messages: %s', str(err))
        return jsonify({'error': 'Failed to fetch messages'}), 500

@message_routes.route('/reply', methods=['POST'])
def reply():
    data = request.get_json()
    to = data.get('to')
    from_number = data.get('from')
    body = data.get('body')
    user_id = data.get('user_id')

    logging.info(f"Received reply request: to={to}, from={from_number}, body={body}, user_id={user_id}")

    if not to or not body:
        logging.warning("'to' or 'body' missing in request")
        return jsonify({'error': "'to' and 'body' are required"}), 400

    try:
        now_cst = datetime.now(ZoneInfo("America/Chicago"))
        logging.info(f"Current CST time: {now_cst}")

        # Send message via Twilio
        sent_msg = twilio_client.messages.create(
            to=to,
            from_=from_number,
            body=body,
        )
        logging.info(f"Twilio message sent: SID={sent_msg.sid}, status={sent_msg.status}")

        # Lookup existing conversation
        conv_result = query(
            """SELECT id FROM sms_platform.conversations 
               WHERE contact_phone = %s ORDER BY last_message_at DESC LIMIT 1""",
            [to]
        )
        logging.info(f"Conversation query result: {conv_result}")

        conversation_id = conv_result[0][0] if conv_result else None
        logging.info(f"Using conversation_id: {conversation_id}")

        if not conversation_id:
            new_conv = query(
                """INSERT INTO sms_platform.conversations 
                   (contact_phone, status, last_message_at)
                   VALUES (%s, %s, %s) RETURNING id""",
                [to, 'active', now_cst]
            )
            logging.info(f"New conversation created: {new_conv}")
            conversation_id = new_conv[0][0]

        # Insert the sent message record
        result = query(
            """INSERT INTO sms_platform.messages 
               (twilio_sid, direction, status, body, from_number, to_number, sent_at, user_id, conversation_id)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            [
                sent_msg.sid,
                'outbound',
                sent_msg.status,
                body,
                from_number,
                to,
                now_cst,
                user_id,
                conversation_id,
            ]
        )
        logging.info(f"Message inserted into DB with result: {result}")

        # Update conversation's last_message_at timestamp
        update_result = query(
            """UPDATE sms_platform.conversations 
               SET last_message_at = %s 
               WHERE id = %s""",
            [now_cst, conversation_id]
        )
        logging.info(f"Conversation last_message_at updated: {update_result}")

        return jsonify({
            'message': 'Message sent successfully',
            'sid': sent_msg.sid
        })
    except Exception as err:
        logging.error('❌ Error sending message: %s', str(err), exc_info=True)
        return jsonify({'error': 'Failed to send message'}), 500

@message_routes.route('/mark-conversation-read', methods=['POST'])
def mark_conversation_read():
    try:
        data = request.get_json()
        twilio_number = data.get('twilio_number')
        contact_phone = data.get('contact_phone')

        if not twilio_number or not contact_phone:
            return jsonify({'error': 'twilio_number and contact_phone are required'}), 400

        rowcount = query(
            """UPDATE sms_platform.conversations
               SET has_unread = false
               WHERE twilio_number = %s AND contact_phone = %s""",
            [twilio_number, contact_phone]
        )

        logging.info("Marking as read for: %s, %s", twilio_number, contact_phone)

        if rowcount == 0:
            return jsonify({'error': 'Conversation not found'}), 404

        # Now fetch updated conversation to return
        result = query(
            """SELECT id, contact_phone, status, last_message_at, twilio_number, has_unread
               FROM sms_platform.conversations
               WHERE twilio_number = %s AND contact_phone = %s""",
            [twilio_number, contact_phone]
        )
        
        if not result:
            return jsonify({'error': 'Conversation not found after update'}), 404

        (conv_id, conv_contact_phone, conv_status, conv_last_message_at, conv_twilio_number, conv_has_unread) = result[0]

        return jsonify({
            'success': True,
            'conversation': {
                'id': conv_id,
                'contact_phone': conv_contact_phone,
                'status': conv_status,
                'last_message_at': conv_last_message_at,
                'twilio_number': conv_twilio_number,
                'has_unread': conv_has_unread
            }
        })
    except Exception as err:
        logging.error('Error marking conversation as read: %s', str(err))
        return jsonify({'error': 'Failed to mark conversation as read'}), 500


@message_routes.route('/test-db', methods=['GET'])
def test_db():
    try:
        result = query("SELECT version()")
        return jsonify({
            'status': 'success',
            'postgres_version': result['rows'][0]['version']
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'connection_details': {
                'host': os.getenv('DB_HOST'),
                'port': os.getenv('DB_PORT'),
                'user': os.getenv('DB_USER'),
                'database': os.getenv('DB_NAME')
            }
        }), 500