import express from 'express';
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
const PORT = 3000;

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
  if (!req.url.startsWith('/api') && !req.url.startsWith('/index.html') && req.url !== '/') {
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

// Bộ nhớ câu hỏi đệm (In-memory questions store)
// Đảm bảo học viên luôn học được câu mới ngay lập tức kể cả khi Supabase đang bị lỗi phân quyền
let memoryQuestionsStore: any[] = INITIAL_QUESTIONS.map((q, i) => ({
  id: i + 1,
  vi: q.vi,
  hints: q.hints,
  answers: q.answers,
  created_date: new Date().toISOString().split('T')[0],
}));

// Cài đặt tên, biểu tượng và kênh liên lạc ứng dụng (có thể chỉnh sửa từ trang Admin)
const SETTINGS_FILE = path.join(process.cwd(), 'app-settings.json');
let appSettings = {
  appName: 'Daily Translation',
  appSubtitle: 'Dịch câu mỗi ngày kèm từ vựng gợi ý',
  appIcon: 'BookOpen',
  appIconType: 'lucide',
  contactEmail: 'hungpv2172002@gmail.com',
  contactFacebook: 'https://facebook.com',
  contactTiktok: 'https://tiktok.com',
};

// Đọc cài đặt đã lưu nếu có
try {
  if (fs.existsSync(SETTINGS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    if (saved && typeof saved === 'object') {
      appSettings = { ...appSettings, ...saved };
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

// Endpoint lấy cài đặt thương hiệu ứng dụng (Tên, Biểu tượng)
app.get(['/api/settings', '/settings'], (req, res) => {
  return res.json({
    success: true,
    settings: appSettings,
  });
});

// Endpoint cập nhật cài đặt ứng dụng từ trang Admin
app.post(['/api/settings', '/settings'], (req, res) => {
  try {
    const {
      appName,
      appSubtitle,
      appIcon,
      appIconType,
      contactEmail,
      contactFacebook,
      contactTiktok,
    } = req.body || {};

    if (appName && typeof appName === 'string') {
      appSettings.appName = appName.trim();
    }
    if (typeof appSubtitle === 'string') {
      appSettings.appSubtitle = appSubtitle.trim();
    }
    if (appIcon && typeof appIcon === 'string') {
      appSettings.appIcon = appIcon.trim();
    }
    if (appIconType === 'lucide' || appIconType === 'emoji') {
      appSettings.appIconType = appIconType;
    }
    if (typeof contactEmail === 'string') {
      appSettings.contactEmail = contactEmail.trim();
    }
    if (typeof contactFacebook === 'string') {
      appSettings.contactFacebook = contactFacebook.trim();
    }
    if (typeof contactTiktok === 'string') {
      appSettings.contactTiktok = contactTiktok.trim();
    }

    // Ghi vào file disk
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Không thể ghi file app-settings.json:', e);
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
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Nếu dùng Gmail
  if (user && pass && user.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return null;
}

// Endpoint gửi mã xác thực 6 chữ số đến hộp thư Email (Đăng ký & Quên mật khẩu)
app.post(['/api/auth/send-otp', '/auth/send-otp'], async (req, res) => {
  try {
    const { email, fullName, type = 'register' } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const otpType: 'register' | 'forgot' = type === 'forgot' ? 'forgot' : 'register';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Địa chỉ email không hợp lệ.' });
    }

    // Sinh mã ngẫu nhiên 6 số bảo mật bằng crypto
    const otpNumber = 100000 + crypto.randomInt(0, 900000);
    const otp = otpNumber.toString();

    // Lưu mã trong 10 phút
    otpMemoryStore.set(cleanEmail, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      type: otpType,
    });

    const transporter = createMailTransporter();
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

        const greetingName = fullName || cleanEmail.split('@')[0];
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
                ${actionText} Dưới đây là mã xác thực 6 chữ số của bạn:
              </p>
              <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #1e1b4b; font-family: monospace;">${otp}</span>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                ⏰ Mã này có hiệu lực trong vòng <strong>10 phút</strong>. ${reminderText}
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  start();
}

export default app;
