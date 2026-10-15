import assert from 'node:assert/strict';
import { HttpDuelConnection } from '../src/lib/httpDuelConnection.ts';

const values = new Map();
globalThis.sessionStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

let attempts = 0;
let recovered = false;
const messages = [];
const commands = [];
let sessionToken;
const fetcher = async (_url, options) => {
  attempts++;
  const body = JSON.parse(options.body);
  commands.push(body.command.type);
  sessionToken ||= body.sessionToken;
  assert.equal(body.sessionToken, sessionToken);
  if (attempts === 1) {
    return new Response(JSON.stringify({
      players: [], events: [], cursor: 0,
      state: { roomId: 'DUEL-1234', status: 'waiting', players: {} },
      serverNow: Date.now(),
    }), { status: 200 });
  }
  if (attempts <= 4) throw new Error('temporary network failure');
  if (attempts === 5) {
    return new Response(JSON.stringify({ error: 'Phiên đấu đã hết hạn. Vui lòng kết nối lại.' }), { status: 400 });
  }
  return new Response(JSON.stringify({ players: [], events: [], cursor: 0, state: null, serverNow: Date.now() }), { status: 200 });
};

const connection = new HttpDuelConnection('test-player', fetcher, 5);
connection.onopen = () => connection.send(JSON.stringify({ type: 'register_lobby', player: { id: 'test-player' } }));
connection.onrecovered = () => { recovered = true; };
connection.onmessage = event => {
  const message = JSON.parse(event.data);
  messages.push(message);
  if (message.type === 'room_state') connection.send(JSON.stringify({ type: 'poll' }));
};
connection.onerror = () => {};

const deadline = Date.now() + 2000;
while (!recovered && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));

assert.equal(attempts, 6);
assert.equal(recovered, true);
assert.equal(connection.readyState, 1);
assert.deepEqual(commands, ['register_lobby', 'poll', 'poll', 'poll', 'poll', 'register_lobby']);
assert.ok(messages.some(message => message.type === 'room_cleared'), 'a room removed during disconnect must clear stale UI state');
connection.close();

console.log('PASS: duel transport retries with the same session and clears a room that expired during disconnection.');
