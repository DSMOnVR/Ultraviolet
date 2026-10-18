/* global BareMux, __uv$config */
const form = document.querySelector('#browse-form');
const address = document.querySelector('#address');
const button = document.querySelector('#browse');
const status = document.querySelector('#status');
const relay = document.querySelector('#relay');

function destination(value) {
  const input = value.trim();
  if (!input) throw new Error('Enter a website address or search term.');
  if (!/\s/.test(input) && /^(localhost|(?:[\w-]+\.)+[\w-]+)(?::\d+)?(?:[/?#]|$)/i.test(input)) {
    return new URL('https://' + input).href;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(input)) {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Only HTTP and HTTPS websites are supported.');
    }
    if (url.username || url.password) throw new Error('Use a URL without a username or password.');
    return url.href;
  }
  return 'https://www.google.com/search?q=' + encodeURIComponent(input);
}

function withTimeout(promise, message, milliseconds = 20000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

function checkRelay(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error('The relay did not respond. Try another Wisp relay in Connection settings.'));
    }, 10000);
    const fail = () => {
      clearTimeout(timer);
      reject(new Error('Could not connect to the relay. Try again or change the Wisp relay in Connection settings.'));
    };
    socket.onopen = () => {
      clearTimeout(timer);
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
      resolve();
    };
    socket.onerror = fail;
    socket.onclose = fail;
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  status.classList.remove('error');
  try {
    const target = destination(address.value);
    if (!window.isSecureContext || !('serviceWorker' in navigator)) {
      throw new Error('Open this site over HTTPS in a browser with service worker support.');
    }
    if (!('SharedWorker' in window) || !window.crossOriginIsolated) {
      throw new Error('This browser cannot run the proxy. Use a current desktop browser with SharedWorker support and cross-origin isolation.');
    }
    const wisp = new URL(relay.value.trim());
    if (wisp.protocol !== 'wss:') throw new Error('Enter a secure Wisp relay URL starting with wss://.');
    if (wisp.username || wisp.password) throw new Error('Use a relay URL without credentials.');
    button.disabled = true;
    status.textContent = 'Connecting to the relay…';
    await checkRelay(wisp.href);
    status.textContent = 'Preparing Ultraviolet…';
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/service/' });
    await withTimeout(new Promise((resolve, reject) => {
      if (registration.active) return resolve();
      const worker = registration.installing || registration.waiting;
      if (!worker) return reject(new Error('Service worker installation failed. Reload and try again.'));
      const update = () => {
        if (worker.state === 'activated') { worker.removeEventListener('statechange', update); resolve(); }
        if (worker.state === 'redundant') { worker.removeEventListener('statechange', update); reject(new Error('Service worker installation failed. Reload and try again.')); }
      };
      worker.addEventListener('statechange', update);
      update();
    }), 'The service worker did not start. Reload and try again.');
    const connection = new BareMux.BareMuxConnection('/baremux/worker.js');
    await withTimeout(connection.setTransport('/epoxy/index.mjs', [{ wisp: wisp.href }]), 'The proxy transport did not start. Reload and try again.');
    status.textContent = 'Opening website…';
    window.location.assign(__uv$config.prefix + __uv$config.encodeUrl(target));
  } catch (error) {
    status.classList.add('error');
    status.textContent = error.message || 'The proxy could not start. Reload and try again.';
    button.disabled = false;
  }
});

document.querySelectorAll('[data-url]').forEach((link) => {
  link.addEventListener('click', () => {
    if (button.disabled) return;
    address.value = link.dataset.url;
    form.requestSubmit();
  });
});
