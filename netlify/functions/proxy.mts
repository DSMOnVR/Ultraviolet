import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';
import { createGunzip, createInflate, createBrotliDecompress } from 'node:zlib';

// Never allow the public proxy to reach local services or cloud metadata.
function publicAddress(address: string) {
  if (address.includes(':')) {
    return /^2[0-9a-f]{3}:/i.test(address) && !/^2001:(?:db8|0):/i.test(address);
  }
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)));
}

export default async (request: Request) => {
  const origin = new URL(request.url).origin;
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (request.headers.get('origin') && request.headers.get('origin') !== origin) {
    return new Response('Forbidden', { status: 403 });
  }
  try {
    const target = new URL(new URL(request.url).searchParams.get('url') || '');
    if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password ||
      (target.port && !['80', '443'].includes(target.port)) || target.origin === origin) {
      return new Response('Unsupported destination', { status: 400 });
    }
    const hostname = target.hostname.replace(/^\[|\]$/g, '');
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) {
      return new Response('Destination is not public', { status: 403 });
    }
    const method = request.headers.get('x-uv-method') || 'GET';
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) {
      return new Response('Unsupported method', { status: 400 });
    }
    const supplied = JSON.parse(decodeURIComponent(request.headers.get('x-uv-headers') || '%7B%7D'));
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(supplied)) {
      if (!/^(host|connection|content-length|transfer-encoding|upgrade|proxy-.*|accept-encoding|expect|trailer|te)$/i.test(name)) {
        headers[name] = String(value);
      }
    }
    headers['accept-encoding'] = 'identity';
    const body = ['GET', 'HEAD'].includes(method) ? undefined : Buffer.from(await request.arrayBuffer());
    const upstream = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const connect = target.protocol === 'https:' ? https.request : http.request;
      const outgoing = connect(target, {
        method, headers, autoSelectFamily: false,
        // Pin the validated address so a second DNS lookup cannot reach a private IP.
        lookup: (_host, _options, callback) => callback(null, addresses[0].address, addresses[0].family),
      }, resolve);
      outgoing.setTimeout(25000, () => outgoing.destroy(new Error('Destination timed out')));
      outgoing.on('error', reject);
      request.signal.addEventListener('abort', () => outgoing.destroy(), { once: true });
      outgoing.end(body);
    });
    const rawHeaders: Record<string, string | string[]> = {};
    for (let i = 0; i < upstream.rawHeaders.length; i += 2) {
      const name = upstream.rawHeaders[i].toLowerCase();
      const value = upstream.rawHeaders[i + 1];
      const previous = rawHeaders[name];
      rawHeaders[name] = previous === undefined ? value : [...(Array.isArray(previous) ? previous : [previous]), value];
    }
    const encoding = upstream.headers['content-encoding'];
    const decoder = encoding === 'gzip' ? createGunzip() : encoding === 'deflate' ? createInflate() : encoding === 'br' ? createBrotliDecompress() : null;
    const content = decoder ? upstream.pipe(decoder) : upstream;
    if (decoder) {
      delete rawHeaders['content-encoding'];
      delete rawHeaders['content-length'];
      upstream.on('error', error => decoder.destroy(error));
    }
    // A framed stream preserves redirects, cookies, binary bodies and upstream status
    // without letting them affect the browser's request to this function.
    const metadata = JSON.stringify({ status: upstream.statusCode, statusText: upstream.statusMessage, headers: rawHeaders }) + '\n';
    const stream = Readable.from((async function* () {
      yield Buffer.from(metadata);
      for await (const chunk of content) yield chunk;
    })());
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' },
    });
  } catch {
    return new Response('The site connection could not reach this destination. Retry or select Wisp in Connection settings.', { status: 502 });
  }
};
