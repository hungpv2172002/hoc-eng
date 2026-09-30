import { supabase, isSupabaseConfigured } from './supabaseClient';

// Same event protocol as the original duel view. HTTPS polling works across Vercel instances.
export class HttpDuelConnection {
  readyState=0;
  onopen: (()=>void)|null=null;
  onmessage: ((event:{data:string})=>void)|null=null;
  onclose: (()=>void)|null=null;
  onerror: (()=>void)|null=null;
  private cursor=0;
  private token:string;
  private chain=Promise.resolve();
  private timer:ReturnType<typeof setTimeout>|null=null;
  private registered=false;
  private roomId:string|null=null;
  private lastState='';
  private lastCountdown:number|null=null;
  private failures=0;
  constructor(identity:string) {
    const storageKey=`duel_session_v2_${identity}`;
    const saved=sessionStorage.getItem(storageKey);
    this.token=saved||Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
    sessionStorage.setItem(storageKey,this.token);
    queueMicrotask(()=>{ if(this.readyState!==0)return; this.readyState=1;this.onopen?.(); });
  }
  private emit(data:any) {if(this.readyState===1)this.onmessage?.({data:JSON.stringify(data)});}
  send(raw:string) {
    if(this.readyState!==1)return;
    const cmd=JSON.parse(raw);
    if(cmd.type==='typing')return;
    cmd.requestId=crypto.randomUUID();
    this.chain=this.chain.then(()=>this.sync(cmd)).catch(()=>{});
  }
  private async sync(command:any) {
    if(this.readyState!==1)return;
    if(this.timer) {clearTimeout(this.timer);this.timer=null;}
    try {
      const headers:Record<string,string>={'Content-Type':'application/json'};
      if(command.type==='register_lobby' && isSupabaseConfigured) {
        const {data}=await supabase.auth.getSession();
        if(data.session?.access_token)headers.Authorization=`Bearer ${data.session.access_token}`;
      }
      const response=await fetch('/api/duel/sync',{method:'POST',headers,body:JSON.stringify({sessionToken:this.token,command,cursor:this.cursor}),signal:AbortSignal.timeout(12000)});
      const data=await response.json();
      if(!response.ok) {
        this.emit({type:'error',message:data.error||'Không kết nối được máy chủ đấu.'});
        if(command.type==='register_lobby' || data.error?.includes('Phiên đấu đã hết hạn')) {this.close(); return;}
        if(response.status>=500)throw Error(data.error);
        return;
      }
      if(this.readyState!==1)return;
      this.registered=true;this.failures=0;
      if(data.state?.roomId && data.state.roomId!==this.roomId) {
        this.emit({type:'joined_success',roomId:data.state.roomId,playerId:data.playerId,isHost:data.state.players[data.playerId]?.isHost});
      }
      this.roomId=data.state?.roomId||null;
      for(const event of data.events) {
        if(event.type!=='joined_success')this.emit(event);
      }
      this.cursor=data.cursor;
      const stateText=JSON.stringify(data.state);
      if(data.state && stateText!==this.lastState) {this.emit({type:'room_state',state:data.state});this.lastState=stateText;}
      if(!data.state)this.lastState='';
      this.emit({type:'lobby_players',players:data.players});
      if(data.queued)this.emit({type:'waiting_in_queue'});
      const count=data.state?.status==='countdown'?Math.max(1,Math.ceil((data.state.roundStartedAt-data.serverNow)/1000)):null;
      if(count!==this.lastCountdown) {
        this.lastCountdown=count;
        if(count!==null)this.emit({type:'countdown_tick',count});
        else if(data.state?.status==='in_progress')this.emit({type:'game_started'});
      }
    } catch {
      this.emit({type:'error',message:'Mạng đang gián đoạn. Đang thử kết nối lại…'});
      if(++this.failures>=3) {this.onerror?.();this.close();return;}
    } finally {
      if(this.readyState===1) this.timer=setTimeout(()=>{
        this.chain=this.chain.then(()=>this.sync(this.registered?{type:'poll'}:command)).catch(()=>{});
      },this.failures?3000:1200);
    }
  }
  close() {
    if(this.readyState===3)return;
    this.readyState=3;
    if(this.timer)clearTimeout(this.timer);
    // A short network interruption keeps the room for 60s. Explicit UI leave sends leave_room.
    this.onclose?.();
  }
}
