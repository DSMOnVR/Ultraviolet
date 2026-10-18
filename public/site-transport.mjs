// HTTP uses this site's server connection; WebSockets use the optional Wisp relay.
export default class SiteTransport {
  ready = false;
  constructor(options) { this.options = options; }
  async init() { this.ready = true; }
  async request(remote, method, body, headers, signal) {
    if (body instanceof ReadableStream) body = await new Response(body).arrayBuffer();
    const response = await fetch('/.netlify/functions/proxy?url=' + encodeURIComponent(remote.href), {
      method: 'POST', headers: {
        'x-uv-method': method,
        'x-uv-headers': encodeURIComponent(JSON.stringify(headers)),
      }, body: ['GET', 'HEAD'].includes(method) ? undefined : body, signal,
    });
    if (!response.ok) throw new Error(await response.text());
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    let remainder;
    while (true) {
      const { value, done } = await reader.read();
      if (done) throw new Error('The site connection returned an incomplete response.');
      const newline = value.indexOf(10);
      const part = newline < 0 ? value : value.subarray(0, newline);
      chunks.push(part); size += part.length;
      if (size > 262144) { await reader.cancel(); throw new Error('Destination headers are too large.'); }
      if (newline >= 0) { remainder = value.subarray(newline + 1); break; }
    }
    const metadata = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { metadata.set(chunk, offset); offset += chunk.length; }
    const result = JSON.parse(new TextDecoder().decode(metadata));
    result.body = new ReadableStream({
      start(controller) { if (remainder.length) controller.enqueue(remainder); },
      async pull(controller) {
        try {
          const { value, done } = await reader.read();
          if (done) controller.close(); else controller.enqueue(value);
        } catch (error) { controller.error(error); }
      },
      cancel(reason) { return reader.cancel(reason); },
    });
    return result;
  }
  connect(...args) {
    let connection;
    const pending = (async () => {
      const { default: Epoxy } = await import('/epoxy/index.mjs');
      const transport = new Epoxy(this.options);
      await transport.init();
      connection = transport.connect(...args);
    })();
    pending.catch(error => args[6](String(error)));
    return [data => pending.then(() => connection[0](data)), (code, reason) => pending.then(() => connection[1](code, reason))];
  }
  async meta() {}
}
