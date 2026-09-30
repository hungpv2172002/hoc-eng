import assert from 'node:assert/strict';
import WebSocket from 'ws';
const url = process.env.DUEL_TEST_URL || 'ws://localhost:3100/ws/duel';
const clients = [];
async function client(id) {
  const ws = new WebSocket(url), messages = [];
  ws.on('message', raw => messages.push(JSON.parse(raw)));
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  const c = { ws, messages, send: data => ws.send(JSON.stringify(data)), async wait(type, predicate = () => true) {
    const end = Date.now() + 6000;
    while (Date.now() < end) {
      const i = messages.findIndex(m => m.type === type && predicate(m));
      if (i >= 0) return messages.splice(i, 1)[0];
      await new Promise(r => setTimeout(r, 10));
    }
    throw new Error(`Timeout ${id}: ${type}`);
  }};
  clients.push(c);
  c.send({type:'register_lobby', player:{id, name:id, email:`${id}@example.com`}});
  await c.wait('lobby_players'); return c;
}
try {
  const a = await client('integration-a'), b = await client('integration-b');
  await a.wait('lobby_players', m => m.players.some(p => p.id === 'integration-b'));
  a.send({type:'find_match', questionCount:5}); await a.wait('waiting_in_queue');
  b.send({type:'find_match', questionCount:10});
  const ar = await a.wait('room_state', m=>m.state.status==='in_progress');
  const br = await b.wait('room_state', m=>m.state.status==='in_progress');
  assert.equal(ar.state.roomId, br.state.roomId);
  assert.equal(ar.state.questionCount,5);
  for (const c of [a,b]) {
    c.send({type:'submit_answer',questionIndex:0,answer:ar.state.questions[0].answers[0]});
    assert.equal((await c.wait('answer_result')).correct,true);
    c.send({type:'submit_answer',questionIndex:0,answer:ar.state.questions[0].answers[0]});
    await c.wait('error');
  }
  b.send({type:'leave_room'});
  assert.equal((await a.wait('room_state',m=>m.state.status==='finished')).state.winnerId,'integration-a');
  a.send({type:'leave_room'});
  a.send({type:'find_match'}); await a.wait('waiting_in_queue');
  a.send({type:'cancel_find_match'}); await a.wait('search_cancelled');
  b.send({type:'find_match'}); await b.wait('waiting_in_queue');
  b.send({type:'cancel_find_match'}); await b.wait('search_cancelled');
  a.send({type:'join_room',roomId:'DOES-NOT-EXIST'}); await a.wait('error');
  a.send({type:'join_room'}); const room = (await a.wait('joined_success',m=>m.roomId!==ar.state.roomId)).roomId;
  a.send({type:'start_game'}); await a.wait('error');
  a.send({type:'send_invite',targetEmail:'integration-b@example.com'});
  const inv = await b.wait('duel_invitation');
  b.send({type:'respond_invite',inviteId:inv.inviteId,accept:false}); await a.wait('invite_declined');
  a.send({type:'send_invite',targetId:'integration-b'});
  const accepted = await b.wait('duel_invitation');
  b.send({type:'respond_invite',inviteId:accepted.inviteId,accept:true});
  assert.equal((await b.wait('joined_success',m=>m.roomId===room)).roomId,room);
  const c = await client('integration-c');
  c.send({type:'join_room',roomId:room}); await c.wait('error');
  a.send({type:'start_game'}); await a.wait('error');
  b.send({type:'toggle_ready'}); await a.wait('room_state',m=>m.state.roomId===room && m.state.players['integration-b']?.isReady);
  a.send({type:'start_game'}); await a.wait('game_started'); await b.wait('game_started');
  b.ws.close();
  assert.equal((await a.wait('room_state',m=>m.state.roomId===room && m.state.status==='finished')).state.winnerId,'integration-a');
  console.log('PASS: presence, two-player matchmaking/answers, duplicate answers, cancellation, room validation, invitations, readiness, disconnect victory');
} finally { for (const c of clients) c.ws.close(); }
