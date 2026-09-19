-- ==============================================================================
-- FILE SQL HOÀN CHỈNH CHO SUPABASE (CHẠY 1 LẦN DUY NHẤT TRÊN SQL EDITOR)
-- ==============================================================================

-- 1. BẬT TIỆN ÍCH MÃ HÓA NẾU CẦN
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TẠO BẢNG profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_vip BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TẠO BẢNG questions
CREATE TABLE IF NOT EXISTS public.questions (
    id BIGSERIAL PRIMARY KEY,
    vi TEXT NOT NULL,
    hints TEXT NOT NULL,
    answers TEXT[] NOT NULL,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 4. TẠO BẢNG study_logs
CREATE TABLE IF NOT EXISTS public.study_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT unique_user_question_date UNIQUE(user_id, question_id, completed_at)
);

-- 5. KÍCH HOẠT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

-- 6. HÀM KIỂM TRA QUYỀN ADMIN (SECURITY DEFINER để tránh đệ quy RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CHÍNH SÁCH BẢO MẬT (RLS POLICIES) CHO BẢNG profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id OR public.is_admin()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id OR public.is_admin()
    )
    WITH CHECK (
        auth.uid() = id OR public.is_admin()
    );

-- Trigger bảo vệ: Người dùng thường KHÔNG THỂ tự nâng role hoặc is_vip
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Nếu người thực hiện không phải Admin
    IF NOT public.is_admin() THEN
        -- Giữ nguyên role và is_vip cũ, không cho phép sửa đổi
        NEW.role := OLD.role;
        NEW.is_vip := OLD.is_vip;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_fields();

-- 8. CHÍNH SÁCH BẢO MẬT CHO BẢNG questions
DROP POLICY IF EXISTS "questions_select_policy" ON public.questions;
CREATE POLICY "questions_select_policy" ON public.questions
    FOR SELECT TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "questions_insert_policy" ON public.questions;
CREATE POLICY "questions_insert_policy" ON public.questions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "questions_update_policy" ON public.questions;
CREATE POLICY "questions_update_policy" ON public.questions
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "questions_delete_policy" ON public.questions;
CREATE POLICY "questions_delete_policy" ON public.questions
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- 9. CHÍNH SÁCH BẢO MẬT CHO BẢNG study_logs
DROP POLICY IF EXISTS "study_logs_select_policy" ON public.study_logs;
CREATE POLICY "study_logs_select_policy" ON public.study_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "study_logs_insert_policy" ON public.study_logs;
CREATE POLICY "study_logs_insert_policy" ON public.study_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 10. TẠO STORAGE BUCKET 'avatars' VÀ CHÍNH SÁCH
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;
CREATE POLICY "avatars_public_select" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_user_insert" ON storage.objects;
CREATE POLICY "avatars_user_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
CREATE POLICY "avatars_user_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars');

-- 11. TRIGGER TỰ ĐỘNG TẠO PROFILE KHI ĐĂNG NHẬP / XÁC THỰC LẦN ĐẦU
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT := 'user';
    v_is_vip BOOLEAN := false;
    v_full_name TEXT;
BEGIN
    -- Lấy tên từ raw_user_meta_data nếu có, hoặc tách từ email
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- TỰ ĐỘNG CẤP QUYỀN ADMIN CHO EMAIL CỦA BẠN (hungpv2172002@gmail.com)
    -- Bạn cũng có thể thay thế hoặc bổ sung email mong muốn vào đây
    IF LOWER(NEW.email) = LOWER('hungpv2172002@gmail.com') OR LOWER(NEW.email) = LOWER('YOUR_EMAIL@gmail.com') THEN
        v_role := 'admin';
        v_is_vip := true;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_vip, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        v_full_name,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        v_role,
        v_is_vip,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 12. NẠP DỮ LIỆU MẪU BAN ĐẦU (35 CÂU HỎI THỰC TẾ ĐỂ THỰC HÀNH VƯỢT MỐC 30 CÂU)
