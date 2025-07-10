from flask import Flask, jsonify, Blueprint
from datetime import datetime
import os
from dotenv import load_dotenv
from flask_cors import CORS
from functools import wraps
import logging
import serverless_wsgi

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# ✅ Enable CORS globally (applies in AWS Lambda too)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Disable strict slashes for consistency with original behavior
app.url_map.strict_slashes = False

# Database pool
from db.connection import get_pool, test_connection
db_pool = get_pool()

# Initialize database pools for routes
from routes.campaign import init_db_pool as init_campaign_pool
from routes.status import init_db_pool as init_status_pool
from routes.twilionumber import init_db_pool as init_twilio_pool
from routes.inbox import init_db_pool as init_inbox_pool

init_campaign_pool(db_pool)
init_twilio_pool(db_pool)
init_inbox_pool(db_pool)
init_status_pool(db_pool)

# Import route blueprints
from routes.message import message_routes
from routes.campaign import campaign_routes, start_scheduler
from routes.status import status_routes
from routes.auth import auth_routes
from routes.user import user_routes
from routes.twilionumber import twilionumber_routes
from routes.inbox import inbox_routes

# Register routes
app.register_blueprint(message_routes, url_prefix='/api/message')
app.register_blueprint(campaign_routes, url_prefix='/api/campaign')
app.register_blueprint(status_routes, url_prefix='/api/status')
app.register_blueprint(user_routes, url_prefix='/api/user')
app.register_blueprint(twilionumber_routes, url_prefix='/api/twilionumber')
app.register_blueprint(inbox_routes, url_prefix='/api')
app.register_blueprint(auth_routes, url_prefix='/api/auth')

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }), 200

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ✅ Lambda entry point
def lambda_handler(event, context):
    # EventBridge: Scheduled background job
    if event.get("source") == "aws.events":
        from routes.campaign import handler as campaign_handler
        return campaign_handler(event, context)

    # Function URL or API Gateway HTTP request
    response = serverless_wsgi.handle_request(app, event, context)

    # Manually add CORS headers for Function URL (API Gateway usually handles this via config)
    if 'headers' in response:
        response['headers']['Access-Control-Allow-Origin'] = '*'
        response['headers']['Access-Control-Allow-Headers'] = '*'
        response['headers']['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS,PUT,DELETE'

    return response


# Local development entry point
if __name__ == '__main__':
    start_scheduler()
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5002)),
        threaded=True
    )
