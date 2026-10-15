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
let roomCleared = false;
let sessionToken;
const fetcher = async (_url, options) => {
  attempts++;
  const body = JSON.parse(options.body);
  commands.push(body.command.type);
  sessionToken ||= body.sessionToken;
  assert.equal(body.sessionToken, sessionToken);
  if (attempts === 1) {
    return new Response(JSON.stringify({ error: 'Kho đấu 1vs1 chưa được cài đặt. Hãy chạy migration.' }), { status: 503 });
  }
  if (attempts === 2) {
    return new Response(JSON.stringify({
      players: [], events: [], cursor: 0,
      state: { roomId: 'DUEL-1234', status: 'waiting', players: {} },
      serverNow: Date.now(),
    }), { status: 200 });
  }
  if (attempts <= 5) throw new Error('temporary network failure');
  if (attempts === 6) {
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
  if (message.type === 'room_cleared') roomCleared = true;
  if (message.type === 'room_state') connection.send(JSON.stringify({ type: 'poll' }));
};
connection.onerror = () => {};

const deadline = Date.now() + 2000;
while ((!recovered || !roomCleared) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));

assert.equal(attempts, 7);
assert.equal(recovered, true);
assert.equal(connection.readyState, 1);
assert.deepEqual(commands, ['register_lobby', 'register_lobby', 'poll', 'poll', 'poll', 'poll', 'register_lobby']);
assert.ok(messages.some(message => message.type === 'error' && message.connectionFailure && message.message.includes('Hãy chạy migration.')));
assert.ok(messages.some(message => message.type === 'connection_restored'));
assert.ok(messages.some(message => message.type === 'room_cleared'), 'a room removed during disconnect must clear stale UI state');
connection.close();

let businessAttempts = 0;
let actionSent = false;
let businessErrorSeen = false;
let connectionErrorCount = 0;
let polledAfterBusinessError = false;
const businessConnection = new HttpDuelConnection('business-error-player', async () => {
  businessAttempts++;
  if (businessAttempts === 2) {
    return new Response(JSON.stringify({ error: 'Phòng đã đầy.' }), { status: 400 });
  }
  return new Response(JSON.stringify({ players: [], events: [], cursor: 0, state: null, serverNow: Date.now() }), { status: 200 });
}, 5);
businessConnection.onopen = () => businessConnection.send(JSON.stringify({ type: 'register_lobby' }));
businessConnection.onerror = () => { connectionErrorCount++; };
businessConnection.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.type === 'lobby_state' && !actionSent) {
    actionSent = true;
    businessConnection.send(JSON.stringify({ type: 'join_room', roomId: 'MISSING' }));
  } else if (message.type === 'error' && message.message === 'Phòng đã đầy.') {
    businessErrorSeen = true;
  } else if (message.type === 'lobby_state' && businessErrorSeen) {
    polledAfterBusinessError = true;
  }
};

const businessDeadline = Date.now() + 1500;
while (!polledAfterBusinessError && Date.now() < businessDeadline) await new Promise(resolve => setTimeout(resolve, 10));
assert.equal(businessErrorSeen, true);
assert.equal(connectionErrorCount, 0, 'a user/action validation error must not mark transport disconnected');
assert.equal(businessConnection.readyState, 1);
assert.ok(businessAttempts >= 3, 'transport should continue polling after the action error');
businessConnection.close();

let missingRouteAttempts = 0;
let missingRouteError = '';
const missingRouteConnection = new HttpDuelConnection('missing-route-player', async () => {
  missingRouteAttempts++;
  return new Response('<!doctype html><title>Not Found</title>', { status: 404, headers: { 'Content-Type': 'text/html' } });
}, 5);
missingRouteConnection.onopen = () => missingRouteConnection.send(JSON.stringify({ type: 'register_lobby' }));
missingRouteConnection.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.type === 'error') missingRouteError = message.message;
};
const routeDeadline = Date.now() + 500;
while (!missingRouteError && Date.now() < routeDeadline) await new Promise(resolve => setTimeout(resolve, 10));
assert.match(missingRouteError, /HTTP 404.*route \/api\/duel\/sync/);
assert.equal(missingRouteConnection.readyState, 1, 'missing API route should keep retrying');
missingRouteConnection.close();

console.log('PASS: duel transport retains recovery details, distinguishes missing routes, and stays connected after business validation errors.');
