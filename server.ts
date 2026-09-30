import express from 'express';
import { installDurableDuel } from './server/durableDuel';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { INITIAL_QUESTIONS } from './src/data/initialQuestions';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Cho phép CORS và hỗ trợ cả URL có tiền tố /api và không có tiền tố /api (đặc thù khi Vercel rewrite)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Nếu chạy trên serverless và đường dẫn thiếu /api (do rewrite)
  if (process.env.VERCEL && !req.url.startsWith('/api') && !req.url.startsWith('/index.html') && req.url !== '/') {
    req.url = '/api' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  next();
});

// Khởi tạo Gemini AI server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Khởi tạo Supabase Admin nếu có service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabaseAdmin = !!(supabaseUrl && supabaseServiceKey);

const supabaseAdmin = hasSupabaseAdmin
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

installDurableDuel(app, supabaseAdmin, () => memoryQuestionsStore);

// Bộ nhớ câu hỏi đệm (In-memory questions store)
// Đảm bảo học viên luôn học được câu mới ngay lập tức kể cả khi Supabase đang bị lỗi phân quyền
let memoryQuestionsStore: any[] = INITIAL_QUESTIONS.map((q, i) => ({
  id: i + 1,
  vi: q.vi,
  hints: q.hints,
  answers: q.answers,
  category: q.category || 'general',
  level: q.level || 'B1',
  created_date: new Date().toISOString().split('T')[0],
}));

// Cài đặt tên, biểu tượng và kênh liên lạc ứng dụng (có thể chỉnh sửa từ trang Admin)
const SETTINGS_FILE = path.join(process.cwd(), 'app-settings.json');
let appSettings: Record<string, any> = {
  appName: 'Dịch Mỗi Ngày',
  appSubtitle: 'Dịch câu mỗi ngày kèm từ vựng gợi ý',
  appIcon: '🎯',
  appIconType: 'emoji',
  themeColor: 'indigo',
  bgTheme: 'default',
  showAnnouncement: true,
  announcementText: '🔥 Khuyến mãi VIP Trọn Đời: Mở khóa toàn bộ chuyên ngành IT, Kinh Doanh & Du Lịch!',
  announcementType: 'vip',
  announcementLinkText: 'Nâng cấp VIP',
  heroGreeting: 'Luyện dịch mỗi ngày để phản xạ tiếng Anh tự nhiên',
  heroSubtext: 'Học dịch từng câu, tra từ vựng thông minh và thi đấu Boss tiếng Anh',
  contactPhone: '0987.654.321',
  contactZalo: 'https://zalo.me/0987654321',
  contactEmail: 'hungpv2172002@gmail.com',
  contactFacebook: 'https://facebook.com',
  contactTiktok: 'https://tiktok.com',
  contactTelegram: '',
};

// Đọc cài đặt đã lưu nếu có (thử cả app-settings.json và /tmp/app-settings.json)
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    if (saved && typeof saved === 'object') {
      appSettings = { ...appSettings, ...saved };
    }
  } else if (fs.existsSync('/tmp/app-settings.json')) {
    const savedTmp = JSON.parse(fs.readFileSync('/tmp/app-settings.json', 'utf-8'));
    if (savedTmp && typeof savedTmp === 'object') {
      appSettings = { ...appSettings, ...savedTmp };
    }
  }
} catch (e) {
  console.warn('Không thể đọc file app-settings.json:', e);
}

/**
 * Đảo câu hỏi theo ngày bằng seeded PRNG
 * Giúp mỗi ngày người học có một danh sách câu hoàn toàn khác biệt
 */
function getDailyRotatedQuestions(allQuestions: any[], dateStr?: string): any[] {
  if (!allQuestions || allQuestions.length === 0) return [];
  const today = dateStr || new Date().toISOString().split('T')[0];
  let seed = 0;
  for (let i = 0; i < today.length; i++) {
    seed = ((seed << 5) - seed) + today.charCodeAt(i);
    seed |= 0;
  }
  seed = Math.abs(seed) || 12345;
  const random = () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const todayQuestions = allQuestions.filter((q) => q.created_date === today);
  const otherQuestions = allQuestions.filter((q) => q.created_date !== today);

  const shuffledToday = [...todayQuestions];
  for (let i = shuffledToday.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledToday[i], shuffledToday[j]] = [shuffledToday[j], shuffledToday[i]];
  }

  const shuffledOthers = [...otherQuestions];
  for (let i = shuffledOthers.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
  }

  return [...shuffledToday, ...shuffledOthers];
}

// Health check endpoint
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasSupabaseAdmin,
  });
});