INSERT INTO public.questions (vi, hints, answers, created_date)
VALUES
(
    'Có lẽ chúng ta cần thêm thời gian để hoàn thành dự án này.',
    'perhaps = có lẽ; need more time = cần thêm thời gian; project = dự án',
    ARRAY[
        'Perhaps we need more time to finish this project.',
        'Perhaps we need more time to complete this project.',
        'Maybe we need more time to complete this project.',
        'Maybe we need more time to finish this project.'
    ],
    CURRENT_DATE
),
(
    'Bạn có thể nói chậm lại một chút được không?',
    'speak slowly = nói chậm lại; a little bit = một chút; could you = bạn có thể',
    ARRAY[
        'Could you speak a little more slowly?',
        'Could you speak more slowly, please?',
        'Can you speak a little slower?',
        'Can you speak more slowly?'
    ],
    CURRENT_DATE
),
(
    'Hôm nay thời tiết đẹp quá, chúng ta đi dạo nhé!',
    'nice weather = thời tiết đẹp; go for a walk = đi dạo; shall we = chúng ta ... nhé',
    ARRAY[
        'The weather is so nice today, let''s go for a walk!',
        'It''s such nice weather today, let''s go for a walk!',
        'The weather is very nice today, shall we go for a walk?'
    ],
    CURRENT_DATE
),
(
    'Tôi rất xin lỗi vì đã để bạn phải chờ lâu.',
    'sorry for = xin lỗi vì; keep someone waiting = để ai đó chờ đợi; so long = lâu',
    ARRAY[
        'I am so sorry for keeping you waiting so long.',
        'I''m so sorry for keeping you waiting so long.',
        'I am sorry to keep you waiting so long.',
        'I''m sorry to keep you waiting for so long.'
    ],
    CURRENT_DATE
),
(
    'Đừng ngần ngại liên hệ với tôi nếu bạn cần thêm bất kỳ sự trợ giúp nào.',
    'hesitate = ngần ngại; contact = liên hệ; further assistance = hỗ trợ thêm',
    ARRAY[
        'Don''t hesitate to contact me if you need any further help.',
        'Do not hesitate to contact me if you need further assistance.',
        'Feel free to contact me if you need any help.'
    ],
    CURRENT_DATE
),
(
    'Cảm ơn bạn rất nhiều vì đã dành thời gian quý báu cho tôi.',
    'valuable time = thời gian quý báu; thank you for = cảm ơn vì; sparing time = dành thời gian',
    ARRAY[
        'Thank you very much for giving me your valuable time.',
        'Thank you so much for your valuable time.',
        'Thanks a lot for spending your valuable time with me.'
    ],
    CURRENT_DATE
),
(
    'Tôi đồng ý hoàn toàn với quan điểm của bạn về vấn đề này.',
    'totally agree = hoàn toàn đồng ý; point of view = quan điểm; regarding = về vấn đề',
    ARRAY[
        'I completely agree with your point of view on this matter.',
        'I totally agree with your opinion on this issue.',
        'I couldn''t agree more with your point of view on this matter.'
    ],
    CURRENT_DATE
),
(
    'Bạn đã từng đến thăm thành phố Đà Nẵng bao giờ chưa?',
    'have you ever been to = bạn đã từng đến; visit = thăm',
    ARRAY[
        'Have you ever visited Da Nang city before?',
        'Have you ever been to Da Nang city?',
        'Have you ever visited Da Nang?'
    ],
    CURRENT_DATE
),
(
    'Làm ơn cho tôi một tách cà phê sữa đá ít đường.',
    'iced milk coffee = cà phê sữa đá; less sugar = ít đường; please = làm ơn',
    ARRAY[
        'Please give me a cup of iced milk coffee with less sugar.',
        'Can I have an iced milk coffee with less sugar, please?',
        'I would like an iced milk coffee with less sugar, please.'
    ],
    CURRENT_DATE
),
(
    'Chúng tôi dự định sẽ ra mắt sản phẩm mới vào cuối tháng này.',
    'plan to = dự định; launch = ra mắt; new product = sản phẩm mới; by the end of = vào cuối',
    ARRAY[
        'We plan to launch the new product by the end of this month.',
        'We are planning to release our new product at the end of this month.',
        'We plan to release the new product by the end of this month.'
    ],
    CURRENT_DATE
),
(
    'Thành thật mà nói, tôi không nghĩ đây là một ý tưởng hay.',
    'to be honest = thành thật mà nói; frankly = thẳng thắn; good idea = ý tưởng hay',
    ARRAY[
        'To be honest, I don''t think this is a good idea.',
        'Frankly speaking, I don''t think this is a good idea.',
        'Honestly, I don''t think that is a good idea.'
    ],
    CURRENT_DATE
),
(
    'Cuộc họp hôm nay sẽ bị hoãn lại cho đến thứ Sáu tuần tới.',
    'meeting = cuộc họp; postpone = hoãn lại; delay = dời lại; until next Friday = tới thứ Sáu',
    ARRAY[
        'Today''s meeting will be postponed until next Friday.',
        'The meeting today is postponed until next Friday.',
        'Today''s meeting will be delayed until next Friday.'
    ],
    CURRENT_DATE
),
(
    'Bạn thường làm gì vào những ngày cuối tuần rảnh rỗi?',
    'free time = thời gian rảnh; on weekends = vào cuối tuần; usually do = thường làm',
    ARRAY[
        'What do you usually do on your free weekends?',
        'What do you usually do during your free weekends?',
        'What do you often do on the weekend when you are free?'
    ],
    CURRENT_DATE
),
(
    'Hãy nhớ tắt đèn và điều hòa trước khi rời khỏi văn phòng.',
    'remember to = nhớ; turn off = tắt; air conditioner = điều hòa; leave = rời khỏi',
    ARRAY[
        'Remember to turn off the lights and air conditioner before leaving the office.',
        'Don''t forget to turn off the lights and the air conditioner before you leave the office.',
        'Please remember to turn off lights and air conditioning before leaving the office.'
    ],
    CURRENT_DATE
),
(
    'Tôi đang cố gắng cải thiện kỹ năng phát âm tiếng Anh của mình mỗi ngày.',
    'try to improve = cố gắng cải thiện; pronunciation skills = kỹ năng phát âm; every day = mỗi ngày',
    ARRAY[
        'I am trying to improve my English pronunciation skills every day.',
        'I''m trying to improve my English pronunciation every single day.',
        'I am working on improving my English pronunciation skills every day.'
    ],
    CURRENT_DATE
),
(
    'Giá của chiếc máy tính này quá đắt so với ngân sách của tôi.',
    'price = giá cả; expensive = đắt đỏ; compared to = so với; budget = ngân sách',
    ARRAY[
        'The price of this laptop is too expensive for my budget.',
        'The price of this computer is too high compared to my budget.',
        'This computer is too expensive compared to my budget.'
    ],
    CURRENT_DATE
),
(
    'Bạn có phiền nếu tôi mở cửa sổ ra một chút không?',
    'would you mind = bạn có phiền; open the window = mở cửa sổ; a little bit = một chút',
    ARRAY[
        'Would you mind if I opened the window a little bit?',
        'Do you mind if I open the window a little bit?',
        'Would you mind if I open the window a little?'
    ],
    CURRENT_DATE
),
(
    'Kinh nghiệm làm việc thực tế quan trọng hơn nhiều so với lý thuyết.',
    'practical work experience = kinh nghiệm thực tế; much more important = quan trọng hơn nhiều; theory = lý thuyết',
    ARRAY[
        'Practical work experience is much more important than theory.',
        'Real work experience is far more important than theory.',
        'Hands-on experience is much more important than theoretical knowledge.'
    ],
    CURRENT_DATE
),
(
    'Chúng tôi đã có một chuyến du lịch đáng nhớ cùng cả gia đình.',
    'memorable trip = chuyến đi đáng nhớ; with the whole family = cùng cả gia đình',
    ARRAY[
        'We had a memorable trip with the whole family.',
        'We had an unforgettable trip with our whole family.',
        'We enjoyed a memorable vacation with the entire family.'
    ],
    CURRENT_DATE
),
(
    'Rất vui được hợp tác với bạn trong dự án đầy thử thách này.',
    'pleasure = niềm vinh hạnh/vui; collaborate = hợp tác; challenging project = dự án thử thách',
    ARRAY[
        'It is a pleasure to cooperate with you on this challenging project.',
        'It''s a great pleasure to collaborate with you on this challenging project.',
        'I am pleased to work with you on this challenging project.'
    ],
    CURRENT_DATE
),
(
    'Bạn có thể giới thiệu cho tôi một vài món ăn đặc sản ở đây không?',
    'recommend = giới thiệu/gợi ý; local specialties = món đặc sản địa phương; dishes = món ăn',
    ARRAY[
        'Can you recommend some local specialties here for me?',
        'Could you recommend some local dishes here to me?',
        'Can you recommend a few special dishes around here?'
    ],
    CURRENT_DATE
),
(
    'Tôi thường dành khoảng ba mươi phút mỗi buổi sáng để đọc sách.',
    'spend time = dành thời gian; about thirty minutes = khoảng 30 phút; read books = đọc sách',
    ARRAY[
        'I usually spend about thirty minutes reading books every morning.',
        'I often spend around 30 minutes reading books each morning.',
        'I usually spend about 30 minutes every morning reading books.'
    ],
    CURRENT_DATE
),
(
    'Giao thông vào giờ cao điểm ở thành phố này thực sự rất tồi tệ.',
    'traffic = giao thông; rush hour = giờ cao điểm; really terrible = thực sự tồi tệ',
    ARRAY[
        'Traffic during rush hour in this city is really terrible.',
        'The rush hour traffic in this city is really awful.',
        'The traffic at rush hour in this city is really bad.'
    ],
    CURRENT_DATE
),
(
    'Mọi sự nỗ lực và kiên trì của bạn cuối cùng rồi cũng sẽ được đền đáp.',
    'effort = sự nỗ lực; perseverance = sự kiên trì; pay off = được đền đáp; in the end = cuối cùng',
    ARRAY[
        'All your effort and perseverance will eventually pay off.',
        'All your efforts and persistence will pay off in the end.',
        'Your hard work and perseverance will finally pay off.'
    ],
    CURRENT_DATE
),
(
    'Tôi muốn kiểm tra lại thông tin vé máy bay của mình một lần nữa.',
    'would like to = muốn; double-check = kiểm tra lại; flight ticket information = thông tin vé máy bay',
    ARRAY[
        'I would like to check my flight ticket information once again.',
        'I want to double-check my flight ticket information one more time.',
        'I''d like to recheck my flight information once again.'
    ],
    CURRENT_DATE
),
(
    'Bạn có nghĩ rằng trí tuệ nhân tạo sẽ thay đổi thế giới trong tương lai?',
    'artificial intelligence (AI) = trí tuệ nhân tạo; change the world = thay đổi thế giới; in the future = trong tương lai',
    ARRAY[
        'Do you think artificial intelligence will change the world in the future?',
        'Do you believe that AI will change the world in the future?',
        'Do you think that artificial intelligence is going to change the world in the future?'
    ],
    CURRENT_DATE
),
(
    'Dù trời mưa to, họ vẫn quyết định tiếp tục trận đấu bóng đá.',
    'despite = mặc dù; heavy rain = mưa to; decide to continue = quyết định tiếp tục; match = trận đấu',
    ARRAY[
        'Despite the heavy rain, they decided to continue the football match.',
        'Although it rained heavily, they decided to continue the soccer match.',
        'In spite of heavy rain, they still decided to go on with the football match.'
    ],
    CURRENT_DATE
),
(
    'Cô ấy luôn giữ thái độ lạc quan và tích cực ngay cả trong những lúc khó khăn nhất.',
    'optimistic = lạc quan; positive attitude = thái độ tích cực; difficult times = lúc khó khăn',
    ARRAY[
        'She always keeps an optimistic and positive attitude even in the most difficult times.',
        'She always maintains a positive and optimistic attitude even during the hardest times.',
        'She always stays optimistic and positive even in tough situations.'
    ],
    CURRENT_DATE
),
(
    'Xin lỗi vì đã cắt ngang lời bạn, nhưng tôi có một câu hỏi quan trọng.',
    'sorry for interrupting = xin lỗi vì ngắt lời; have an important question = có câu hỏi quan trọng',
    ARRAY[
        'Sorry for interrupting you, but I have an important question.',
        'I am sorry to interrupt, but I have an important question.',
        'Pardon me for interrupting, but I have an important question.'
    ],
    CURRENT_DATE
),
(
    'Học một ngôn ngữ mới đòi hỏi sự kiên nhẫn và luyện tập hàng ngày.',
    'learning a new language = học ngôn ngữ mới; requires = đòi hỏi; patience = sự kiên nhẫn; daily practice = luyện tập hàng ngày',
    ARRAY[
        'Learning a new language requires patience and daily practice.',
        'Learning a foreign language requires patience and consistent daily practice.',
        'To learn a new language requires patience and everyday practice.'
    ],
    CURRENT_DATE
),
(
    'Chúc mừng bạn đã hoàn thành xuất sắc bài thuyết trình hôm nay!',
    'congratulations on = chúc mừng về; excellent presentation = bài thuyết trình xuất sắc',
    ARRAY[
        'Congratulations on your excellent presentation today!',
        'Congratulations on completing your presentation excellently today!',
        'Congrats on giving an outstanding presentation today!'
    ],
    CURRENT_DATE
),
(
    'Nếu bạn có bất kỳ thắc mắc nào, xin vui lòng giơ tay phát biểu.',
    'questions = thắc mắc; please raise your hand = xin vui lòng giơ tay; speak up = phát biểu',
    ARRAY[
        'If you have any questions, please feel free to raise your hand.',
        'If you have any questions, please raise your hand to speak.',
        'Should you have any questions, please raise your hand.'
    ],
    CURRENT_DATE
),
(
    'Chúng ta nên tìm ra giải pháp đôi bên cùng có lợi cho hợp đồng này.',
    'win-win solution = giải pháp đôi bên cùng có lợi; find out = tìm ra; contract = hợp đồng',
    ARRAY[
        'We should find a win-win solution for this contract.',
        'We need to figure out a win-win solution for this deal.',
        'We ought to find a mutually beneficial solution for this contract.'
    ],
    CURRENT_DATE
),
(
    'Tôi thường uống một ly nước ấm ngay sau khi thức dậy vào buổi sáng.',
    'glass of warm water = ly nước ấm; right after = ngay sau khi; wake up = thức dậy',
    ARRAY[
        'I usually drink a glass of warm water right after waking up in the morning.',
        'I often drink a cup of warm water right after I wake up in the morning.',
        'I usually have a glass of warm water immediately after waking up.'
    ],
    CURRENT_DATE
),
(
    'Sự thành công của bạn hôm nay là phần thưởng xứng đáng cho mọi nỗ lực.',
    'success = sự thành công; well-deserved reward = phần thưởng xứng đáng; efforts = nỗ lực',
    ARRAY[
        'Your success today is a well-deserved reward for all your efforts.',
        'Your success today is well-deserved for all your hard work.',
        'Your achievement today is a well-deserved reward for your continuous effort.'
    ],
    CURRENT_DATE
);
