import crypto from 'node:crypto';
import type { Express } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

type Player = { id: string; name: string; avatar_url?: string; email?: string };
type Session = { player: Player; seen: number; roomId?: string; queued?: { at: number; category: string; count: number; level: string; mode: 'sentence' | 'word' }; events: any[]; seq: number; requests: string[] };
export type DuelStore = { sessions: Record<string, Session>; rooms: Record<string, any>; invites: Record<string, any> };
export const emptyDuelStore = (): DuelStore => ({ sessions: {}, rooms: {}, invites: {} });
const LEASE_MS = 60000;
const push = (s: Session, event: any) => { s.events.push({ ...event, eventId: ++s.seq }); s.events = s.events.slice(-80); };
const norm = (s: string) => s.toLowerCase().trim().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[.,!?;:()]/g, '').replace(/\s+/g, ' ');
function participant(player: Player, host: boolean) {
  const { email, ...identity } = player;
  return { ...identity, isHost: host, score: 0, currentQuestionIndex: 0, answeredCount: 0, isReady: host, isFinished: false };
}
function broadcast(db: DuelStore, room: any, event: any, except?: string) {
  for (const key of room.members) if (key !== except && db.sessions[key]) push(db.sessions[key], event);
}
function leave(db: DuelStore, key: string) {
  const s = db.sessions[key]; if (!s) return;
  delete s.queued;
  const r = s.roomId && db.rooms[s.roomId]; delete s.roomId;
  for (const [id, inv] of Object.entries(db.invites)) if (inv.from === key || inv.to === key) delete db.invites[id];
  if (!r) return;
  r.members = r.members.filter((k: string) => k !== key);
  if (!r.members.length) { delete db.rooms[r.roomId]; return; }
  const remaining = db.sessions[r.members[0]];
  if (r.status === 'waiting') delete r.players[s.player.id];
  if (remaining) {
    r.players[remaining.player.id].isHost = true;
    if (r.status === 'in_progress' || r.status === 'countdown') { r.status = 'finished'; r.winnerId = remaining.player.id; }
  }
  broadcast(db, r, { type: 'player_left_event', playerId: s.player.id });
}
function finish(r: any) {
  const ps = Object.values(r.players) as any[];
  if (ps.every(p => p.isFinished)) {
    r.status = 'finished';
    r.winnerId = ps[0].score === ps[1].score ? null : ps.sort((a,b) => b.score-a.score)[0].id;
  }
}
function start(db: DuelStore, r: any, questions: any[], now: number) {
  let pool = questions.filter(q => r.category === 'all' || q.category === r.category);
  if (r.level && r.level !== 'all') {
    const levelPool = pool.filter(q => (q.level || 'B1') === r.level);
    if (levelPool.length >= r.questionCount) pool = levelPool;
  }
  if (pool.length < r.questionCount) pool = questions;
  r.questions = [...pool].sort(() => Math.random() - .5).slice(0, r.questionCount);
  if (r.mode === 'word') r.questions = r.questions.map((q: any) => {
    const vi = String(q.vi || '').replace(/[.,!?;:()]/g, '').split(/\s+/).find(Boolean) || q.vi;
    const answer = String(q.answers?.[0] || '').replace(/[.,!?;:()]/g, '').split(/\s+/).find(Boolean) || '';
    return { ...q, vi, hints: `Từ trọng tâm: ${answer}`, answers: [answer], wordBank: [answer] };
  });
  if (!r.questions.length) throw Error('Chưa có câu hỏi để đấu.');
  r.questionCount = r.questions.length;
  r.status = 'countdown'; r.roundStartedAt = now + 3000; r.firstCorrectAnswers = {}; r.rematchVotes = {}; r.winnerId = null;
  for (const key of r.members) {
    const s = db.sessions[key], old = r.players[s.player.id];
    r.players[s.player.id] = { ...participant(s.player, old.isHost), isReady: true };
  }
}