// Endpoint /api/cron/generate theo yêu cầu của dự án
app.all(['/api/cron/generate', '/cron/generate'], async (req, res) => {
  try {
    const expectedSecret = process.env.CRON_SECRET || 'my_super_secret_cron_token_12345';
    const allowedSecrets = new Set([
      expectedSecret,
      'my_super_secret_cron_token_12345',
    ]);

    const authHeader = req.headers.authorization || (req.headers['x-cron-secret'] as string | undefined);
    const queryKey = (req.query.key || req.query.secret || req.query.token) as string | undefined;
    const bodyKey = req.body && typeof req.body === 'object' ? req.body.secret || req.body.key : undefined;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : (authHeader || queryKey || bodyKey);

    // Nếu người dùng truy cập trực tiếp từ trình duyệt mà không truyền key
    if (!token || !allowedSecrets.has(token)) {
      if (req.headers.accept?.includes('text/html')) {
        return res.status(401).send(`
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Cron API Authentication</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 40px 20px; display: flex; justify-content: center; }
              .card { background: white; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 32px; max-width: 540px; width: 100%; border: 1px solid #e2e8f0; }
              h1 { font-size: 20px; color: #0f172a; margin-top: 0; }
              p { font-size: 14px; line-height: 1.6; color: #64748b; }
              code { background: #f1f5f9; padding: 3px 6px; border-radius: 6px; font-family: monospace; color: #4f46e5; font-size: 13px; word-break: break-all; }
              .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 20px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; margin-top: 16px; }
              .btn:hover { background: #4338ca; }
              .tip { background: #fef3c7; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 12px; color: #92400e; font-size: 13px; margin: 16px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🔑 Yêu cầu Secret Key để kích hoạt Cron API</h1>
              <p>Endpoint này được bảo mật để tránh việc bị gọi tự động trái phép gây tốn chi phí API.</p>
              
              <div class="tip">
                <strong>💡 Cách chạy nhanh:</strong> Bạn có thể thêm <code>?key=my_super_secret_cron_token_12345</code> vào cuối URL.
              </div>

              <p>Hoặc bấm vào nút bên dưới để chạy trực tiếp ngay:</p>
              <a class="btn" href="/api/cron/generate?key=my_super_secret_cron_token_12345">
                ⚡ Kích hoạt sinh câu với Secret Key mặc định
              </a>
              
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                Headers: <code>Authorization: Bearer my_super_secret_cron_token_12345</code>
              </div>
            </div>
          </body>
          </html>
        `);
      }

      return res.status(401).json({
        error: 'Unauthorized: Secret key không hợp lệ hoặc thiếu.',
        message: 'Vui lòng cung cấp Secret Key qua query parameter ?key=... hoặc header Authorization.',
        quick_run_url: '/api/cron/generate?key=my_super_secret_cron_token_12345',
        how_to_use: {
          browser_or_get: '/api/cron/generate?key=my_super_secret_cron_token_12345',
          header: 'Authorization: Bearer my_super_secret_cron_token_12345',
        },
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trong hệ thống.',
      });
    }

    const requestedCategory =
      ((req.query.category || req.body?.category) as string | undefined)?.toLowerCase() || 'general';

    let industryInstruction = 'giao tiếp đời thường và xã hội thực tế';
    if (requestedCategory === 'it') {
      industryInstruction =
        'chuyên ngành Công Nghệ Thông Tin & Lập Trình (IT, Tech, Scrum/Agile, review code, bug report, deploy server, API, database queries, sprint)';
    } else if (requestedCategory === 'business') {
      industryInstruction =
        'chuyên ngành Kinh Doanh, Bán Hàng & Marketing (Business, Sales, đàm phán hợp đồng, pitching, khách hàng doanh nghiệp, báo cáo doanh thu, chiết khấu)';
    } else if (requestedCategory === 'hospitality') {
      industryInstruction =
        'chuyên ngành Khách Sạn, Nhà Hàng & Du Lịch (Hospitality & Tourism, lễ tân check-in, tiếp đón khách nước ngoài, xử lý phàn nàn, phục vụ buffet)';
    }

    const prompt = `Bạn là một chuyên gia ngôn ngữ tiếng Anh và tiếng Việt.
Hãy tạo đúng 10 câu luyện dịch chuyên sâu thuộc chủ đề: ${industryInstruction} từ tiếng Việt sang tiếng Anh cực kỳ thiết thực, tự nhiên và hữu ích cho người học.
Mỗi câu bài tập gồm:
1. "vi": Câu tiếng Việt tự nhiên trong bối cảnh thực tế nêu trên.
2. "hints": Gợi ý 2-3 từ vựng hoặc cụm từ then chốt (ví dụ: "pull request = yêu cầu pull; review code = xem xét mã nguồn").
3. "answers": Mảng gồm ít nhất 2 đến 4 câu tiếng Anh tương đương chuẩn xác và được chấp nhận (bao gồm cả cách nói rút gọn như "don't" và đầy đủ "do not").`;

    // Danh sách model ưu tiên tự động cân bằng tải (ưu tiên model phản hồi nhanh và ổn định nhất)

    const CANDIDATE_MODELS = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.1-pro-preview',
    ];

    let questionsData: any[] = [];
    let successfulModel = '';

    if (process.env.GEMINI_API_KEY) {
      for (const modelCandidate of CANDIDATE_MODELS) {
        try {
          console.log(`Đang gọi Gemini model: ${modelCandidate}...`);
          const response = await ai.models.generateContent({
            model: modelCandidate,
            contents: prompt,
            config: {
              temperature: 0.7,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                description: 'Danh sách 10 câu dịch giao tiếp',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    vi: { type: Type.STRING },
                    hints: { type: Type.STRING },
                    answers: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ['vi', 'hints', 'answers'],
                },
              },
            },
          });

          const textOutput = response.text?.trim() || '[]';
          const parsed = JSON.parse(textOutput);
          if (Array.isArray(parsed) && parsed.length > 0) {
            questionsData = parsed;
            successfulModel = modelCandidate;
            console.log(`Sinh câu thành công với model ${modelCandidate}!`);
            break;
          }
        } catch {
          // Khi model tạm thời bận hoặc cao tải, chuyển mượt mà sang model kế tiếp
          console.log(`[AI Load Balancer] Model ${modelCandidate} đang bận, chuyển sang model kế tiếp...`);
        }
      }
    }

    // Nếu các model AI tạm thời quá tải hoặc chưa cấu hình API key:
    // Sử dụng ngân hàng câu hỏi giao tiếp phong phú có sẵn để người học không bị gián đoạn
    let isCuratedFallback = false;
    if (questionsData.length === 0) {
      console.log('[AI Fallback] Kích hoạt ngân hàng câu hỏi giao tiếp chuẩn.');
      isCuratedFallback = true;
      const matchingPool = INITIAL_QUESTIONS.filter(
        (q) => (q.category || 'general') === requestedCategory
      );
      const poolToUse = matchingPool.length > 0 ? matchingPool : INITIAL_QUESTIONS;
      const shuffled = [...poolToUse].sort(() => Math.random() - 0.5);
      questionsData = shuffled.slice(0, 10).map((item) => ({
        vi: item.vi,
        hints: item.hints,
        answers: item.answers,
        category: requestedCategory,
      }));
    }

    const today = new Date().toISOString().split('T')[0];
    const records = questionsData.map((q: any) => ({
      vi: q.vi,
      hints: q.hints,
      answers: Array.isArray(q.answers) ? q.answers : [q.answers],
      created_date: today,
      category: requestedCategory,
    }));


    // Luôn đưa câu hỏi mới vào bộ nhớ đệm để người học có thể làm bài ngay tức thì
    const newWithLocalIds = records.map((r: any, idx: number) => ({
      id: Date.now() + idx,
      ...r,
    }));
    memoryQuestionsStore = [...newWithLocalIds, ...memoryQuestionsStore];

    let insertedData = null;
    let supabaseSaveSuccess = false;
    let supabaseWarning: string | null = null;
    let fixSql: string | null = null;

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('questions')
          .insert(records)
          .select();

        if (error) {
          console.warn('Lưu vào Supabase thất bại:', error.message);
          const isTableMissing =
            error.message?.includes('schema cache') ||
            error.message?.includes('does not exist') ||
            error.code === 'PGRST204';
          const isPermissionDenied =
            error.message?.includes('permission denied') ||
            error.code === '42501';

          if (isTableMissing) {
            supabaseWarning = 'table_missing';
          } else if (isPermissionDenied) {
            supabaseWarning = 'permission_denied';
            fixSql = 'GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;\nGRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;\nGRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;';
          } else {
            supabaseWarning = error.message;
          }
        } else if (data) {
          supabaseSaveSuccess = true;
          insertedData = data;
        }
      } catch (dbEx: any) {
        console.warn('Ngoại lệ khi gọi Supabase:', dbEx.message);
        supabaseWarning = dbEx.message;
      }
    }

    return res.json({
      success: true,
      message: isCuratedFallback
        ? `Đã nạp ${records.length} câu hỏi giao tiếp chuẩn chọn lọc.`
        : `Đã sinh thành công ${records.length} câu hỏi mới bằng Gemini AI (${successfulModel})!`,
      count: records.length,
      modelUsed: successfulModel || 'curated_database',
      isCuratedFallback,
      insertedToSupabase: supabaseSaveSuccess,
      supabaseWarning,
      fixSql,
      data: insertedData || newWithLocalIds,
    });
  } catch (err: any) {
    console.error('Lỗi khi sinh câu hỏi:', err);
    return res.status(500).json({
      error: err.message || 'Lỗi server khi sinh câu hỏi',
    });
  }
});

