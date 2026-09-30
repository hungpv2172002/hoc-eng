import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const base=process.env.DUEL_TEST_URL;
if(!base)throw Error('Set DUEL_TEST_URL to the deployment');
const cookie=process.env.DUEL_COOKIE_FILE?fs.readFileSync(process.env.DUEL_COOKIE_FILE,'utf8').trim():'';
const clients=[];
function client(name) {
  const token=crypto.randomBytes(32).toString('hex');let cursor=0;
  const c={name,async send(command){
    const r=await fetch(`${base}/api/duel/sync`,{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify({sessionToken:token,command:{requestId:crypto.randomUUID(),...command},cursor})});
    const data=await r.json();if(!r.ok)throw Error(`${name}: ${data.error||r.status}`);cursor=data.cursor;return data;
  }};clients.push(c);return c;
}
try {
  const a=client('Smoke A'),b=client('Smoke B'),c=client('Smoke C'),d=client('Smoke D');
  await Promise.all(clients.map(c=>c.send({type:'register_lobby',player:{name:c.name}})));
  const paired=await Promise.all(clients.map(c=>c.send({type:'find_match'})));
  const states=await Promise.all(clients.map(c=>c.send({type:'poll'})));
  assert.equal(new Set(states.map(s=>s.state.roomId)).size,2);
  for(const s of states)assert.equal(Object.keys(s.state.players).length,2);
  // Wait for the authoritative three-second countdown.
  await new Promise(r=>setTimeout(r,3200));
  const before=await Promise.all(clients.map(c=>c.send({type:'poll'})));
  for(let i=0;i<clients.length;i++) {
    const s=await clients[i].send({type:'submit_answer',questionIndex:0,answer:before[i].state.questions[0].answers[0],requestId:'same-answer'});
    assert.ok(s.events.some(e=>e.type==='answer_result' && e.correct));
    const dup=await clients[i].send({type:'submit_answer',questionIndex:0,answer:before[i].state.questions[0].answers[0],requestId:'same-answer'});
    assert.equal(dup.state.players[dup.playerId].currentQuestionIndex,1);
  }
  await Promise.all(clients.map(c=>c.send({type:'leave_room'})));
  const ra=await a.send({type:'join_room'});
  const rb=await b.send({type:'poll'});
  await a.send({type:'send_invite',targetId:rb.playerId});
  const bi=await b.send({type:'poll'});
  const invitation=bi.events.find(e=>e.type==='duel_invitation');assert.ok(invitation);
  const joined=await b.send({type:'respond_invite',inviteId:invitation.inviteId,accept:true});
  assert.equal(joined.state.roomId,ra.state.roomId);
  await b.send({type:'toggle_ready'});await a.send({type:'start_game'});
  console.log('PASS LIVE: four concurrent clients, two distinct matches, all answer, idempotency, friend invitation, readiness, start');
} finally {
  await Promise.allSettled(clients.map(c=>c.send({type:'leave_room'})));
}
