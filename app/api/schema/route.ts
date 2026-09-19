import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'supabase-schema.sql');
    if (fs.existsSync(filePath)) {
      const sqlContent = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json({ success: true, sql: sqlContent });
    }
    return NextResponse.json({ success: false, error: 'Không tìm thấy file supabase-schema.sql' }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi khi đọc file schema';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