// Endpoint lấy danh sách câu hỏi phục vụ học viên
// Hỗ trợ tự động đảo câu theo ngày (daily rotation), mỗi ngày một danh sách câu mới mẻ
app.get(['/api/questions', '/questions'], async (req, res) => {
  const queryDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const mode = (req.query.mode as string) || 'daily'; // 'daily' hoặc 'raw'

  let rawQuestions = memoryQuestionsStore;
  let source = 'memory';

  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('questions')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        rawQuestions = data;
        source = 'supabase';
      }
    }
  } catch (err: any) {
    console.warn('Lỗi đọc câu hỏi từ Supabase, chuyển sang bộ nhớ đệm:', err.message);
  }

  // Luôn hợp nhất với INITIAL_QUESTIONS để đảm bảo 100% luôn có đầy đủ các câu hỏi chuyên ngành IT, Business, Hospitality
  const existingIds = new Set(rawQuestions.map((q: any) => q.id));
  const missingQuestions = INITIAL_QUESTIONS.filter((q) => !existingIds.has(q.id));
  if (missingQuestions.length > 0) {
    rawQuestions = [...rawQuestions, ...missingQuestions];
  }

  // Lọc theo chuyên ngành nghề nghiệp nếu có yêu cầu (it, business, hospitality, general)

  const category = (req.query.category as string | undefined)?.toLowerCase();
  let pool = rawQuestions;
  if (category && category !== 'all') {
    const matched = rawQuestions.filter((q) => (q.category || 'general') === category);
    if (matched.length > 0) {
      pool = matched;
    }
  }

  // Tự động đảo câu hỏi theo ngày nếu mode !== 'raw'
  const finalQuestions = mode === 'raw'
    ? pool
    : getDailyRotatedQuestions(pool, queryDate);

  return res.json({
    success: true,
    questions: finalQuestions,
    total: finalQuestions.length,
    date: queryDate,
    category: category || 'all',
    isRotatedDaily: mode !== 'raw',
    source,
  });

});

// Endpoint lấy cài đặt thương hiệu ứng dụng (Tên, Biểu tượng & Kênh liên hệ)
app.get(['/api/settings', '/settings'], async (req, res) => {
  if (supabaseAdmin) {
    try {
      const { data: dbData } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('id', 'default')
        .maybeSingle();
      if (dbData?.value && typeof dbData.value === 'object') {
        appSettings = { ...appSettings, ...dbData.value };
      }
    } catch (e) {
      // Tiếp tục nếu bảng chưa tồn tại
    }
  }

  return res.json({
    success: true,
    settings: appSettings,
  });
});

