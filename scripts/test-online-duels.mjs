import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
// Destructive fixtures: run ONLY on an empty, disposable test database.
const postgres = !!process.env.DUEL_TEST_DATABASE_URL;
let db, pool;
if (postgres) {
  const { default: pg } = await import(pathToFileURL(process.env.PG_MODULE).href);
  pool = new pg.Pool({connectionString: process.env.DUEL_TEST_DATABASE_URL, max: 12});
  db = {query: (...args) => pool.query(...args), exec: sql => pool.query(sql), close: () => pool.end()};
} else {
  const { PGlite } = await import(pathToFileURL(process.env.PGLITE_MODULE).href);
  db = new PGlite();
}
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,full_name text,email text,avatar_url text);
CREATE TABLE public.questions(id int PRIMARY KEY,vi text,hints jsonb,answers jsonb,category text);
INSERT INTO auth.users SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid FROM generate_series(1,8) i;
INSERT INTO profiles SELECT id,'Player '||row_number() OVER(),'p'||row_number() OVER()||'@test.local',null FROM auth.users;
INSERT INTO questions SELECT i,'Câu '||i,'[]','["I learn English."]','general' FROM generate_series(1,12)i;
`);
const migration = await readFile(new URL('../supabase/migrations/20260930050000_online_duels.sql',import.meta.url),'utf8');
await db.exec(migration);
await db.exec(migration); // repeatable activation
const uid = n => '00000000-0000-0000-0000-'+String(n).padStart(12,'0');
async function act(n,action,payload={}) {
  const client = postgres ? await pool.connect() : db;
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[n?uid(n):'']);
    const data = (await client.query('SELECT public.duel_action($1,$2::jsonb) AS data',[action,JSON.stringify(payload)])).rows[0].data;
    await client.query('COMMIT');
    return data;
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { if (postgres) client.release(); }
}
const fails = (fn) => assert.rejects(fn);
await fails(()=>act(0,'sync'));
await db.exec('SET ROLE anon');
await fails(()=>db.query("SELECT public.duel_action('sync')"));
await db.exec('RESET ROLE; SET ROLE authenticated');
await fails(()=>db.query('SELECT * FROM duel_private.rooms'));
await db.exec('RESET ROLE');
let a=await act(1,'find_match',{questionCount:3});
assert.equal(a.queued,true);
let b=await act(2,'find_match',{questionCount:3,player:{id:uid(8)}});
a=await act(1,'sync');
assert.equal(a.room.roomId,b.room.roomId);
assert.equal(Object.keys(a.room.players).length,2);
assert.equal(a.room.players[uid(8)],undefined);
assert.equal(a.room.questions.length,3);
assert.equal(a.room.questions[0].answers,undefined);
assert.ok(a.room.questions[0].wordBank.length);
assert.equal((await act(1,'cancel_find_match')).room.roomId,a.room.roomId);
await fails(()=>act(3,'join_room',{roomId:a.room.roomId}));
await db.exec("UPDATE duel_private.rooms SET state=jsonb_set(state,'{startsAt}',to_jsonb(0))");
a=await act(1,'sync');
const matchId=a.room.matchId;
const answer={matchId,questionIndex:0,answer:'  i LEARN English!  '};
let hit=await act(1,'submit_answer',answer);
assert.equal(hit.result.pointsEarned,125);
await fails(()=>act(1,'submit_answer',answer));
assert.equal((await act(2,'submit_answer',answer)).result.pointsEarned,100);
assert.equal((await act(1,'submit_answer',{...answer,questionIndex:1,answer:'wrong'})).room.players[uid(1)].currentQuestionIndex,1);
for(const index of [1,2]) for(const n of [1,2]) await act(n,'skip_question',{matchId,questionIndex:index});
a=await act(1,'sync');
assert.equal(a.room.status,'finished');
assert.equal(a.room.winnerId,uid(1));
await act(1,'request_rematch',{matchId});
b=await act(2,'request_rematch',{matchId});
assert.notEqual(b.room.matchId,matchId);
await fails(()=>act(1,'skip_question',{matchId,questionIndex:0}));
await act(1,'leave_room');
assert.equal((await act(2,'sync')).room.winnerId,uid(2));
await act(2,'leave_room');
a=await act(1,'invite_player',{targetEmail:'p2@test.local',questionCount:3});
const invitation=(await act(2,'sync')).invitations[0];
assert.equal(invitation.roomId,a.room.roomId);
assert.equal((await act(3,'sync')).invitations.length,0);
await fails(()=>act(3,'join_room',{roomId:a.room.roomId}));
await act(2,'join_room',{roomId:invitation.roomId});
await fails(()=>act(1,'start_game'));
await act(1,'toggle_ready'); await act(2,'toggle_ready');
await fails(()=>act(2,'start_game'));
a=await act(1,'start_game');
assert.equal(a.room.status,'countdown');
await db.query("UPDATE duel_private.presence SET seen_at=now()-interval '46 seconds' WHERE user_id=$1",[uid(2)]);
assert.equal((await act(1,'sync')).room.finishReason,'opponent_disconnected');
await act(1,'leave_room'); await act(2,'leave_room');
await act(3,'find_match',{questionCount:3});
await act(4,'find_match',{questionCount:5});
assert.equal((await act(3,'sync')).queued,true);
assert.equal((await act(4,'sync')).queued,true);
await act(3,'cancel_find_match'); await act(4,'cancel_find_match');
await fails(()=>act(5,'find_match',{questionCount:4}));
await act(5,'find_match',{category:'missing',questionCount:3});
await fails(()=>act(6,'find_match',{category:'missing',questionCount:3}));
assert.equal((await act(6,'sync')).room,null);
await act(5,'cancel_find_match');
// Lease expiry, room reloading and deadlines.
await act(3,'find_match',{questionCount:3});
await db.query("UPDATE duel_private.presence SET seen_at=now()-interval '21 seconds' WHERE user_id=$1",[uid(3)]);
assert.equal((await act(4,'find_match',{questionCount:3})).queued,true);
assert.equal((await act(3,'sync')).queued,false);
await act(4,'cancel_find_match');
a=await act(1,'join_room',{questionCount:3});
assert.equal((await act(1,'sync')).room.roomId,a.room.roomId);
await act(2,'join_room',{roomId:a.room.roomId});
await act(1,'toggle_ready'); await act(2,'toggle_ready'); await act(1,'start_game');
await db.exec("UPDATE duel_private.rooms SET state=jsonb_set(state,'{deadlineAt}',to_jsonb(0))");
assert.equal((await act(1,'sync')).room.finishReason,'time_limit');
await act(1,'leave_room'); await act(2,'leave_room');
if (postgres) {
  // Separate PostgreSQL connections exercise locks, not a serial JS mock.
  await Promise.all([1,2,3,4,5,6,7,8].map(n=>act(n,'find_match',{questionCount:3})));
  const snapshots=await Promise.all([1,2,3,4,5,6,7,8].map(n=>act(n,'sync')));
  assert.equal(new Set(snapshots.map(s=>s.room.roomId)).size,4);
  for(const snapshot of snapshots) assert.equal(Object.keys(snapshot.room.players).length,2);
  const pair=Object.keys(snapshots[0].room.players).map(id=>Number(id.slice(-12)));
  const m=snapshots[0].room.matchId;
  await db.exec("UPDATE duel_private.rooms SET state=jsonb_set(state,'{startsAt}',to_jsonb(0))");
  const hits=await Promise.all(pair.map(n=>act(n,'submit_answer',{matchId:m,questionIndex:0,answer:'I learn English.'})));
  assert.deepEqual(hits.map(h=>h.result.pointsEarned).sort(),[100,125]);
  const repeats=await Promise.allSettled([1,2].map(()=>act(pair[0],'skip_question',{matchId:m,questionIndex:1})));
  assert.equal(repeats.filter(r=>r.status==='fulfilled').length,1);
  for(const n of [1,2,3,4,5,6,7,8]) await act(n,'leave_room');
  await act(1,'find_match',{questionCount:3});
  await Promise.all([act(1,'cancel_find_match'),act(2,'find_match',{questionCount:3})]);
  const p1=await act(1,'sync'), p2=await act(2,'sync');
  assert.ok((!p1.room && p2.queued) || (p1.room?.roomId === p2.room?.roomId && !!p1.room));
  console.log('PASS: concurrent 8-player matchmaking, unique first scorer, duplicate skip and cancel/match race.');
}
console.log('PASS: authentication, privileges, repeat migration, matchmaking, identity, answers, duplicate actions, scoring, rematch, invitations, readiness, disconnect, pools, deadlines, leases and insufficient questions.');
await db.close();
