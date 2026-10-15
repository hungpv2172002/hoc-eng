import assert from 'node:assert/strict';
import { installDurableDuel, emptyDuelStore } from '../server/durableDuel.ts';

const user = { id: 'user-1', email: 'learner@example.com', user_metadata: { name: 'Ignored client name' } };
const profile = { full_name: 'Verified Learner', email: user.email, avatar_url: 'https://example.com/avatar.png' };
const row = { version: 0, state: emptyDuelStore() };
const admin = {
  auth: { getUser: async token => token === 'valid-token'
    ? { data: { user }, error: null }
    : { data: { user: null }, error: new Error('invalid token') } },
  from(table) {
    const query = {
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data: profile, error: null }),
      single: async () => table === 'duel_state_store'
        ? { data: row, error: null }
        : { data: null, error: new Error('unexpected table') },
    };
    return query;
  },
  rpc: async (_name, args) => {
    row.version++;
    row.state = args.next_state;
    return { data: true, error: null };
  },
};

let route;
installDurableDuel({ post(path, handler) { assert.equal(path, '/api/duel/sync'); route = handler; } }, admin, () => []);

async function request(command, token = 'valid-token') {
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await route({
    headers: { authorization: token ? `Bearer ${token}` : undefined },
    body: { sessionToken: 'a'.repeat(64), command, cursor: 0 },
  }, response);
  return response;
}

const registered = await request({ type: 'register_lobby', requestId: 'register-1', player: { id: 'forged', name: 'Fake' } });
assert.equal(registered.statusCode, 200);
assert.equal(registered.body.playerId, user.id);
assert.equal(Object.values(row.state.sessions)[0].player.name, profile.full_name);

const joined = await request({ type: 'join_room', questionCount: 5 });
assert.equal(joined.statusCode, 200);
assert.ok(joined.body.state?.roomId);
assert.equal(joined.body.state.players[user.id].name, profile.full_name);

const restored = await request({ type: 'poll' }, null);
assert.equal(restored.statusCode, 200);
assert.equal(restored.body.state.roomId, joined.body.state.roomId);

const unauthorized = await request({ type: 'register_lobby' }, 'invalid-token');
assert.equal(unauthorized.statusCode, 401);

console.log('PASS: authenticated duel registration, server-derived player identity, room join and session restore.');