// Endpoint cập nhật cài đặt ứng dụng từ trang Admin
app.post(['/api/settings', '/settings'], async (req, res) => {
  try {
    const payload = req.body || {};
    // Gộp tất cả các trường cấu hình hợp lệ
    for (const key of Object.keys(payload)) {
      if (payload[key] !== undefined) {
        appSettings[key] = payload[key];
      }
    }

    // 1. Ghi vào file disk
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2), 'utf-8');
    } catch (e) {
      try {
        fs.writeFileSync('/tmp/app-settings.json', JSON.stringify(appSettings, null, 2), 'utf-8');
      } catch (e2) {}
    }

    // 2. Đồng bộ lên Supabase nếu có kết nối
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('app_settings').upsert({
          id: 'default',
          value: appSettings,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Lỗi lưu app_settings vào Supabase:', dbErr);
      }
    }

    return res.json({
      success: true,
      message: 'Đã lưu thay đổi cài đặt ứng dụng thành công!',
      settings: appSettings,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint Trợ lý từ vựng AI (Tra từ / cụm từ theo ngữ cảnh & đối chiếu Google Dịch)
app.post(['/api/lookup-word', '/lookup-word'], async (req, res) => {
  try {
    const { word, contextSentence, category } = req.body || {};
    if (!word || typeof word !== 'string' || !word.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp từ hoặc cụm từ bạn muốn tra.',
      });
    }

    const cleanWord = word.trim();
    const cleanContext = typeof contextSentence === 'string' ? contextSentence.trim() : '';
    const cleanCategory = typeof category === 'string' ? category.trim() : 'general';

    const googleTranslateUrl = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(
      cleanWord
    )}&op=translate`;

    let lookupData: any = null;

    if (process.env.GEMINI_API_KEY) {
      const prompt = `Bạn là Trợ lý từ vựng và gia sư dịch thuật tiếng Anh chuyên nghiệp trong ứng dụng "Dịch Mỗi Ngày".
Người học đang làm bài tập dịch câu sau: "${cleanContext}" (Chủ đề: ${cleanCategory}).
Người học đang bị bối rối hoặc chưa biết từ/cụm từ này: "${cleanWord}".

Hãy phân tích và gợi ý cách dịch chính xác, tự nhiên nhất cho từ/cụm từ này trong ngữ cảnh câu trên.
Đảm bảo trả về ĐÚNG 1 JSON Object tuân thủ nghiêm ngặt cấu trúc sau:
{
  "query": "${cleanWord}",
  "bestMatch": "Từ hoặc cụm từ tiếng Anh tương đương chuẩn xác nhất (ví dụ: 'reschedule the meeting', 'keep someone posted')",
  "phonetic": "Phiên âm IPA chuẩn quốc tế nếu có (ví dụ: '/ˌriːˈskedʒ.uːl/')",
  "partOfSpeech": "Từ loại ngắn gọn (noun, verb, phrasal verb, adjective, idiom...)",
  "meaningVi": "Nghĩa tiếng Việt ngắn gọn, đúng ngữ cảnh câu đang dịch",
  "explanation": "Giải thích 1-2 câu ngắn gọn, dễ hiểu về cách dùng từ này trong câu người học đang gặp",
  "synonyms": ["Từ đồng nghĩa 1", "Từ đồng nghĩa 2"],
  "collocations": ["Cụm từ hay đi kèm 1", "Cụm từ hay đi kèm 2"],
  "exampleSentence": {
    "en": "Một câu ví dụ ngắn gọn, thực tế chứa từ đó",
    "vi": "Bản dịch tiếng Việt của câu ví dụ"
  },
  "usageTip": "Mẹo nhỏ ghi nhớ hoặc lưu ý ngữ pháp/giới từ khi dịch"
}`;

      const CANDIDATE_MODELS = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
      ];

      for (const modelCandidate of CANDIDATE_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelCandidate,
            contents: prompt,
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  query: { type: Type.STRING },
                  bestMatch: { type: Type.STRING },
                  phonetic: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  meaningVi: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  synonyms: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  collocations: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  exampleSentence: {
                    type: Type.OBJECT,
                    properties: {
                      en: { type: Type.STRING },
                      vi: { type: Type.STRING },
                    },
                  },
                  usageTip: { type: Type.STRING },
                },
                required: ['query', 'bestMatch', 'meaningVi', 'explanation'],
              },
            },
          });

          if (response.text) {
            lookupData = JSON.parse(response.text);
            break;
          }
        } catch (geminiErr: any) {
          console.warn(`Gemini (${modelCandidate}) tra từ lỗi:`, geminiErr?.message);
        }
      }
    }

    // Nếu không có Gemini hoặc gặp lỗi mạng, tạo phản hồi dự phòng thông minh
    if (!lookupData) {
      lookupData = {
        query: cleanWord,
        bestMatch: cleanWord,
        phonetic: '',
        partOfSpeech: 'Tra cứu từ',
        meaningVi: `Tra từ: ${cleanWord}`,
        explanation: 'Bạn có thể xem trực tiếp kết quả dịch nhanh trên Google Dịch.',
        synonyms: [],
        collocations: [],
        exampleSentence: {
          en: `Practice translating with "${cleanWord}"`,
          vi: `Luyện tập dịch với từ "${cleanWord}"`,
        },
        usageTip: 'Hãy xem gợi ý từ vựng trong bài tập hoặc tra trên Google Dịch.',
      };
    }

    return res.json({
      success: true,
      data: {
        ...lookupData,
        googleTranslateUrl,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Lỗi xử lý tra từ vựng.',
    });
  }
});


// Endpoint trả về nội dung file SQL để dễ dàng sao chép từ giao diện Quản Trị
app.get('/api/schema', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'supabase-schema.sql');
    if (fs.existsSync(filePath)) {
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      return res.json({ success: true, sql: sqlContent });
    }
    return res.status(404).json({ success: false, error: 'Không tìm thấy file supabase-schema.sql' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Xem trực tiếp file SQL dạng plain text trên trình duyệt
app.get('/supabase-schema.sql', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'supabase-schema.sql');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(filePath);
    }
    return res.status(404).send('Không tìm thấy file supabase-schema.sql');
  } catch (err: any) {
    return res.status(500).send('Lỗi: ' + err.message);
  }
});

// Tải file supabase-schema.sql về máy tính
app.get('/download-schema', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'supabase-schema.sql');
    if (fs.existsSync(filePath)) {
      return res.download(filePath, 'supabase-schema.sql');
    }
    return res.status(404).send('Không tìm thấy file supabase-schema.sql');
  } catch (err: any) {
    return res.status(500).send('Lỗi: ' + err.message);
  }
});

// ==========================================
// HỆ THỐNG XÁC THỰC MÃ OTP 6 SỐ GỬI QUA EMAIL
// ==========================================
interface StoredOtpRecord {
  otp: string;
  expiresAt: number;
  type: 'register' | 'forgot';
}
const otpMemoryStore = new Map<string, StoredOtpRecord>();

function createMailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  // Loại bỏ toàn bộ khoảng trắng trong mật khẩu (Google App Password thường hiển thị dạng "xxxx xxxx xxxx xxxx")
  const rawPass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || '';
  const pass = rawPass.replace(/\s+/g, '').trim();

  if (!user || !pass) {
    return null;
  }

  // Nếu host là smtp.gmail.com hoặc email là gmail
  if (host.includes('gmail.com') || user.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

// Endpoint gửi mã xác thực 6 chữ số đến hộp thư Email (Đăng ký & Quên mật khẩu)
app.post(['/api/auth/send-otp', '/auth/send-otp'], async (req, res) => {
  try {
    const { email, fullName, password, type = 'register' } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const otpType: 'register' | 'forgot' = type === 'forgot' ? 'forgot' : 'register';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Địa chỉ email không hợp lệ.' });
    }

    const transporter = createMailTransporter();
    if (!transporter) return res.status(503).json({ success: false, error: 'Dịch vụ gửi email chưa sẵn sàng.' });
    let otp: string;
    if (otpType === 'register') {
      if (!supabaseAdmin) return res.status(503).json({ success: false, error: 'Dịch vụ tài khoản chưa sẵn sàng.' });
      if (typeof password !== 'string' || password.length < 6 || password.length > 256) {
        return res.status(400).json({ success: false, error: 'Mật khẩu cần từ 6 đến 256 ký tự. Vui lòng tải lại trang rồi đăng ký.' });
      }
      // Supabase owns token storage, expiration and verification across Vercel instances.
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup', email: cleanEmail, password,
        options: { data: { full_name: String(fullName || '').slice(0, 100) } },
      });
      if (error || !data?.properties?.email_otp) {
        return res.status(400).json({ success: false, error: 'Không thể đăng ký email này. Nếu đã có tài khoản, hãy đăng nhập hoặc chọn Quên mật khẩu.' });
      }
      otp = data.properties.email_otp;
    } else {
      otp = String(100000 + crypto.randomInt(0, 900000));
      otpMemoryStore.set(cleanEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000, type: otpType });
    }
    let emailSent = false;
    let mailError: string | null = null;

    if (transporter) {
      try {
        const fromAddress =
          process.env.SMTP_FROM ||
          process.env.SMTP_USER ||
          `Daily Translation <noreply@dailytranslation.app>`;

        const isForgot = otpType === 'forgot';
        const emailSubject = isForgot
          ? `[Daily Translation] Mã khôi phục mật khẩu: ${otp}`
          : `[Daily Translation] Mã xác thực đăng ký tài khoản: ${otp}`;

        const greetingName = String(fullName || cleanEmail.split('@')[0]).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
        const actionText = isForgot
          ? 'Bạn (hoặc ai đó) vừa yêu cầu <strong>khôi phục mật khẩu</strong> tài khoản học tập trên <strong>Daily Translation</strong>.'
          : 'Bạn đang thực hiện <strong>đăng ký tài khoản học tập</strong> trên <strong>Daily Translation</strong>.';

        const reminderText = isForgot
          ? 'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được giữ an toàn.'
          : 'Vì lý do an toàn bảo mật, tuyệt đối không chia sẻ mã này cho người khác.';

        await transporter.sendMail({
          from: fromAddress,
          to: cleanEmail,
          subject: emailSubject,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;">Daily Translation</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Luyện dịch Việt ➔ Anh mỗi ngày</p>
              </div>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                Xin chào <strong>${greetingName}</strong>,
              </p>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                ${actionText} Dưới đây là mã xác thực của bạn:
              </p>
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1e1b4b; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                ⏰ Hãy sử dụng mã sớm. Nếu mã hết hạn, bạn có thể yêu cầu gửi lại. ${reminderText}
              </p>
              <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
                Daily Translation App • Hệ thống học tiếng Anh giao tiếp thông minh
              </div>
            </div>
          `,
        });
        emailSent = true;
        console.log(`[EMAIL OTP] Đã gửi mã xác thực (${otpType}) thành công tới email: ${cleanEmail}`);
      } catch (err: any) {
        console.error('Lỗi gửi email qua SMTP:', err.message);
        mailError = err.message;
      }
    } else {
      console.log(`[EMAIL OTP (Chưa cấu hình SMTP)] Tạo mã xác thực cho ${cleanEmail}: ${otp}`);
    }

    // Nếu chưa cấu hình SMTP gửi thư thật:
    if (!transporter) {
      return res.status(400).json({
        success: false,
        emailSent: false,
        hasSmtpConfigured: false,
        error:
          'Máy chủ chưa cấu hình dịch vụ gửi Email (SMTP_USER / SMTP_PASS). Vui lòng cấu hình tài khoản gửi email trên Vercel hoặc biến môi trường.',
      });
    }

    if (!emailSent && mailError) {
      return res.status(500).json({
        success: false,
        emailSent: false,
        hasSmtpConfigured: true,
        error: `Không thể gửi email xác thực: ${mailError}. Vui lòng kiểm tra lại cấu hình tài khoản gửi thư.`,
      });
    }

    return res.json({
      success: true,
      emailSent: true,
      hasSmtpConfigured: true,
      otpLength: otp.length,
      message: 'Mã xác thực 6 chữ số đã được gửi tới email của bạn.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint xác thực mã 6 số từ người dùng (cho đăng ký)
app.post(['/api/auth/verify-otp', '/auth/verify-otp'], (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp) {
      return res.status(400).json({ success: false, error: 'Thiếu email hoặc mã xác thực.' });
    }

    const record = otpMemoryStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng bấm "Gửi lại mã".',
      });
    }

    if (Date.now() > record.expiresAt) {
      otpMemoryStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực đã hết hạn hiệu lực (quá 10 phút). Vui lòng yêu cầu mã mới.',
      });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực không chính xác. Vui lòng kiểm tra lại hòm thư email của bạn.',
      });
    }

    // Khớp mã thành công! Xóa mã
    otpMemoryStore.delete(cleanEmail);
    return res.json({
      success: true,
      verified: true,
      message: 'Xác thực mã email thành công!',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint khôi phục / đặt lại mật khẩu bằng mã OTP gửi về Email
app.post(['/api/auth/reset-password', '/auth/reset-password'], async (req, res) => {
  try {
    const { email, otp, rawPassword } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanOtp || !rawPassword) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp đầy đủ email, mã xác thực và mật khẩu mới.',
      });
    }

    if (rawPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
      });
    }

    const record = otpMemoryStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã khôi phục mới.',
      });
    }

    if (Date.now() > record.expiresAt) {
      otpMemoryStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực đã hết hạn (quá 10 phút). Vui lòng yêu cầu gửi lại mã.',
      });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực không chính xác. Vui lòng kiểm tra lại hòm thư email của bạn.',
      });
    }

    // Cập nhật mật khẩu trong Supabase nếu có cấu hình
    if (supabaseAdmin) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = (listData?.users as any[])?.find((u: any) => u.email === cleanEmail);
        if (targetUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            password: rawPassword,
          });
          console.log(`[Supabase Auth] Đã cập nhật mật khẩu mới cho ${cleanEmail}`);
        }
      } catch (supaErr: any) {
        console.warn('Lỗi cập nhật mật khẩu trên Supabase:', supaErr.message);
      }
    }

    // Xóa mã OTP sau khi sử dụng thành công
    otpMemoryStore.delete(cleanEmail);

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// HỆ THỐNG ĐẤU TRƯỜNG DỊCH 1V1 THỜI GIAN THỰC (REAL-TIME WEBSOCKET DUEL)
// ==============================================================================

