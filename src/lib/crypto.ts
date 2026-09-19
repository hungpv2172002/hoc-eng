/**
 * Module mã hóa tài khoản người dùng bằng Web Crypto API tiêu chuẩn (NIST).
 * Sử dụng PBKDF2 (Password-Based Key Derivation Function 2) với HMAC-SHA-256
 * và Salt ngẫu nhiên 16-byte cho từng người dùng, với 100,000 vòng lặp.
 * Đảm bảo mật khẩu KHÔNG BAO GIỜ bị lưu dưới dạng plain text.
 */

// Chuyển mảng ArrayBuffer sang chuỗi Hex
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Chuyển chuỗi Hex sang mảng Uint8Array
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Băm mật khẩu bảo mật với Salt ngẫu nhiên bằng PBKDF2 + SHA-256.
 * Trả về định dạng: "pbkdf2:100000:<saltHex>:<hashHex>"
 */
export async function hashPassword(password: string): Promise<string> {
  // Tạo salt ngẫu nhiên 16 bytes bằng mật mã học an toàn
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256 // 32 bytes = 256 bits
  );

  const saltHex = bufferToHex(salt.buffer);
  const hashHex = bufferToHex(derivedBits);
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

/**
 * Kiểm tra mật khẩu người dùng nhập có khớp với mật khẩu đã mã hóa hay không.
 */
export async function verifyPassword(
  password: string,
  storedHashString: string
): Promise<boolean> {
  try {
    if (!storedHashString) return false;

    // Hỗ trợ kiểm tra định dạng PBKDF2
    if (storedHashString.startsWith('pbkdf2:')) {
      const parts = storedHashString.split(':');
      if (parts.length !== 4) return false;
      const iterations = parseInt(parts[1], 10);
      const salt = hexToBuffer(parts[2]);
      const originalHashHex = parts[3];

      const enc = new TextEncoder();
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256',
        },
        passwordKey,
        256
      );

      const calculatedHashHex = bufferToHex(derivedBits);
      // So sánh an toàn
      return calculatedHashHex === originalHashHex;
    }

    // Fallback nếu tài khoản cũ dùng SHA-256 trực tiếp
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', enc.encode(password));
    return bufferToHex(digest) === storedHashString;
  } catch (err) {
    console.error('Lỗi xác thực mật mã:', err);
    return false;
  }
}

/**
 * Sinh mã OTP xác thực 6 số ngẫu nhiên an toàn.
 */
export function generateSecureOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Sinh số từ 100000 đến 999999
  const otpNumber = 100000 + (array[0] % 900000);
  return otpNumber.toString();
}
