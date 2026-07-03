// api/admin/_totp.ts
import crypto from 'crypto';

// Standard RFC 4648 Base32 alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 string into a binary Buffer.
 */
export function decodeBase32(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = ALPHABET.indexOf(cleaned[i]);
    if (val === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 secret for Google Authenticator.
 */
export function generateBase32Secret(length = 16): string {
  let secret = '';
  for (let i = 0; i < length; i++) {
    const index = Math.floor(crypto.randomBytes(1)[0] % ALPHABET.length);
    secret += ALPHABET[index];
  }
  return secret;
}

/**
 * Verifies a 6-digit TOTP token against a Base32 secret.
 * Allows a customizable window of time steps (default: 1 step of 30s before/after).
 */
export function verifyTOTP(token: string, secret: string, window = 1): boolean {
  try {
    const secretBuffer = decodeBase32(secret);
    const nowStep = Math.floor(Date.now() / 1000 / 30);

    for (let i = -window; i <= window; i++) {
      const timeStep = nowStep + i;

      // 8-byte big-endian time step buffer
      const timeBuffer = Buffer.alloc(8);
      // Write high 32 bits as 0
      timeBuffer.writeUInt32BE(0, 0);
      // Write low 32 bits as our timestamp step
      timeBuffer.writeUInt32BE(timeStep, 4);

      // Compute HMAC-SHA1
      const hmac = crypto.createHmac('sha1', secretBuffer)
        .update(timeBuffer)
        .digest();

      // Dynamic truncation
      const offset = hmac[hmac.length - 1] & 0xf;
      const codeBinary = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
      ) >>> 0;

      // Ensure 6 digit padding
      const expectedCode = String(codeBinary % 1000000).padStart(6, '0');
      
      if (token.trim() === expectedCode) {
        return true;
      }
    }
  } catch (err) {
    console.error('MFA TOTP Verification helper error:', err);
  }
  return false;
}