interface ServerDuelPlayer {
  ws: WebSocket;
  id: string;
  name: string;
  avatar_url?: string;
  isHost: boolean;
  score: number;
  currentQuestionIndex: number;
  answeredCount: number;
  isReady: boolean;
  isFinished: boolean;
  lastAnswerCorrect?: boolean;
  lastAnswerText?: string;
  typingLength?: number;
}

interface ServerDuelRoom {
  roomId: string;
  status: 'waiting' | 'countdown' | 'in_progress' | 'finished';
  category: string;
  questionCount: number;
  players: Map<string, ServerDuelPlayer>;
  questions: any[];
  currentRound: number;
  roundTimerSeconds: number;
  roundStartedAt?: number;
  winnerId?: string | null;
  firstCorrectAnswers: Map<number, string>;
  rematchVotes: Map<string, boolean>;
  countdownInterval?: NodeJS.Timeout;
}

const duelRooms = new Map<string, ServerDuelRoom>();
let quickMatchWaitingQueue: {
  ws: WebSocket;
  player: { id: string; name: string; avatar_url?: string };
  category: string;
  questionCount: number;
  bindRoom: (roomId: string) => void;
} | null = null;

function normalizeSentenceServer(text: string): string {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[.,!?;:()]/g, '')
    .replace(/\s+/g, ' ');
}

function generateDuelRoomId(): string {
  let id = '';
  do {
    const num = Math.floor(1000 + Math.random() * 9000);
    id = `DUEL-${num}`;
  } while (duelRooms.has(id));
  return id;
}

function pickDuelQuestions(count: number, category: string = 'all'): any[] {
  let pool = [...memoryQuestionsStore];
  if (category && category !== 'all' && category !== 'general') {
    const filtered = pool.filter((q) => q.category === category);
    if (filtered.length >= count) {
      pool = filtered;
    }
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function serializeRoomState(room: ServerDuelRoom): any {
  const playersObj: Record<string, any> = {};
  for (const [pId, p] of room.players.entries()) {
    playersObj[pId] = {
      id: p.id,
      name: p.name,
      avatar_url: p.avatar_url,
      isHost: p.isHost,
      score: p.score,
      currentQuestionIndex: p.currentQuestionIndex,
      answeredCount: p.answeredCount,
      isReady: p.isReady,
      isFinished: p.isFinished,
      lastAnswerCorrect: p.lastAnswerCorrect,
      lastAnswerText: p.lastAnswerText,
      typingLength: p.typingLength || 0,
    };
  }

  const rematchObj: Record<string, boolean> = {};
  for (const [pId, v] of room.rematchVotes.entries()) {
    rematchObj[pId] = v;
  }

  return {
    roomId: room.roomId,
    status: room.status,
    category: room.category,
    questionCount: room.questionCount,
    players: playersObj,
    questions: room.questions.map((q) => ({
      id: q.id,
      vi: q.vi,
      hints: q.hints,
      level: q.level || 'B1',
      category: q.category || 'general',
      answers: q.answers,
    })),
    currentRound: room.currentRound,
    roundTimerSeconds: room.roundTimerSeconds,
    roundStartedAt: room.roundStartedAt,
    winnerId: room.winnerId,
    rematchVotes: rematchObj,
  };
}

function broadcastToRoom(room: ServerDuelRoom, payload: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function broadcastRoomState(room: ServerDuelRoom) {
  broadcastToRoom(room, {
    type: 'room_state',
    state: serializeRoomState(room),
  });
}

// REST API hỗ trợ lấy thông tin phòng hoặc kiểm tra mã phòng
app.get(['/api/duel/room/:id', '/duel/room/:id'], (req, res) => {
  const roomId = req.params.id.toUpperCase().trim();
  const room = duelRooms.get(roomId);
  if (!room) {
    return res.status(404).json({ exists: false, message: 'Phòng thi đấu không tồn tại hoặc đã kết thúc' });
  }
  return res.json({
    exists: true,
    roomId: room.roomId,
    playerCount: room.players.size,
    status: room.status,
    category: room.category,
    questionCount: room.questionCount,
  });
});

app.get(['/api/duel/stats', '/duel/stats'], (req, res) => {
  let totalActivePlayers = 0;
  for (const room of duelRooms.values()) {
    totalActivePlayers += room.players.size;
  }
  return res.json({
    activeRooms: duelRooms.size,
    totalPlayers: totalActivePlayers,
    waitingInQueue: quickMatchWaitingQueue ? 1 : 0,
  });
});

// Khởi tạo WebSocketServer gắn vào httpServer
const wss = new WebSocketServer({ server: httpServer, path: '/ws/duel', maxPayload: 16384 });
const aliveSockets = new Set<WebSocket>();
const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    if (!aliveSockets.delete(socket)) { socket.terminate(); continue; }
    socket.ping();
  }
}, 30000);
heartbeat.unref();
wss.on('close', () => clearInterval(heartbeat));

