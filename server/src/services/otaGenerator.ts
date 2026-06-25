import QRCode from 'qrcode';
import { logger } from '../logger';

export async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    logger.error('QR code generation failed:', err);
    throw new Error('Failed to generate QR code');
  }
}
