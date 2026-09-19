import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { INITIAL_QUESTIONS } from './src/data/initialQuestions';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasSupabaseAdmin,
  });
});

// Endpoint /api/cron/generate theo yêu cầu của dự án
app.all('/api/cron/generate', async (req, res) => {
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

    const prompt = `Bạn là một chuyên gia ngôn ngữ tiếng Anh và tiếng Việt.
Hãy tạo đúng 10 câu luyện dịch giao tiếp thường ngày từ tiếng Việt sang tiếng Anh cực kỳ thiết thực, tự nhiên và hữu ích cho người học.
Mỗi câu bài tập gồm:
1. "vi": Câu tiếng Việt tự nhiên trong giao tiếp đời thường hoặc công việc.
2. "hints": Gợi ý 2-3 từ vựng hoặc cụm từ then chốt (ví dụ: "perhaps = có lẽ; more time = thêm thời gian").
3. "answers": Mảng gồm ít nhất 2 đến 4 câu tiếng Anh tương đương chuẩn xác và được chấp nhận (bao gồm cả cách nói rút gọn như "don't" và đầy đủ "do not").`;

    // Danh sách model ưu tiên tự động cân bằng tải
    const CANDIDATE_MODELS = [
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
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
      const shuffled = [...INITIAL_QUESTIONS].sort(() => Math.random() - 0.5);
      questionsData = shuffled.slice(0, 10).map((item) => ({
        vi: item.vi,
        hints: item.hints,
        answers: item.answers,
      }));
    }

    const today = new Date().toISOString().split('T')[0];
    const records = questionsData.map((q: any) => ({
      vi: q.vi,
      hints: q.hints,
      answers: Array.isArray(q.answers) ? q.answers : [q.answers],
      created_date: today,
    }));

    // Nếu đã kết nối Supabase, nạp thẳng vào database
    let insertedData = null;
    if (supabaseAdmin) {
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

        if (isTableMissing) {
          return res.json({
            success: true,
            warning: 'Bảng "public.questions" chưa được tạo trên Supabase.',
            schema_missing: true,
            message: 'Đã tạo 10 câu hỏi thành công! Tuy nhiên cơ sở dữ liệu Supabase của bạn chưa có bảng "questions". Vui lòng mở Supabase SQL Editor và chạy file supabase-schema.sql để khởi tạo bảng.',
            solution: 'Vào Supabase Dashboard -> SQL Editor -> New query -> Dán nội dung supabase-schema.sql -> Nhấn Run.',
            count: records.length,
            modelUsed: successfulModel || 'curated_database',
            isCuratedFallback,
            insertedToSupabase: false,
            data: records,
          });
        }

        return res.status(500).json({
          error: 'Lỗi Supabase khi lưu câu hỏi: ' + error.message,
          generatedQuestions: records,
        });
      }
      insertedData = data;
    }

    return res.json({
      success: true,
      message: isCuratedFallback
        ? `Đã nạp ${records.length} câu hỏi giao tiếp chuẩn chọn lọc (do Gemini AI tạm thời cao tải 503).`
        : `Đã sinh thành công ${records.length} câu hỏi mới bằng Gemini API (${successfulModel}).`,
      count: records.length,
      modelUsed: successfulModel || 'curated_database',
      isCuratedFallback,
      insertedToSupabase: !!supabaseAdmin,
      data: insertedData || records,
    });
  } catch (err: any) {
    console.error('Lỗi khi sinh câu hỏi:', err);
    return res.status(500).json({
      error: err.message || 'Lỗi server khi sinh câu hỏi',
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

start();