type LobbyPeer = { ws: WebSocket; player: { id: string; name: string; avatar_url?: string; email?: string }; roomId: string | null };
const lobbyPeers = new Map<WebSocket, LobbyPeer>();
const duelInvites = new Map<string, { from: WebSocket; to: WebSocket; roomId: string; expiresAt: number }>();
function sendDuel(ws: WebSocket, payload: any) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
function publishLobby() {
  const players = [...lobbyPeers.values()].filter(p => !p.roomId && p.ws.readyState === WebSocket.OPEN)
    .map(p => ({ id: p.player.id, full_name: p.player.name, avatar_url: p.player.avatar_url }));
  for (const peer of lobbyPeers.values()) sendDuel(peer.ws, { type: 'lobby_players', players });
}

wss.on('connection', (ws: WebSocket) => {
  aliveSockets.add(ws);
  ws.on('pong', () => aliveSockets.add(ws));
  let currentRoomId: string | null = null;
  let currentPlayerId: string | null = null;

  ws.on('message', (messageRaw: any) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type } = data;

      const fail = (message: string) => sendDuel(ws, { type: 'error', message });
      if (type === 'register_lobby') {
        if (!data.player || typeof data.player.id !== 'string' || !data.player.id || data.player.id.length > 128) return;
        if ([...lobbyPeers.values()].some(p => p.ws !== ws && p.player.id === data.player.id)) {
          fail('Tài khoản này đang mở đấu trường ở tab khác. Hãy đóng tab đó trước.');
          ws.close(1008); return;
        }
        if (lobbyPeers.has(ws)) return;
        lobbyPeers.set(ws, { ws, player: { id: data.player.id, name: String(data.player.name || 'Người chơi').slice(0, 80), avatar_url: data.player.avatar_url, email: String(data.player.email || '').trim().toLowerCase() }, roomId: null });
        currentPlayerId = data.player.id;
        publishLobby(); return;
      }
      const peer = lobbyPeers.get(ws);
      if (!peer) { fail('Vui lòng kết nối lại đấu trường.'); return; }
      if (type === 'send_invite') {
        const room = currentRoomId && duelRooms.get(currentRoomId);
        if (!room || room.status !== 'waiting' || room.players.size !== 1) { fail('Hãy tạo phòng trống trước khi mời.'); return; }
        const target = [...lobbyPeers.values()].find(p => p.ws !== ws && (p.player.id === data.targetId || (data.targetEmail && p.player.email === String(data.targetEmail).trim().toLowerCase())));
        if (!target || target.roomId || quickMatchWaitingQueue?.ws === target.ws) { fail('Bạn này đang bận hoặc chưa vào đấu trường. Hãy gửi link phòng cho bạn.'); return; }
        for (const [id, invite] of duelInvites) if (invite.expiresAt < Date.now() || invite.from === ws) duelInvites.delete(id);
        const inviteId = crypto.randomUUID();
        duelInvites.set(inviteId, { from: ws, to: target.ws, roomId: room.roomId, expiresAt: Date.now() + 60000 });
        sendDuel(target.ws, { type: 'duel_invitation', inviteId, roomId: room.roomId, fromName: peer.player.name, expiresAt: Date.now() + 60000 });
        sendDuel(ws, { type: 'invite_sent' }); return;
      }
      if (type === 'respond_invite') {
        const invite = duelInvites.get(data.inviteId);
        if (!invite || invite.to !== ws || invite.expiresAt < Date.now()) { fail('Lời mời đã hết hạn.'); return; }
        duelInvites.delete(data.inviteId);
        if (!data.accept) { sendDuel(invite.from, { type: 'invite_declined' }); return; }
        const room = duelRooms.get(invite.roomId);
        if (currentRoomId || !room || room.status !== 'waiting' || room.players.size !== 1 || ![...room.players.values()].some(p => p.ws === invite.from)) { fail('Phòng không còn khả dụng.'); return; }
        ws.emit('message', Buffer.from(JSON.stringify({ type: 'join_room', roomId: invite.roomId })));
        return;
      }
      if (type === 'join_room' || type === 'find_match') {
        if (currentRoomId) { fail('Hãy rời phòng hiện tại trước.'); return; }
        data.player = peer.player;
        data.questionCount = [5, 10, 15, 20].includes(data.questionCount) ? data.questionCount : 5;
        data.category = typeof data.category === 'string' ? data.category.slice(0, 80) : 'all';
        if (type === 'join_room' && quickMatchWaitingQueue?.ws === ws) quickMatchWaitingQueue = null;
      }
      // 1. Tham gia phòng hoặc Tạo phòng mới
      if (type === 'join_room') {
        const { roomId: rawRoomId, player, questionCount = 5, category = 'all' } = data;
        const pId = player?.id || `player-${Date.now()}`;
        const pName = player?.name || 'Chiến binh';
        const pAvatar = player?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pId}`;

        let targetRoomId = (rawRoomId || '').toUpperCase().trim();
        let room: ServerDuelRoom | undefined;

        if (targetRoomId) {
          room = duelRooms.get(targetRoomId);
          if (!room) { fail('Phòng không tồn tại hoặc đã đóng.'); return; }
          if (room.status !== 'waiting') { fail('Trận đấu đã bắt đầu.'); return; }
        } else {
          targetRoomId = generateDuelRoomId();
          room = {
            roomId: targetRoomId,
            status: 'waiting',
            category: category || 'all',
            questionCount: questionCount || 5,
            players: new Map(),
            questions: [],
            currentRound: 0,
            roundTimerSeconds: 60,
            firstCorrectAnswers: new Map(),
            rematchVotes: new Map(),
          };
          duelRooms.set(targetRoomId, room);
        }

        if (room.players.size >= 2 && !room.players.has(pId)) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: 'Phòng này đã đủ 2 người thi đấu! Vui lòng nhập mã phòng khác hoặc tạo phòng mới.',
            })
          );
          return;
        }

        currentRoomId = targetRoomId;
        peer.roomId = targetRoomId;
        publishLobby();
        currentPlayerId = pId;

        const isHost = room.players.size === 0 || (room.players.has(pId) && room.players.get(pId)!.isHost);

        room.players.set(pId, {
          ws,
          id: pId,
          name: pName,
          avatar_url: pAvatar,
          isHost,
          score: 0,
          currentQuestionIndex: 0,
          answeredCount: 0,
          isReady: isHost,
          isFinished: false,
          typingLength: 0,
        });

        ws.send(
          JSON.stringify({
            type: 'joined_success',
            roomId: room.roomId,
            playerId: pId,
            isHost,
          })
        );

        broadcastRoomState(room);
        broadcastToRoom(
          room,
          {
            type: 'player_joined_event',
            player: { id: pId, name: pName, isHost },
          },
          ws
        );
      }

      // 2. Tìm trận ghép đôi tức thì (Quick Matchmaking)
      else if (type === 'find_match') {
        const { player, category = 'all', questionCount = 5 } = data;
        const pId = player?.id || `player-${Date.now()}`;
        const pName = player?.name || 'Chiến binh';
        const pAvatar = player?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pId}`;

        if (
          quickMatchWaitingQueue &&
          quickMatchWaitingQueue.ws.readyState === WebSocket.OPEN &&
          quickMatchWaitingQueue.player.id !== pId
        ) {
          const waitingItem = quickMatchWaitingQueue;
          quickMatchWaitingQueue = null;

          const newRoomId = generateDuelRoomId();
          const matchQuestions = pickDuelQuestions(waitingItem.questionCount, waitingItem.category);

          const room: ServerDuelRoom = {
            roomId: newRoomId,
            status: 'in_progress',
            category: waitingItem.category,
            questionCount: matchQuestions.length,
            players: new Map(),
            questions: matchQuestions,
            currentRound: 0,
            roundTimerSeconds: 60,
            roundStartedAt: Date.now(),
            firstCorrectAnswers: new Map(),
            rematchVotes: new Map(),
          };

          room.players.set(waitingItem.player.id, {
            ws: waitingItem.ws,
            id: waitingItem.player.id,
            name: waitingItem.player.name,
            avatar_url: waitingItem.player.avatar_url,
            isHost: true,
            score: 0,
            currentQuestionIndex: 0,
            answeredCount: 0,
            isReady: true,
            isFinished: false,
            typingLength: 0,
          });

          currentRoomId = newRoomId;
          peer.roomId = newRoomId;
          waitingItem.bindRoom(newRoomId);
          publishLobby();
          currentPlayerId = pId;

          room.players.set(pId, {
            ws,
            id: pId,
            name: pName,
            avatar_url: pAvatar,
            isHost: false,
            score: 0,
            currentQuestionIndex: 0,
            answeredCount: 0,
            isReady: true,
            isFinished: false,
            typingLength: 0,
          });

          duelRooms.set(newRoomId, room);

          waitingItem.ws.send(JSON.stringify({ type: 'joined_success', roomId: newRoomId, playerId: waitingItem.player.id, isHost: true }));
          ws.send(JSON.stringify({ type: 'joined_success', roomId: newRoomId, playerId: pId, isHost: false }));

          broadcastRoomState(room);
          broadcastToRoom(room, {
            type: 'match_found',
            roomId: newRoomId,
          });
        } else {
          quickMatchWaitingQueue = {
            ws,
            player: { id: pId, name: pName, avatar_url: pAvatar },
            category,
            questionCount,
            bindRoom: (roomId) => { currentRoomId = roomId; peer.roomId = roomId; },
          };
          currentPlayerId = pId;
          ws.send(JSON.stringify({ type: 'waiting_in_queue', message: 'Đang tìm kiếm đối thủ trực tuyến...' }));
        }
      }

      // 3. Hủy tìm trận
      else if (type === 'cancel_find_match') {
        if (quickMatchWaitingQueue && quickMatchWaitingQueue.player.id === currentPlayerId) {
          quickMatchWaitingQueue = null;
        }
        ws.send(JSON.stringify({ type: 'search_cancelled' }));
      }

      // 4. Bật / Tắt sẵn sàng
      else if (type === 'toggle_ready') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room) return;
        const player = room.players.get(currentPlayerId);
        if (player) {
          player.isReady = !player.isReady;
          broadcastRoomState(room);
        }
      }

      // 4.1 Cập nhật cài đặt phòng (Số câu & Chủ đề)
      else if (type === 'update_room_settings') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== 'waiting') return;
        const host = room.players.get(currentPlayerId);
        if (!host || !host.isHost) return;
        if ([5, 10, 15, 20].includes(data.questionCount)) room.questionCount = data.questionCount;
        if (typeof data.category === 'string') room.category = data.category.slice(0, 80);
        broadcastRoomState(room);
      }

      // 5. Bắt đầu trận đấu
      else if (type === 'start_game') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room) return;
        const host = room.players.get(currentPlayerId);
        if (!host || !host.isHost) {
          ws.send(JSON.stringify({ type: 'error', message: 'Chỉ chủ phòng mới có thể bắt đầu trận đấu!' }));
          return;
        }

        if (room.status !== 'waiting' || room.players.size !== 2 || ![...room.players.values()].every(p => p.isReady)) {
          fail('Cần đủ hai người và cả hai sẵn sàng.'); return;
        }
        room.questions = pickDuelQuestions(room.questionCount, room.category);
        room.questionCount = room.questions.length;
        room.status = 'countdown';
        room.currentRound = 0;
        room.firstCorrectAnswers.clear();
        room.winnerId = null;

        for (const p of room.players.values()) {
          p.score = 0;
          p.currentQuestionIndex = 0;
          p.answeredCount = 0;
          p.isFinished = false;
          p.lastAnswerCorrect = undefined;
          p.lastAnswerText = undefined;
          p.typingLength = 0;
        }

        broadcastRoomState(room);

        let count = 3;
        broadcastToRoom(room, { type: 'countdown_tick', count: 3 });
        const countdownTimer = room.countdownInterval = setInterval(() => {
          count--;
          if (count > 0) {
            broadcastToRoom(room, { type: 'countdown_tick', count });
          } else {
            clearInterval(countdownTimer);
            room.status = 'in_progress';
            room.roundStartedAt = Date.now();
            broadcastRoomState(room);
            broadcastToRoom(room, { type: 'game_started' });
          }
        }, 1000);
      }

      // 6. Nộp câu trả lời
      else if (type === 'submit_answer') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== 'in_progress') return;

        const player = room.players.get(currentPlayerId);
        if (!player || player.isFinished) return;

        const { questionIndex, answer } = data;
        if (questionIndex !== player.currentQuestionIndex || typeof answer !== 'string' || answer.length > 2000) { fail('Câu trả lời không hợp lệ.'); return; }
        const currentQ = room.questions[questionIndex];
        if (!currentQ) return;

        const normUser = normalizeSentenceServer(answer);
        const normAnswers = (currentQ.answers || []).map(normalizeSentenceServer);

        const isCorrect = normAnswers.some((ans: string) => ans === normUser);

        if (isCorrect) {
          const isFirst = !room.firstCorrectAnswers.has(questionIndex);
          if (isFirst) {
            room.firstCorrectAnswers.set(questionIndex, player.id);
          }

          const basePoints = 100;
          const speedBonus = isFirst ? 50 : 0;
          const pointsEarned = basePoints + speedBonus;

          player.score += pointsEarned;
          player.currentQuestionIndex++;
          player.answeredCount++;
          player.lastAnswerCorrect = true;
          player.lastAnswerText = answer;

          ws.send(
            JSON.stringify({
              type: 'answer_result',
              correct: true,
              pointsEarned,
              isFirst,
              questionIndex,
              playerScore: player.score,
              currentQuestionIndex: player.currentQuestionIndex,
            })
          );

          broadcastToRoom(
            room,
            {
              type: 'opponent_scored',
              playerId: player.id,
              playerName: player.name,
              questionIndex,
              isFirst,
              score: player.score,
            },
            ws
          );

          if (player.answeredCount >= room.questions.length) {
            player.isFinished = true;

            let allFinished = true;
            for (const p of room.players.values()) {
              if (!p.isFinished) {
                allFinished = false;
                break;
              }
            }

            if (allFinished) {
              room.status = 'finished';
              let maxScore = -1;
              let winnerId: string | null = null;
              for (const p of room.players.values()) {
                if (p.score > maxScore) {
                  maxScore = p.score;
                  winnerId = p.id;
                } else if (p.score === maxScore) {
                  winnerId = null;
                }
              }
              room.winnerId = winnerId;
            }
          }

          broadcastRoomState(room);
        } else {
          player.lastAnswerCorrect = false;
          player.lastAnswerText = answer;

          ws.send(
            JSON.stringify({
              type: 'answer_result',
              correct: false,
              questionIndex,
              message: 'Bản dịch chưa chính xác, hãy thử lại!',
            })
          );
        }
      }

      // 7. Đồng bộ thanh gõ phím theo thời gian thực (Live Typing)
      else if (type === 'typing') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== 'in_progress') return;

        const player = room.players.get(currentPlayerId);
        if (player) {
          player.typingLength = data.textLength || 0;
          broadcastToRoom(
            room,
            {
              type: 'opponent_typing',
              playerId: player.id,
              typingLength: player.typingLength,
            },
            ws
          );
        }
      }

      // 8. Thả biểu cảm cảm xúc (Emotes)
      else if (type === 'send_emote') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room) return;

        const player = room.players.get(currentPlayerId);
        if (player) {
          broadcastToRoom(room, {
            type: 'emote_received',
            senderId: player.id,
            senderName: player.name,
            emote: data.emote || '🔥',
          });
        }
      }

      // 9. Bỏ qua câu hỏi (Skip)
      else if (type === 'skip_question') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== 'in_progress') return;

        const player = room.players.get(currentPlayerId);
        if (!player || player.isFinished) return;

        player.currentQuestionIndex++;
        player.answeredCount++;
        player.lastAnswerCorrect = false;

        if (player.answeredCount >= room.questions.length) {
          player.isFinished = true;
          let allFinished = true;
          for (const p of room.players.values()) {
            if (!p.isFinished) {
              allFinished = false;
              break;
            }
          }
          if (allFinished) {
            room.status = 'finished';
            let maxScore = -1;
            let winnerId: string | null = null;
            for (const p of room.players.values()) {
              if (p.score > maxScore) {
                maxScore = p.score;
                winnerId = p.id;
              } else if (p.score === maxScore) {
                winnerId = null;
              }
            }
            room.winnerId = winnerId;
          }
        }

        ws.send(JSON.stringify({ type: 'question_skipped', currentQuestionIndex: player.currentQuestionIndex }));
        broadcastRoomState(room);
      }

      // 10. Tái đấu (Rematch)
      else if (type === 'request_rematch') {
        if (!currentRoomId || !currentPlayerId) return;
        const room = duelRooms.get(currentRoomId);
        if (!room || room.status !== 'finished' || room.players.size !== 2) { fail('Cần đủ hai người để tái đấu.'); return; }

        room.rematchVotes.set(currentPlayerId, true);

        let allAgreed = room.players.size > 0;
        for (const p of room.players.values()) {
          if (!room.rematchVotes.get(p.id)) {
            allAgreed = false;
            break;
          }
        }

        if (allAgreed) {
          room.questions = pickDuelQuestions(room.questionCount, room.category);
          room.status = 'countdown';
          room.firstCorrectAnswers.clear();
          room.rematchVotes.clear();
          room.winnerId = null;

          for (const p of room.players.values()) {
            p.score = 0;
            p.currentQuestionIndex = 0;
            p.answeredCount = 0;
            p.isFinished = false;
            p.lastAnswerCorrect = undefined;
            p.lastAnswerText = undefined;
            p.typingLength = 0;
          }

          broadcastRoomState(room);

          let count = 3;
          broadcastToRoom(room, { type: 'countdown_tick', count: 3 });
          const cd = room.countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
              broadcastToRoom(room, { type: 'countdown_tick', count });
            } else {
              clearInterval(cd);
              room.status = 'in_progress';
              room.roundStartedAt = Date.now();
              broadcastRoomState(room);
              broadcastToRoom(room, { type: 'game_started' });
            }
          }, 1000);
        } else {
          broadcastRoomState(room);
          broadcastToRoom(room, {
            type: 'rematch_requested_by_player',
            playerId: currentPlayerId,
          });
        }
      }

      // 11. Rời phòng
      else if (type === 'leave_room') {
        if (currentRoomId && currentPlayerId) {
          const room = duelRooms.get(currentRoomId);
          if (room) {
            room.players.delete(currentPlayerId);
            if (room.players.size === 0) {
              clearInterval(room.countdownInterval);
              duelRooms.delete(currentRoomId);
            } else {
              const remainingPlayer = Array.from(room.players.values())[0];
              if (remainingPlayer) {
                remainingPlayer.isHost = true;
                if (room.status === 'in_progress' || room.status === 'countdown') { clearInterval(room.countdownInterval); room.status = 'finished'; room.winnerId = remainingPlayer.id; }
              }
              broadcastRoomState(room);
              broadcastToRoom(room, {
                type: 'player_left_event',
                playerId: currentPlayerId,
              });
            }
          }
          currentRoomId = null;
          peer.roomId = null;
          publishLobby();
        }
      }
    } catch (err: any) {
      console.error('[WebSocket Duel Error]', err);
    }
  });

  ws.on('close', () => {
    aliveSockets.delete(ws);
    lobbyPeers.delete(ws);
    for (const [id, invite] of duelInvites) if (invite.from === ws || invite.to === ws) duelInvites.delete(id);
    publishLobby();
    if (quickMatchWaitingQueue && quickMatchWaitingQueue.ws === ws) {
      quickMatchWaitingQueue = null;
    }

    if (currentRoomId && currentPlayerId) {
      const room = duelRooms.get(currentRoomId);
      if (room) {
        room.players.delete(currentPlayerId);
        if (room.players.size === 0) {
          clearInterval(room.countdownInterval);
          duelRooms.delete(currentRoomId);
        } else {
          const remainingPlayer = Array.from(room.players.values())[0];
          if (remainingPlayer) {
            remainingPlayer.isHost = true;
            if (room.status === 'in_progress' || room.status === 'countdown') { clearInterval(room.countdownInterval); room.status = 'finished'; room.winnerId = remainingPlayer.id; }
          }
          broadcastRoomState(room);
          broadcastToRoom(room, {
            type: 'player_disconnected_event',
            playerId: currentPlayerId,
          });
        }
      }
    }
  });
});

// Vite middleware cho development & Static file serving cho production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server & WebSocket đang chạy trên http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

export default app;

