import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'app-settings.json');

const defaultSettings = {
  appName: 'Daily Translation',
  appSubtitle: 'Dịch câu mỗi ngày kèm từ vựng gợi ý',
  appIcon: 'BookOpen',
  appIconType: 'lucide' as const,
};

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...defaultSettings, ...data };
    }
  } catch (e) {
    console.warn('Error reading settings file:', e);
  }
  return { ...defaultSettings };
}

export async function GET() {
  const settings = readSettings();
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = readSettings();

    if (body.appName && typeof body.appName === 'string') {
      current.appName = body.appName.trim();
    }
    if (typeof body.appSubtitle === 'string') {
      current.appSubtitle = body.appSubtitle.trim();
    }
    if (body.appIcon && typeof body.appIcon === 'string') {
      current.appIcon = body.appIcon.trim();
    }
    if (body.appIconType === 'lucide' || body.appIconType === 'emoji') {
      current.appIconType = body.appIconType;
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(current, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Đã lưu cài đặt tên và biểu tượng ứng dụng thành công!',
      settings: current,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
