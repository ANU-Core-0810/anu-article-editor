export async function onRequestPost(context) {
  const { request, env } = context;
  const bucket = env.ANU_ARTICLE_BUCKET;

  if (!bucket) {
    return json(500, { ok: false, error: 'Missing ANU_ARTICLE_BUCKET R2 binding' });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (error) {
    return json(400, { ok: false, error: 'Invalid multipart form data' });
  }

  const requiredToken = env.R2_UPLOAD_TOKEN || env.GAS_WEB_APP_TOKEN || '';
  const requestToken = formData.get('token') || bearerToken(request.headers.get('authorization'));
  if (requiredToken && requestToken !== requiredToken) {
    return json(401, { ok: false, error: 'Invalid upload token' });
  }

  const file = formData.get('file');
  const key = normalizeObjectKey(formData.get('key'));
  if (!file || typeof file === 'string') {
    return json(400, { ok: false, error: 'Missing upload file' });
  }
  if (!key) {
    return json(400, { ok: false, error: 'Missing upload key' });
  }

  try {
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    const path = `/${key}`;
    const publicBase = (env.ARTICLE_IMAGE_BASE || 'https://pub-14eaf4c4a9324927bf2879a272de972a.r2.dev').replace(/\/+$/, '');
    return json(200, {
      ok: true,
      key,
      path,
      publicUrl: `${publicBase}${path}`,
    });
  } catch (error) {
    return json(502, { ok: false, error: error.message || 'R2 upload failed' });
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

function normalizeObjectKey(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
    .replace(/[^a-zA-Z0-9._/-]/g, '-')
    .replace(/(?:^|\/)\.\.(?:\/|$)/g, '');
}

function bearerToken(value) {
  const match = String(value || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