// Pure state transition: persisted with version comparison so separate Vercel instances cannot double-match or double-score.
export function transition(db: DuelStore, key: string, cmd: any, now: number, questions: any[], identity?: Player) {
  for (const [k, s] of Object.entries(db.sessions)) if (now - s.seen > LEASE_MS) { leave(db, k); delete db.sessions[k]; }
  for (const [id, inv] of Object.entries(db.invites)) if (inv.expiresAt <= now) delete db.invites[id];
  for (const r of Object.values(db.rooms)) if (r.status === 'countdown' && now >= r.roundStartedAt) { r.status = 'in_progress'; broadcast(db, r, { type: 'game_started' }); }
  if (cmd.type === 'register_lobby' && !db.sessions[key]) {
    if (!identity) throw Error('Vui lòng kết nối lại.');
    if (Object.keys(db.sessions).length >= 200) throw Error('Sảnh đang đầy. Vui lòng thử lại sau.');
    if (Object.values(db.sessions).some(s => s.player.id === identity.id)) throw Error('Bạn đang mở đấu trường ở tab khác. Hãy đóng tab đó trước.');
    db.sessions[key] = { player: identity, seen: now, events: [], seq: 0, requests: [] };
  }
  const s = db.sessions[key]; if (!s) throw Error('Phiên đấu đã hết hạn. Vui lòng kết nối lại.');
  s.seen = now;
  if (cmd.requestId && s.requests.includes(cmd.requestId)) return;
  const emit = (event: any) => push(s, event);
  const r = s.roomId ? db.rooms[s.roomId] : undefined;
  const p = r?.players[s.player.id];
  const fail = (message: string) => { throw Error(message); };
  const count = [5,10,15,20].includes(cmd.questionCount) ? cmd.questionCount : 5;
  const category = typeof cmd.category === 'string' ? cmd.category.slice(0,80) : 'all';
  const level = typeof cmd.level === 'string' ? cmd.level.slice(0,10) : 'all';
  const mode = cmd.mode === 'word' ? 'word' : 'sentence';
  const join = (room: any) => {
    if (s.roomId || room.status !== 'waiting' || room.members.length >= 2) fail('Phòng đã đầy, đã bắt đầu hoặc bạn đang ở phòng khác.');
    delete s.queued; s.roomId = room.roomId;
    room.members.push(key); room.players[s.player.id] = participant(s.player, room.members.length === 1);
    emit({ type:'joined_success', roomId:room.roomId, playerId:s.player.id, isHost:room.members.length===1 });
  };
  const create = () => {
    const roomId = `DUEL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const room = { roomId, members:[], players:{}, status:'waiting', questionCount:count, category, level, mode, questions:[], currentRound:0, roundTimerSeconds:60, rematchVotes:{} };
    db.rooms[roomId] = room; return room;
  };
  switch (cmd.type) {
    case 'register_lobby': case 'poll': break;
    case 'join_room': {
      if (s.roomId) fail('Hãy rời phòng hiện tại trước.');
      const room = cmd.roomId ? db.rooms[String(cmd.roomId).trim().toUpperCase()] : create();
      if (!room) fail('Phòng không tồn tại hoặc đã đóng.');
      join(room); break;
    }
    case 'find_match': {
      if (s.roomId) fail('Hãy rời phòng hiện tại trước.');
      const other = Object.entries(db.sessions).filter(([k,v]) => k !== key && v.queued && !v.roomId && v.queued.category === category && v.queued.level === level && v.queued.mode === mode).sort((a,b) => a[1].queued!.at-b[1].queued!.at)[0];
      if (!other) { s.queued = {at:now, category, count, level, mode}; emit({type:'waiting_in_queue'}); break; }
      const [ok, os] = other; const room = create(); room.category=os.queued!.category; room.questionCount=os.queued!.count; room.level=os.queued!.level; room.mode=os.queued!.mode;
      room.members.push(ok); room.players[os.player.id]=participant(os.player,true); os.roomId=room.roomId; delete os.queued;
      push(os,{type:'joined_success',roomId:room.roomId,playerId:os.player.id,isHost:true});
      join(room); start(db,room,questions,now); broadcast(db,room,{type:'match_found',roomId:room.roomId}); break;
    }
    case 'cancel_find_match': delete s.queued; emit({type:'search_cancelled'}); break;
    case 'leave_room': leave(db,key); break;
    case 'send_invite': {
      if (!r || r.status!=='waiting' || r.members.length!==1) fail('Hãy tạo phòng trống trước khi mời.');
      const target = Object.entries(db.sessions).find(([k,v]) => k!==key && (v.player.id===cmd.targetId || (cmd.targetEmail && v.player.email===String(cmd.targetEmail).toLowerCase().trim())));
      if (!target || target[1].roomId || target[1].queued) fail('Bạn này đang bận hoặc chưa vào sảnh. Hãy gửi link phòng.');
      for (const [id,inv] of Object.entries(db.invites)) if(inv.from===key) delete db.invites[id];
      const inviteId=crypto.randomUUID(), expiresAt=now+60000;
      db.invites[inviteId]={from:key,to:target[0],roomId:r.roomId,expiresAt};
      push(target[1],{type:'duel_invitation',inviteId,roomId:r.roomId,fromName:s.player.name,expiresAt}); emit({type:'invite_sent'}); break;
    }
    case 'respond_invite': {
      const inv=db.invites[cmd.inviteId];
      if (!inv || inv.to!==key) fail('Lời mời đã hết hạn.');
      if (cmd.accept) {
        const room=db.rooms[inv.roomId];
        if(!room || !room.members.includes(inv.from)) fail('Phòng không còn khả dụng.');
        join(room);
      } else if(db.sessions[inv.from]) push(db.sessions[inv.from],{type:'invite_declined'});
      delete db.invites[cmd.inviteId]; break;
    }
    case 'toggle_ready': if(r?.status==='waiting' && p) p.isReady=!p.isReady; break;
    case 'update_room_settings':
      if(r?.status==='waiting' && p?.isHost) {r.questionCount=count; r.category=category; r.level=level; r.mode=mode;} break;
    case 'start_game':
      if(!r || !p?.isHost || r.status!=='waiting' || r.members.length!==2 || !Object.values(r.players).every((v:any)=>v.isReady)) fail('Cần đủ hai người sẵn sàng và chủ phòng bắt đầu.');
      start(db,r,questions,now); break;
    case 'submit_answer': case 'skip_question': {
      if(!r || r.status!=='in_progress' || !p || p.isFinished) fail('Trận chưa bắt đầu hoặc bạn đã hoàn tất.');
      const index=p.currentQuestionIndex;
      if(cmd.questionIndex!==index) fail('Câu hỏi đã thay đổi. Hãy thử lại.');
      const q=r.questions[index];
      if(cmd.type==='submit_answer') {
        if(typeof cmd.answer!=='string' || cmd.answer.length>2000) fail('Câu trả lời không hợp lệ.');
        const correct=q.answers.some((a:string)=>norm(a)===norm(cmd.answer));
        if(!correct) {emit({type:'answer_result',correct:false,message:'Bản dịch chưa đúng. Hãy thử lại!'}); break;}
        const isFirst=!r.firstCorrectAnswers[index], pointsEarned=isFirst?150:100;
        if(isFirst) r.firstCorrectAnswers[index]=s.player.id;
        p.score+=pointsEarned;
        emit({type:'answer_result',correct:true,pointsEarned,isFirst,questionIndex:index});
        broadcast(db,r,{type:'opponent_scored',playerName:p.name,questionIndex:index,isFirst},key);
      }
      p.currentQuestionIndex++; p.answeredCount++; p.isFinished=p.currentQuestionIndex>=r.questions.length; finish(r); break;
    }
    case 'request_rematch':
      if(!r || r.status!=='finished' || r.members.length!==2) fail('Cần đủ hai người để tái đấu.');
      r.rematchVotes[s.player.id]=true;
      if(r.members.every((k:string)=>r.rematchVotes[db.sessions[k].player.id])) start(db,r,questions,now);
      else broadcast(db,r,{type:'rematch_requested_by_player'},key); break;
    case 'send_emote':
      if(r && ['🔥','⚡','😎','😱','👏','🏆','💪','⚔️'].includes(cmd.emote)) broadcast(db,r,{type:'emote_received',senderName:s.player.name,emote:cmd.emote},key); break;
    case 'typing': break; // Do not write every keystroke to shared storage.
    default: fail('Thao tác không được hỗ trợ.');
  }
  if(cmd.requestId) {s.requests.push(cmd.requestId); s.requests=s.requests.slice(-100);}
}
export function snapshot(db: DuelStore, key: string, cursor: number, now: number) {
  const s=db.sessions[key]; if(!s) throw Error('Phiên đấu đã hết hạn.');
  const room=s.roomId ? db.rooms[s.roomId] : null;
  const {members,firstCorrectAnswers,...state}=room||{};
  return {events:s.events.filter(e=>e.eventId>cursor),cursor:s.seq,playerId:s.player.id,queued:!!s.queued,
    state:room?state:null,serverNow:now,
    players:Object.values(db.sessions).filter(v=>!v.roomId && v.player.id!==s.player.id).map(v=>({id:v.player.id,full_name:v.player.name,avatar_url:v.player.avatar_url}))};
}

export function installDurableDuel(app: Express, admin: SupabaseClient | null, questions: () => any[]) {
  app.post('/api/duel/sync', async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    if(!admin) return res.status(503).json({error:'Máy chủ chưa cấu hình Supabase cho đấu 1vs1.'});
    const {sessionToken,command:cmd,cursor=0}=req.body||{};
    if(typeof sessionToken!=='string' || !/^[a-f0-9]{64}$/.test(sessionToken) || !cmd || typeof cmd.type!=='string' || JSON.stringify(cmd).length>5000) return res.status(400).json({error:'Yêu cầu không hợp lệ.'});
    const key=crypto.createHash('sha256').update(sessionToken).digest('hex');
    let identity: Player | undefined;
    try {
      if(cmd.type==='register_lobby') {
        const bearer=req.headers.authorization?.replace(/^Bearer /,'');
        let user:any=null;
        if(bearer) { const result=await admin.auth.getUser(bearer); if(result.error) return res.status(401).json({error:'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'}); user=result.data.user; }
      }
      for(let attempt=0;attempt<10;attempt++) {
        const {data:row,error}=await admin.from('duel_state_store').select('version,state').eq('id',1).single();
        if(error) throw Error('Kho phòng đấu chưa sẵn sàng. Vui lòng thử lại sau.');
        const db=row.state as DuelStore, now=Date.now();
        transition(db,key,cmd,now,questions(),identity);
        const {data:committed,error:writeError}=await admin.rpc('duel_compare_and_swap',{expected_version:row.version,next_state:db});
        if(writeError) throw Error('Không lưu được trạng thái trận đấu.');
        if(committed) return res.json(snapshot(db,key,Number(cursor)||0,now));
        await new Promise(resolve=>setTimeout(resolve,15+Math.random()*50));
      }
      return res.status(503).json({error:'Máy chủ đang bận. Vui lòng thử lại.'});
    } catch(error:any) { return res.status(400).json({error:error.message||'Không xử lý được trận đấu.'}); }
  });
}

