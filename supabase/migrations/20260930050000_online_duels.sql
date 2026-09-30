-- Run in Supabase SQL Editor as postgres. Requires existing profiles/questions.
-- All state mutations are authenticated, server-authoritative transactions.
BEGIN;
CREATE SCHEMA IF NOT EXISTS duel_private;
REVOKE ALL ON SCHEMA duel_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS duel_private.rooms (
  id text PRIMARY KEY,
  state jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);
CREATE TABLE IF NOT EXISTS duel_private.members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id text NOT NULL REFERENCES duel_private.rooms(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS duel_members_room ON duel_private.members(room_id);
CREATE TABLE IF NOT EXISTS duel_private.presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS duel_private.queue (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  question_count integer NOT NULL CHECK (question_count IN (3,5,10)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS duel_private.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id text NOT NULL REFERENCES duel_private.rooms(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  UNIQUE(room_id, recipient)
);
-- The project's old default grants must not expose game state or answers.
REVOKE ALL ON ALL TABLES IN SCHEMA duel_private FROM PUBLIC, anon, authenticated;
ALTER TABLE duel_private.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_private.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_private.queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_private.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_private.invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION duel_private.normalized(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT trim(regexp_replace(
    regexp_replace(translate(lower(coalesce(t,'')), '‘’“”', '''''""'), '[.,!?;:()]', '', 'g'),
    '[[:space:]]+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION duel_private.player(u uuid, host boolean) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object('id',u,'name',coalesce(nullif(p.full_name,''),'Học viên'),
    'avatar_url',p.avatar_url,'isHost',host,'score',0,'currentQuestionIndex',0,
    'answeredCount',0,'isReady',false,'isFinished',false)
  FROM (SELECT u AS id) a LEFT JOIN public.profiles p ON p.id=a.id;
$$;

CREATE OR REPLACE FUNCTION duel_private.start_match(s jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE qs jsonb; ps jsonb; n integer := (s->>'questionCount')::integer;
BEGIN
  SELECT jsonb_agg(item) INTO qs FROM (
    SELECT jsonb_build_object('id',q.id,'vi',q.vi,'hints',q.hints,
      'category',coalesce(to_jsonb(q)->>'category','general'),
      'level',coalesce(to_jsonb(q)->>'level','B1'),'answers',q.answers,
      'wordBank',(SELECT jsonb_agg(w ORDER BY random()) FROM
        regexp_split_to_table(regexp_replace(to_jsonb(q)->'answers'->>0, '[.,!?;:()"]', '', 'g'), '[[:space:]]+') w WHERE w <> '')
    ) AS item
    FROM public.questions q
    WHERE jsonb_typeof(to_jsonb(q)->'answers') = 'array'
      AND jsonb_array_length(to_jsonb(q)->'answers') > 0
      AND (s->>'category' = 'all' OR coalesce(to_jsonb(q)->>'category','general') = s->>'category')
    ORDER BY random() LIMIT n
  ) picked;
  IF coalesce(jsonb_array_length(qs),0) < n THEN
    RAISE EXCEPTION 'Chủ đề chưa có đủ % câu hỏi trong database. Hãy chọn chủ đề khác.', n;
  END IF;
  SELECT jsonb_object_agg(key,value || jsonb_build_object('score',0,'currentQuestionIndex',0,
    'answeredCount',0,'isFinished',false,'isReady',true)) INTO ps FROM jsonb_each(s->'players');
  RETURN (s - 'lastEmote' - 'finishReason') || jsonb_build_object(
    'status','countdown','players',ps,'questions',qs,'firstCorrect','{}'::jsonb,
    'rematchVotes','{}'::jsonb,'winnerId',NULL,'matchId',gen_random_uuid(),
    'startsAt',floor(extract(epoch FROM clock_timestamp())*1000)+3000,
    'deadlineAt',floor(extract(epoch FROM clock_timestamp())*1000)+3000+n*60000);
END;
$$;

CREATE OR REPLACE FUNCTION duel_private.finish_match(s jsonb, winner text DEFAULT NULL, reason text DEFAULT 'completed')
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE best integer; winners integer;
BEGIN
  IF winner IS NULL THEN
    SELECT max((value->>'score')::integer) INTO best FROM jsonb_each(s->'players');
    SELECT count(*) INTO winners FROM jsonb_each(s->'players') WHERE (value->>'score')::integer=best;
    IF winners=1 THEN SELECT key INTO winner FROM jsonb_each(s->'players') WHERE (value->>'score')::integer=best; END IF;
  END IF;
  RETURN s || jsonb_build_object('status','finished','winnerId',winner,'finishReason',reason);
END;
$$;

CREATE OR REPLACE FUNCTION public.duel_action(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_variable
DECLARE
  uid uuid := auth.uid(); me text; rid text; requested text; target uuid; partner uuid;
  s jsonb; pl jsonb; other text; qs jsonb; safe_state jsonb; result jsonb := NULL;
  category text := coalesce(nullif(p_payload->>'category',''),'all');
  n integer := coalesce((p_payload->>'questionCount')::integer,5);
  idx integer; correct boolean; first_hit boolean; points integer;
  now_ms bigint; peer_seen timestamptz; invitations jsonb; online_players jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập để thi đấu trực tuyến.'; END IF;
  me := uid::text;
  IF p_action NOT IN ('sync','join_room','invite_player','decline_invite','find_match','cancel_find_match',
      'leave_room','toggle_ready','start_game','update_room_settings','submit_answer','skip_question',
      'request_rematch','typing','send_emote') THEN RAISE EXCEPTION 'Hành động không hợp lệ.'; END IF;
  IF n NOT IN (3,5,10) OR length(category)>80 THEN RAISE EXCEPTION 'Cấu hình trận không hợp lệ.'; END IF;

  -- Only membership/queue operations share a matchmaking lock; separate games run independently.
  IF p_action IN ('join_room','invite_player','find_match','cancel_find_match','leave_room') THEN
    PERFORM pg_advisory_xact_lock(7421901);
    DELETE FROM duel_private.rooms WHERE expires_at < now();
    DELETE FROM duel_private.invites WHERE expires_at < now();
    DELETE FROM duel_private.queue q WHERE NOT EXISTS
      (SELECT 1 FROM duel_private.presence p WHERE p.user_id=q.user_id AND p.seen_at > now()-interval '20 seconds');
  END IF;
  INSERT INTO duel_private.presence(user_id,seen_at) VALUES(uid,now())
    ON CONFLICT(user_id) DO UPDATE SET seen_at=excluded.seen_at;
  SELECT m.room_id INTO rid FROM duel_private.members m JOIN duel_private.rooms r ON r.id=m.room_id
    WHERE m.user_id=uid AND r.expires_at>now();

  IF p_action='decline_invite' THEN
    DELETE FROM duel_private.invites WHERE recipient=uid AND id::text=p_payload->>'inviteId';
  ELSIF p_action='cancel_find_match' THEN
    DELETE FROM duel_private.queue WHERE user_id=uid;
    -- A simultaneous match may already have committed; return that room rather than orphaning it.
  ELSIF p_action='find_match' AND rid IS NULL THEN
    SELECT q.user_id INTO partner FROM duel_private.queue q
      JOIN duel_private.presence p ON p.user_id=q.user_id
      WHERE q.user_id<>uid AND q.category=category AND q.question_count=n
        AND p.seen_at>now()-interval '20 seconds'
        AND NOT EXISTS (SELECT 1 FROM duel_private.members m WHERE m.user_id=q.user_id)
      ORDER BY q.created_at LIMIT 1;
    IF partner IS NULL THEN
      INSERT INTO duel_private.queue(user_id,category,question_count) VALUES(uid,category,n)
        ON CONFLICT(user_id) DO UPDATE SET category=excluded.category,question_count=excluded.question_count;
    ELSE
      rid := 'DUEL-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
      s := jsonb_build_object('roomId',rid,'status','waiting','category',category,'questionCount',n,
        'players',jsonb_build_object(partner::text,duel_private.player(partner,true),me,duel_private.player(uid,false)),
        'questions','[]'::jsonb,'currentRound',0,'roundTimerSeconds',60);
      s := duel_private.start_match(s);
      INSERT INTO duel_private.rooms(id,state) VALUES(rid,s);
      INSERT INTO duel_private.members(user_id,room_id) VALUES(uid,rid),(partner,rid);
      DELETE FROM duel_private.queue WHERE user_id IN(uid,partner);
    END IF;
  ELSIF p_action IN ('join_room','invite_player') THEN
    requested := upper(trim(coalesce(p_payload->>'roomId','')));
    IF requested<>'' AND requested NOT LIKE 'DUEL-%' THEN requested:='DUEL-'||requested; END IF;
    IF p_action='invite_player' THEN
      IF coalesce(p_payload->>'targetId','')<>'' THEN
        SELECT id INTO target FROM public.profiles WHERE id::text=p_payload->>'targetId';
      ELSE
        SELECT id INTO target FROM public.profiles WHERE lower(email)=lower(trim(p_payload->>'targetEmail')) LIMIT 1;
      END IF;
      IF target IS NULL OR target=uid THEN RAISE EXCEPTION 'Không tìm thấy người nhận lời mời phù hợp.'; END IF;
      IF EXISTS(SELECT 1 FROM duel_private.members WHERE user_id=target) THEN RAISE EXCEPTION 'Người chơi đang ở trong một phòng đấu.'; END IF;
    END IF;
    IF rid IS NOT NULL AND requested<>'' AND requested<>rid THEN RAISE EXCEPTION 'Hãy rời phòng hiện tại trước.'; END IF;
    IF rid IS NULL THEN
      IF requested='' THEN
        rid := 'DUEL-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
        s := jsonb_build_object('roomId',rid,'status','waiting','category',category,'questionCount',n,
          'players',jsonb_build_object(me,duel_private.player(uid,true)),
          'questions','[]'::jsonb,'currentRound',0,'roundTimerSeconds',60);
        INSERT INTO duel_private.rooms(id,state) VALUES(rid,s);
      ELSE
        SELECT state INTO s FROM duel_private.rooms WHERE id=requested AND expires_at>now() FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Phòng không tồn tại hoặc đã hết hạn.'; END IF;
        IF s->>'status'<>'waiting' THEN RAISE EXCEPTION 'Trận đấu đã bắt đầu.'; END IF;
        IF (SELECT count(*) FROM duel_private.members WHERE room_id=requested)>=2 THEN RAISE EXCEPTION 'Phòng đã đủ hai người.'; END IF;
        IF s ? 'invitedUser' AND s->>'invitedUser'<>me THEN RAISE EXCEPTION 'Phòng dành cho người bạn được mời.'; END IF;
        rid:=requested;
        s:=jsonb_set(s,ARRAY['players',me],duel_private.player(uid,false));
        UPDATE duel_private.rooms SET state=s WHERE id=rid;
      END IF;
      INSERT INTO duel_private.members(user_id,room_id) VALUES(uid,rid);
      DELETE FROM duel_private.queue WHERE user_id=uid;
      DELETE FROM duel_private.invites WHERE recipient=uid;
    END IF;
    IF p_action='invite_player' THEN
      SELECT state INTO s FROM duel_private.rooms WHERE id=rid FOR UPDATE;
      IF s->>'status'<>'waiting' OR NOT (s->'players'->me->>'isHost')::boolean
        OR (SELECT count(*) FROM duel_private.members WHERE room_id=rid)<>1 THEN
        RAISE EXCEPTION 'Chỉ chủ phòng đang chờ mới có thể mời bạn.';
      END IF;
      s:=s || jsonb_build_object('invitedUser',target);
      UPDATE duel_private.rooms SET state=s WHERE id=rid;
      DELETE FROM duel_private.invites WHERE room_id=rid;
      INSERT INTO duel_private.invites(sender,recipient,room_id) VALUES(uid,target,rid);
    END IF;
  ELSIF p_action='leave_room' THEN
    DELETE FROM duel_private.queue WHERE user_id=uid;
    IF rid IS NOT NULL THEN
      SELECT state INTO s FROM duel_private.rooms WHERE id=rid FOR UPDATE;
      SELECT key INTO other FROM jsonb_each(s->'players') WHERE key<>me LIMIT 1;
      DELETE FROM duel_private.members WHERE user_id=uid;
      IF other IS NULL THEN DELETE FROM duel_private.rooms WHERE id=rid;
      ELSE
        IF s->>'status'='waiting' THEN
          s:=jsonb_set(s - 'invitedUser','{players}',(s->'players')-me);
          s:=jsonb_set(s,ARRAY['players',other,'isHost'],'true'::jsonb);
          s:=jsonb_set(s,ARRAY['players',other,'isReady'],'false'::jsonb);
        ELSIF s->>'status'<>'finished' THEN s:=duel_private.finish_match(s,other,'opponent_left');
        END IF;
        UPDATE duel_private.rooms SET state=s WHERE id=rid;
      END IF;
      rid:=NULL;
    END IF;
  END IF;

  IF rid IS NOT NULL THEN
    SELECT state INTO s FROM duel_private.rooms WHERE id=rid FOR UPDATE;
    now_ms:=floor(extract(epoch FROM clock_timestamp())*1000);
    SELECT key INTO other FROM jsonb_each(s->'players') WHERE key<>me LIMIT 1;
    IF s->>'status' IN ('countdown','in_progress') THEN
      SELECT seen_at INTO peer_seen FROM duel_private.presence WHERE user_id::text=other;
      IF now_ms >= (s->>'deadlineAt')::bigint THEN s:=duel_private.finish_match(s,NULL,'time_limit');
      ELSIF coalesce(peer_seen, '-infinity'::timestamptz)<now()-interval '45 seconds' THEN
        s:=duel_private.finish_match(s,me,'opponent_disconnected');
      ELSIF s->>'status'='countdown' AND now_ms >= (s->>'startsAt')::bigint THEN
        s:=s || jsonb_build_object('status','in_progress');
      END IF;
    END IF;
    pl:=s->'players'->me;
    IF p_action IN ('submit_answer','skip_question','request_rematch') AND
      coalesce(p_payload->>'matchId','')<>coalesce(s->>'matchId','') THEN
      RAISE EXCEPTION 'Trận đã thay đổi. Đang đồng bộ lại.';
    END IF;
    IF p_action='toggle_ready' THEN
      IF s->>'status'<>'waiting' THEN RAISE EXCEPTION 'Trận đã bắt đầu.'; END IF;
      s:=jsonb_set(s,ARRAY['players',me,'isReady'],to_jsonb(NOT (pl->>'isReady')::boolean));
    ELSIF p_action='update_room_settings' THEN
      IF s->>'status'<>'waiting' OR NOT (pl->>'isHost')::boolean THEN RAISE EXCEPTION 'Không thể sửa cấu hình lúc này.'; END IF;
      SELECT jsonb_object_agg(key,jsonb_set(value,'{isReady}','false')) INTO pl FROM jsonb_each(s->'players');
      s:=s || jsonb_build_object('category',category,'questionCount',n,'players',pl);
    ELSIF p_action='start_game' THEN
      IF s->>'status'<>'waiting' OR NOT (pl->>'isHost')::boolean OR other IS NULL OR
        EXISTS(SELECT 1 FROM jsonb_each(s->'players') WHERE NOT (value->>'isReady')::boolean) THEN
        RAISE EXCEPTION 'Cần hai người sẵn sàng và chủ phòng bắt đầu.';
      END IF;
      s:=duel_private.start_match(s);
    ELSIF p_action IN ('submit_answer','skip_question') THEN
      IF s->>'status'<>'in_progress' THEN RAISE EXCEPTION 'Trận chưa bắt đầu hoặc đã kết thúc.'; END IF;
      idx:=(pl->>'currentQuestionIndex')::integer;
      IF coalesce((p_payload->>'questionIndex')::integer,-1)<>idx OR idx>=jsonb_array_length(s->'questions') THEN
        RAISE EXCEPTION 'Câu hỏi đã được xử lý. Đang đồng bộ lại.';
      END IF;
      correct:=false; points:=0; first_hit:=false;
      IF p_action='submit_answer' THEN
        IF length(coalesce(p_payload->>'answer',''))>2000 THEN RAISE EXCEPTION 'Câu trả lời quá dài.'; END IF;
        SELECT EXISTS(SELECT 1 FROM jsonb_array_elements_text(s->'questions'->idx->'answers') a
          WHERE duel_private.normalized(a)=duel_private.normalized(p_payload->>'answer')) INTO correct;
        IF correct THEN
          first_hit:=NOT (s->'firstCorrect' ? idx::text);
          points:=CASE WHEN first_hit THEN 125 ELSE 100 END;
          IF first_hit THEN s:=jsonb_set(s,ARRAY['firstCorrect',idx::text],to_jsonb(me)); END IF;
          pl:=pl || jsonb_build_object('score',(pl->>'score')::integer+points,'answeredCount',(pl->>'answeredCount')::integer+1);
        END IF;
        result:=jsonb_build_object('type','answer_result','correct',correct,'pointsEarned',points,'isFirst',first_hit);
      END IF;
      IF correct OR p_action='skip_question' THEN
        pl:=pl || jsonb_build_object('currentQuestionIndex',idx+1,'isFinished',idx+1>=jsonb_array_length(s->'questions'));
        s:=jsonb_set(s,ARRAY['players',me],pl);
        IF NOT EXISTS(SELECT 1 FROM jsonb_each(s->'players') WHERE NOT (value->>'isFinished')::boolean) THEN
          s:=duel_private.finish_match(s);
        END IF;
      END IF;
    ELSIF p_action='request_rematch' THEN
      IF s->>'status'<>'finished' OR (SELECT count(*) FROM duel_private.members WHERE room_id=rid)<>2 THEN
        RAISE EXCEPTION 'Đối thủ đã rời phòng hoặc trận chưa kết thúc.';
      END IF;
      s:=jsonb_set(s,ARRAY['rematchVotes',me],'true');
      IF s->'rematchVotes'->>other='true' THEN s:=duel_private.start_match(s); END IF;
    ELSIF p_action='typing' AND s->>'status'='in_progress' THEN
      s:=jsonb_set(s,ARRAY['players',me,'typingAt'],to_jsonb(now_ms));
    ELSIF p_action='send_emote' THEN
      IF p_payload->>'emote' NOT IN ('🔥','⚡','😎','😱','👏','🏆','💪','⚔️') THEN RAISE EXCEPTION 'Biểu cảm không hợp lệ.'; END IF;
      s:=s || jsonb_build_object('lastEmote',jsonb_build_object('id',gen_random_uuid(),'senderId',me,
        'senderName',pl->>'name','emote',p_payload->>'emote'));
    END IF;
    UPDATE duel_private.rooms SET state=s WHERE id=rid;
    SELECT coalesce(jsonb_agg(value-'answers' ORDER BY ord),'[]') INTO qs
      FROM jsonb_array_elements(s->'questions') WITH ORDINALITY a(value,ord);
    safe_state:=(s-'firstCorrect'-'invitedUser') || jsonb_build_object('questions',qs);
  ELSIF p_action IN ('toggle_ready','start_game','update_room_settings','submit_answer','skip_question','request_rematch') THEN
    RAISE EXCEPTION 'Bạn chưa tham gia phòng hoặc phòng đã hết hạn.';
  END IF;

  SELECT coalesce(jsonb_agg(item),'[]') INTO invitations FROM (
    SELECT jsonb_build_object('id',i.id,'roomId',i.room_id,'senderName',coalesce(p.full_name,'Học viên'))
      AS item FROM duel_private.invites i LEFT JOIN public.profiles p ON p.id=i.sender
      JOIN duel_private.rooms r ON r.id=i.room_id
      WHERE i.recipient=uid AND i.expires_at>now() AND r.expires_at>now() AND r.state->>'status'='waiting'
      ORDER BY i.expires_at DESC LIMIT 20
  ) x;
  SELECT coalesce(jsonb_agg(item),'[]') INTO online_players FROM (
    SELECT jsonb_build_object('id',p.user_id,'name',coalesce(nullif(u.full_name,''),'Học viên'),
      'avatar_url',u.avatar_url,'searching',EXISTS(SELECT 1 FROM duel_private.queue q WHERE q.user_id=p.user_id)) AS item
      FROM duel_private.presence p LEFT JOIN public.profiles u ON u.id=p.user_id
      WHERE p.user_id<>uid AND p.seen_at>now()-interval '20 seconds'
        AND NOT EXISTS(SELECT 1 FROM duel_private.members m WHERE m.user_id=p.user_id)
      ORDER BY p.seen_at DESC LIMIT 60
  ) x;
  RETURN jsonb_build_object('playerId',uid,'room',safe_state,
    'queued',EXISTS(SELECT 1 FROM duel_private.queue WHERE user_id=uid),
    'onlinePlayers',online_players,'invitations',invitations,'result',result,
    'serverNow',floor(extract(epoch FROM clock_timestamp())*1000));
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA duel_private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.duel_action(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.duel_action(text,jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
