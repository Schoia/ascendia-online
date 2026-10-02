// Ascendia Online server: serves the game and relays multiplayer messages.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MAX_MSG = 4096;          // bytes per message
const MAX_PER_SEC = 40;        // messages per client per second
const ALLOWED_TOPICS = new Set(['chat', 'boss']);

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  const file = path.normalize(path.join(PUBLIC, url === '/' ? 'index.html' : url));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MSG });
const clients = new Map(); // id -> { ws, presence, count, windowStart }

function broadcast(obj, exceptId) {
  const msg = JSON.stringify(obj);
  for (const [id, c] of clients) if (id !== exceptId && c.ws.readyState === 1) c.ws.send(msg);
}

wss.on('connection', ws => {
  const id = crypto.randomBytes(8).toString('hex');
  const me = { ws, presence: {}, count: 0, windowStart: Date.now(), alive: true };
  ws.send(JSON.stringify({ t: 'welcome', id, peers: [...clients].map(([pid, c]) => ({ id: pid, p: c.presence })) }));
  clients.set(id, me);
  broadcast({ t: 'join', id }, id);

  ws.on('pong', () => { me.alive = true; });
  ws.on('message', raw => {
    const now = Date.now();
    if (now - me.windowStart > 1000) { me.windowStart = now; me.count = 0; }
    if (++me.count > MAX_PER_SEC) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'p' && m.p && typeof m.p === 'object') {
      me.presence = m.p;
      broadcast({ t: 'p', id, p: m.p }, id);
    } else if (m.t === 'e' && ALLOWED_TOPICS.has(m.topic)) {
      broadcast({ t: 'e', id, topic: m.topic, data: m.data }, id);
    }
  });
  ws.on('close', () => { clients.delete(id); broadcast({ t: 'leave', id }); });
});

// Drop dead connections every 30 s.
setInterval(() => {
  for (const [id, c] of clients) {
    if (!c.alive) { c.ws.terminate(); clients.delete(id); broadcast({ t: 'leave', id }); continue; }
    c.alive = false; try { c.ws.ping(); } catch (e) {}
  }
}, 30000);

server.listen(PORT, () => console.log(`Ascendia Online running on port ${PORT}`));
