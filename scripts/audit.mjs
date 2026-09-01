const port = process.argv[2] || '9223';
const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
const target = targets.find((item) => item.type === 'page' && item.url.startsWith('http://127.0.0.1:4173'));
if (!target) throw new Error('Preview tab not found');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let id = 0;
const pending = new Map();
const errors = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry.level)) {
    errors.push(`${message.params.entry.text}${message.params.entry.url ? ` — ${message.params.entry.url}` : ''}`);
  }
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});

const call = (method, params = {}) => new Promise((resolve) => {
  id += 1;
  pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});

await call('Runtime.enable');
await call('Log.enable');

if (process.argv[3] === 'mobile') {
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
}
await call('Page.reload');
await new Promise((resolve) => setTimeout(resolve, 1500));

const result = await call('Runtime.evaluate', {
  returnByValue: true,
  expression: `JSON.stringify({
    title: document.title,
    width: innerWidth,
    height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    canvas: !!document.querySelector('#orb-canvas'),
    webgl: !!document.querySelector('#orb-canvas')?.getContext('webgl2'),
    overflows: Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1 || el.getBoundingClientRect().left < -1)
      .slice(0, 20)
      .map((el) => ({ tag: el.tagName, className: el.className, left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right) }))
  })`,
});

console.log({ ...JSON.parse(result.result.result.value), errors });
socket.close();
