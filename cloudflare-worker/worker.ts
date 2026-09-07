/**
 * Cloudflare Worker for Presigned R2 Media Uploads
 * 
 * Instructions:
 * 1. Deploy this worker to your Cloudflare account (via Wrangler or Cloudflare Dashboard).
 * 2. Bind your R2 bucket to this worker as `BUCKET` in wrangler.toml or Dashboard settings.
 * 3. Point the client app's presign endpoint to this Worker URL, or use the integrated /api/get-presigned-url route.
 * 
 * Billing:
 * All uploads and storage will be billed directly to your Cloudflare account.
 * Cloudflare R2 includes 10 GB/month free storage and zero egress bandwidth fees.
 */

export interface R2Bucket {
  put(key: string, value: any, options?: any): Promise<any>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
}

export interface Env {
  BUCKET: R2Bucket;
  AUTH_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers for client-to-worker calls
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-file-name, x-file-type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Direct Edge Upload to R2: PUT /upload/:filename
    if (request.method === 'PUT' && url.pathname.startsWith('/upload/')) {
      const filename = url.pathname.replace('/upload/', '');
      const cleanKey = `media/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

      // 7. Long-lived Cache-Control headers on uploaded R2 objects so Cloudflare's CDN edge cache serves repeat views
      await env.BUCKET.put(cleanKey, request.body, {
        httpMetadata: {
          contentType,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      const publicUrl = `${url.origin}/media/${cleanKey}`;
      return new Response(JSON.stringify({ success: true, url: publicUrl, key: cleanKey }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Serve public files through Cloudflare Edge CDN: GET /media/:key
    if (request.method === 'GET' && url.pathname.startsWith('/media/')) {
      const key = url.pathname.replace('/media/', '');
      const object = await env.BUCKET.get(key);

      if (!object) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

      return new Response(object.body, { headers });
    }

    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
