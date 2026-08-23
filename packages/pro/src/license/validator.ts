// Offline Ed25519 License Key Validator
// Requires: npm install @noble/ed25519
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// 1. Ed25519 requires sha512 for sync operations in @noble/ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// 2. PUBLIC KEY (Gömülü / Hardcoded)
// Bu anahtar açık kaynak olabilir, güvenlik riski yaratmaz. Sadece imzanın doğruluğunu kanıtlar.
const SYNC_ENGINE_PUBLIC_KEY = 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a';

export interface LicensePayload {
  customerId: string;
  tier: 'pro' | 'enterprise';
  issuedAt: number;
  expiry: number;
  features: string[];
}

/**
 * Müşterinin girdiği Lisans Anahtarını (JWT formatına benzer: PayloadBase64.SignatureHex) 
 * tamamen çevrimdışı doğrular.
 */
export function verifyLicenseOffline(licenseKey: string): LicensePayload {
  if (!licenseKey || !licenseKey.includes('.')) {
    throw new Error('Invalid License Format. Expected Payload.Signature');
  }

  const [payloadB64, signatureHex] = licenseKey.split('.');
  
  // 1. Payload'u çöz
  const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf-8');
  const payload: LicensePayload = JSON.parse(payloadStr);

  // 2. Asimetrik Ed25519 İmza Doğrulaması (İnternet gerektirmez)
  const messageBytes = Buffer.from(payloadB64, 'utf-8');
  const isValid = ed.verify(signatureHex, messageBytes, SYNC_ENGINE_PUBLIC_KEY);

  if (!isValid) {
    throw new Error('CRYPTOGRAPHIC_ERROR: License signature is invalid or forged.');
  }

  // 3. Süre Kısıtlaması Kontrolü (Time Restriction)
  const now = Date.now();
  if (now > payload.expiry) {
    throw new Error(`LICENSE_EXPIRED: Your license expired on ${new Date(payload.expiry).toISOString()}. Please renew at Polar.sh.`);
  }

  // Geçerliyse özellikleri dön
  return payload;
}
