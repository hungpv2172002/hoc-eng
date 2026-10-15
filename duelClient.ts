import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { DuelRoomState } from '../types';

export interface OnlineDuelPlayer { id: string; name: string; avatar_url?: string; searching: boolean }
export interface DuelInvitation { id: string; roomId: string; senderName: string }
type Status = 'connecting' | 'connected' | 'disconnected' | 'error';
type Message = { type: string; [key: string]: any };
type Snapshot = {
  playerId: string;
  room: DuelRoomState & { matchId?: string; startsAt?: number; deadlineAt?: number; lastEmote?: any } | null;
  queued: boolean;
  onlinePlayers: OnlineDuelPlayer[];
  invitations: DuelInvitation[];
  result?: Message;
  serverNow: number;
};

/** Authenticated, transactional Supabase RPC. Polling also repairs dropped responses
 * and works across serverless instances without a process-local WebSocket room. */
export class DuelClient {
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;
  private serial: Promise<unknown> = Promise.resolve();
  private snapshot: Snapshot | null = null;
  private emoteId?: string;
  private countdown?: number;
  private failures = 0;
  private status: Status = 'connecting';

  constructor(private message: (data: Message) => void, private connection: (status: Status) => void) {}

  private setStatus(status: Status) {
    if (this.stopped) return;
    this.status = status;
    this.connection(status);
  }

  async start(initialRoomId?: string | null) {
    this.setStatus('connecting');
    if (!isSupabaseConfigured) {
      this.setStatus('error');
      this.message({ type: 'error', message: 'Chưa kết nối dịch vụ thi đấu trực tuyến.' });
      return;
    }
    let session;
    try {
      session = (await supabase.auth.getSession()).data.session;
    } catch {
      this.setStatus('error');
      this.message({ type: 'error', message: 'Không thể kiểm tra đăng nhập. Hãy tải lại trang.' });
      return;
    }
    if (this.stopped) return;
    if (!session) {
      this.setStatus('error');
      this.message({ type: 'error', message: 'Bạn cần đăng nhập để thi đấu trực tuyến.' });
      return;
    }
    await this.command({ type: 'sync' });
    if (initialRoomId && !this.snapshot?.room && !this.stopped && this.status === 'connected') {
      await this.command({ type: 'join_room', roomId: initialRoomId });
    }
    this.schedule();
  }

  command(payload: Message): Promise<boolean> {
    // Capture the original question/match before queuing, so rapid double clicks
    // can never submit/skip the next question or the next rematch.
    const room = this.snapshot?.room;
    const request = { ...payload };
    if (['submit_answer', 'skip_question', 'request_rematch'].includes(payload.type)) {
      request.matchId = room?.matchId;
      request.questionIndex ??= room?.players[this.snapshot!.playerId]?.currentQuestionIndex;
    }
    const job = this.serial.then(async () => {
      if (this.stopped) return false;
      this.controller = new AbortController();
      const timeout = setTimeout(() => this.controller?.abort(), 10000);
      try {
        const { data, error } = await supabase.rpc('duel_action', {
          p_action: request.type, p_payload: request,
        }).abortSignal(this.controller.signal);
        if (this.stopped) return false;
        if (error) throw error;
        this.failures = 0;
        this.setStatus('connected');
        this.consume(data as Snapshot);
        return true;
      } catch (error: any) {
        if (this.stopped) return false;
        this.failures++;
        const missing = ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code);
        const message = missing
          ? 'Chế độ 1vs1 chưa được kích hoạt trên database. Vui lòng liên hệ quản trị viên.'
          : error.message || 'Mất kết nối. Đang thử kết nối lại; hãy giữ trang này mở.';
        if (missing || !error.code || error.code === 'PGRST301') this.setStatus('error');
        if (request.type !== 'sync' || this.failures === 1) this.message({ type: 'error', message });
        // Reconcile using sync instead of retrying a potentially committed mutation.
        return false;
      } finally {
        clearTimeout(timeout);
        this.controller = undefined;
      }
    });
    this.serial = job.catch(() => {});
    return job;
  }

  private schedule() {
    if (this.stopped) return;
    const delay = this.failures ? Math.min(1000 * 2 ** this.failures, 10000)
      : this.snapshot?.room || this.snapshot?.queued ? 1000 : 2500;
    this.timer = setTimeout(async () => {
      await this.command({ type: 'sync' });
      this.schedule();
    }, delay);
  }

  private consume(next: Snapshot) {
    const previous = this.snapshot;
    this.snapshot = next;
    this.message({ type: 'lobby_state', players: next.onlinePlayers, invitations: next.invitations });
    if (next.queued && !previous?.queued) this.message({ type: 'waiting_in_queue' });
    if (!next.queued && previous?.queued) this.message({ type: next.room ? 'match_found' : 'search_cancelled' });
    if (next.room && next.room.roomId !== previous?.room?.roomId) {
      this.message({ type: 'joined_success', playerId: next.playerId, roomId: next.room.roomId,
        isHost: next.room.players[next.playerId]?.isHost });
    }
    if (next.result) this.message(next.result);
    if (next.room) {
      const room = next.room;
      if (room.status === 'countdown') {
        const count = Math.max(0, Math.ceil(((room.startsAt || 0) - next.serverNow) / 1000));
        if (count !== this.countdown) {
          this.countdown = count;
          this.message({ type: 'countdown_tick', count });
        }
      } else {
        this.countdown = undefined;
        if (room.status === 'in_progress' && previous?.room?.status !== 'in_progress') this.message({ type: 'game_started' });
      }
      const opponent = Object.values(room.players).find(p => p.id !== next.playerId) as any;
      if (opponent?.typingAt > next.serverNow - 1500) this.message({ type: 'opponent_typing' });
      if (room.lastEmote && room.lastEmote.id !== this.emoteId) {
        this.emoteId = room.lastEmote.id;
        if (room.lastEmote.senderId !== next.playerId) this.message({ type: 'emote_received', ...room.lastEmote });
      }
      this.message({ type: 'room_state', state: room, serverNow: next.serverNow });
    } else {
      this.countdown = undefined;
      this.message({ type: 'room_cleared' });
    }
  }

  close() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.controller?.abort();
    // Membership survives a reload; heartbeat expiry handles disconnected players.
  }
}
