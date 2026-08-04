exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  if (!gasUrl) {
    return json(500, { ok: false, error: 'Missing GAS_WEB_APP_URL' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid JSON request body' });
  }

  if (process.env.GAS_WEB_APP_TOKEN && !payload.token) {
    payload.token = process.env.GAS_WEB_APP_TOKEN;
  }

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json;charset=utf-8',
        'Cache-Control': 'no-store',
      },
      body: text,
    };
  } catch (error) {
    return json(502, { ok: false, error: error.message || 'GAS proxy failed' });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

