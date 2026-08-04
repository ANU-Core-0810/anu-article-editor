export async function onRequestPost(context) {
  const { request, env } = context;
  const gasUrl = env.GAS_WEB_APP_URL;

  if (!gasUrl) {
    return json(500, { ok: false, error: 'Missing GAS_WEB_APP_URL' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid JSON request body' });
  }

  if (env.GAS_WEB_APP_TOKEN && !payload.token) {
    payload.token = env.GAS_WEB_APP_TOKEN;
  }

  try {
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json;charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return json(502, { ok: false, error: error.message || 'GAS proxy failed' });
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export function onRequest() {
  return json(405, { ok: false, error: 'Method not allowed' });
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json;charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
