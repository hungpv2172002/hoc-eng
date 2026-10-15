import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20261015093000_durable_duel_store.sql', import.meta.url), 'utf8');
const seededStates = [...sql.matchAll(/'(\{"sessions":\{\},"rooms":\{\},"invites":\{\}\})'::jsonb/g)];
assert.equal(seededStates.length, 2, 'table default and initial row must use the same valid state');
for (const [, state] of seededStates) {
  assert.deepEqual(JSON.parse(state), { sessions: {}, rooms: {}, invites: {} });
}
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.duel_compare_and_swap\(bigint, jsonb\) TO service_role/);
assert.match(sql, /REVOKE ALL ON TABLE public\.duel_state_store FROM PUBLIC, anon, authenticated/);

console.log('PASS: duel state migration seeds valid state and keeps access server-only.');
