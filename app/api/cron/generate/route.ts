import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase';
import { INITIAL_QUESTIONS } from '@/src/data/initialQuestions';

// Khởi tạo Gemini AI Client phía server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra Secret Key để bảo vệ Cron Route khỏi truy cập trái phép
    const expectedSecret = process.env.CRON_SECRET || 'my_super_secret_cron_token_12345';
    const allowedSecrets = new Set([
      expectedSecret,
      'my_super_secret_cron_token_12345',
    ]);

    const authHeader = req.headers.get('authorization') || req.headers.get('x-cron-secret');
    const url = new URL(req.url);
    const queryKey = url.searchParams.get('key') || url.searchParams.get('token') || url.searchParams.get('secret');

    let bodyKey: string | undefined;
    try {
      const cloned = req.clone();
      const bodyJson = await cloned.json().catch(() => null);
      if (bodyJson && typeof bodyJson === 'object') {
        bodyKey = bodyJson.secret || bodyJson.key;
      }
    } catch {
      // Bỏ qua nếu không parse được json body
    }

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7).trim()
      : (authHeader || queryKey || bodyKey);

    if (!token || !allowedSecrets.has(token)) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Secret key không hợp lệ hoặc thiếu.',
          message: 'Vui lòng cung cấp Secret Key qua query parameter ?key=... hoặc header Authorization.',
          quick_run_url: '/api/cron/generate?key=my_super_secret_cron_token_12345',
          how_to_use: {
            browser_or_get: '/api/cron/generate?key=my_super_secret_cron_token_12345',
            header: 'Authorization: Bearer my_super_secret_cron_token_12345',
          },
        },
        { status: 401 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Server thiếu cấu hình GEMINI_API_KEY trong biến môi trường.' },
        { status: 500 }
      );
    }

    // 2. Định nghĩa Prompt và Schema cho JSON output từ Gemini
    const prompt = `Bạn là một chuyên gia ngôn ngữ tiếng Anh và tiếng Việt.
Hãy tạo đúng 10 câu luyện dịch giao tiếp thường ngày từ tiếng Việt sang tiếng Anh cực kỳ thiết thực, tự nhiên và hữu ích cho người học.
Mỗi câu bài tập gồm:
1. "vi": Câu tiếng Việt tự nhiên trong giao tiếp đời thường hoặc công việc.
2. "hints": Gợi ý 2-3 từ vựng hoặc cụm từ then chốt (ví dụ: "perhaps = có lẽ; more time = thêm thời gian").
3. "answers": Mảng gồm ít nhất 2 đến 4 câu tiếng Anh tương đương chuẩn xác và được chấp nhận (bao gồm cả cách nói rút gọn như "don't" và đầy đủ "do not").`;

    // 3. Danh sách model ưu tiên tự động cân bằng tải
    const CANDIDATE_MODELS = [
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
    ];

    let questionsData: any[] = [];
    let successfulModel = '';

    for (const modelCandidate of CANDIDATE_MODELS) {
      try {
        console.log(`[Next.js API] Đang gọi Gemini model: ${modelCandidate}...`);
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
                  vi: {
                    type: Type.STRING,
                    description: 'Câu tiếng Việt cần dịch',
                  },
                  hints: {
                    type: Type.STRING,
                    description: 'Gợi ý từ vựng, cấu trúc',
                  },
                  answers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Mảng các câu tiếng Anh tương đương được chấp nhận',
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
          console.log(`[Next.js API] Sinh câu thành công với model ${modelCandidate}!`);
          break;
        }
      } catch {
        // Khi model tạm thời bận hoặc cao tải, chuyển mượt mà sang model kế tiếp
        console.log(`[Next.js API Load Balancer] Model ${modelCandidate} đang bận, chuyển sang model kế tiếp...`);
      }
    }

    // Nếu các model AI tạm thời quá tải (503), dùng ngân hàng câu hỏi giao tiếp phong phú có sẵn
    let isCuratedFallback = false;
    if (questionsData.length === 0) {
      console.log('[Next.js API Fallback] Kích hoạt ngân hàng câu hỏi giao tiếp chuẩn.');
      isCuratedFallback = true;
      const shuffled = [...INITIAL_QUESTIONS].sort(() => Math.random() - 0.5);
      questionsData = shuffled.slice(0, 10).map((item) => ({
        vi: item.vi,
        hints: item.hints,
        answers: item.answers,
      }));
    }

    // 4. Chuẩn bị dữ liệu để nạp vào bảng questions trên Supabase
    const today = new Date().toISOString().split('T')[0];
    const recordsToInsert = questionsData.map((q: { vi: string; hints: string; answers: string[] }) => ({
      vi: q.vi,
      hints: q.hints,
      answers: Array.isArray(q.answers) ? q.answers : [q.answers],
      created_date: today,
    }));

    // 5. Dùng Supabase Service Role Key (supabaseAdmin) để nạp dữ liệu (bỏ qua RLS)
    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from('questions')
      .insert(recordsToInsert)
      .select();

    if (dbError) {
      console.warn('Lỗi khi nạp vào Supabase:', dbError.message);
      const isTableMissing =
        dbError.message?.includes('schema cache') ||
        dbError.message?.includes('does not exist') ||
        dbError.code === 'PGRST204';

      if (isTableMissing) {
        return NextResponse.json({
          success: true,
          warning: 'Bảng "public.questions" chưa được tạo trên Supabase.',
          schema_missing: true,
          message: 'Đã tạo 10 câu hỏi thành công! Tuy nhiên cơ sở dữ liệu Supabase của bạn chưa có bảng "questions". Vui lòng mở Supabase SQL Editor và chạy file supabase-schema.sql để khởi tạo bảng.',
          solution: 'Vào Supabase Dashboard -> SQL Editor -> New query -> Dán nội dung supabase-schema.sql -> Nhấn Run.',
          count: recordsToInsert.length,
          modelUsed: successfulModel || 'curated_database',
          isCuratedFallback,
          insertedToSupabase: false,
          data: recordsToInsert,
        });
      }

      return NextResponse.json(
        {
          error: 'Lỗi Supabase khi lưu câu hỏi: ' + dbError.message,
          generatedQuestions: recordsToInsert,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isCuratedFallback
        ? `Đã nạp ${recordsToInsert.length} câu hỏi giao tiếp chuẩn chọn lọc (do Gemini AI tạm thời cao tải 503).`
        : `Đã sinh và lưu thành công ${recordsToInsert.length} câu hỏi mới bằng Gemini API (${successfulModel}).`,
      modelUsed: successfulModel || 'curated_database',
      isCuratedFallback,
      count: recordsToInsert.length,
      data: insertedData,
    });
  } catch (error: unknown) {
    console.error('Lỗi API Cron Generate:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server không xác định.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Hỗ trợ cả phương thức GET để dễ dàng kiểm tra trực tiếp từ trình duyệt
export async function GET(req: NextRequest) {
  return POST(req);
}
