import serverlessExpress from '@vendia/serverless-express';
import app from './server.js';

// Wrap once and reuse across invocations
const serverHandler = serverlessExpress({ app });

export const handler = async (event, context) => {
  if (event.path === '/health' && event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'OK',
        timestamp: new Date().toISOString(),
      }),
    };
  }

  return serverHandler(event, context);
};
