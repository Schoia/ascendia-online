// Multiplayer client for Ascendia Online.
// Exposes window.claude.use('room') with the same shape the game expects:
// peers(), onPeers(), on(), emit(), presence(), connected(), onConnection().
(function () {
  'use strict';
  if (window.claude && window.claude.use) return; // inside claude.ai the platform provides multiplayer
  const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  let ws = null, myId = null, retry = 0, isConnected = false;
  const peers = new Map();            // id -> { presence, updatedAt }
  let myPresence = {};
  let presenceDirty = false;
  const peerListeners = new Set(), connListeners = new Set(), topicListeners = new Map();
  let snapshot = Object.freeze([]);

  function buildSnapshot() {
    const list = [];
    if (myId) list.push(Object.freeze({ peer: myId, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({ ...myPresence }), updatedAt: Date.now() }));
    for (const [id, p] of peers) list.push(Object.freeze({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: Object.freeze({ ...p.presence }), updatedAt: p.updatedAt }));
    snapshot = Object.freeze(list);
    return snapshot;
  }
  function emitPeers(joined, left, updated) {
    const ch = { peers: buildSnapshot(), joined: joined || [], left: left || [], updated: updated || [] };
    for (const fn of peerListeners) { try { fn(ch); } catch (e) { console.error(e); } }
  }
  function setConnected(v) {
    if (isConnected === v) return;
    isConnected = v;
    for (const fn of connListeners) { try { fn(v); } catch (e) { console.error(e); } }
  }
  function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

  function connect() {
    try { ws = new WebSocket(url); } catch (e) { scheduleReconnect(); return; }
    ws.onopen = () => { retry = 0; };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === 'welcome') {
        myId = m.id; peers.clear();
        for (const p of m.peers) peers.set(p.id, { presence: p.p || {}, updatedAt: Date.now() });
        setConnected(true);
        send({ t: 'p', p: myPresence });
        emitPeers(snapshot.slice ? buildSnapshot() : [], [], []);
      } else if (m.t === 'join') {
        peers.set(m.id, { presence: {}, updatedAt: Date.now() });
        emitPeers([{ peer: m.id }], [], []);
      } else if (m.t === 'leave') {
        if (peers.delete(m.id)) emitPeers([], [{ peer: m.id }], []);
      } else if (m.t === 'p') {
        const p = peers.get(m.id) || { presence: {} };
        p.presence = m.p || {}; p.updatedAt = Date.now(); peers.set(m.id, p);
        buildSnapshot(); // cheap; onPeers only fires on join/leave to keep it light
      } else if (m.t === 'e') {
        const set = topicListeners.get(m.topic);
        if (set) for (const fn of set) { try { fn({ topic: m.topic, data: m.data, peer: m.id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false }); } catch (e) { console.error(e); } }
      }
    };
    ws.onclose = () => { setConnected(false); peers.clear(); emitPeers([], [], []); scheduleReconnect(); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  function scheduleReconnect() { retry++; setTimeout(connect, Math.min(10000, 500 * Math.pow(1.7, retry))); }

  // Presence is sent at most 15 times a second.
  setInterval(() => { if (presenceDirty && isConnected) { presenceDirty = false; send({ t: 'p', p: myPresence }); } }, 66);

  const room = {
    peers: () => snapshot,
    onPeers(fn) { peerListeners.add(fn); Promise.resolve().then(() => fn({ peers: buildSnapshot(), joined: snapshot, left: [], updated: [] })); return () => peerListeners.delete(fn); },
    onConnection(fn) { connListeners.add(fn); Promise.resolve().then(() => fn(isConnected)); return () => connListeners.delete(fn); },
    connected: () => isConnected,
    on(topic, fn) { if (!topicListeners.has(topic)) topicListeners.set(topic, new Set()); topicListeners.get(topic).add(fn); return () => topicListeners.get(topic).delete(fn); },
    emit(topic, data) { send({ t: 'e', topic, data }); return Promise.resolve(); },
    presence(patch) {
      for (const k in patch) { if (patch[k] === null) delete myPresence[k]; else myPresence[k] = patch[k]; }
      presenceDirty = true; return Promise.resolve();
    }
  };

  connect();
  window.claude = { use: async name => (name === 'room' ? room : null) };
})();
