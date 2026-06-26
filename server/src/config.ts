import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  domain: process.env.DOMAIN || 'localhost:3001',
  protocol: process.env.PROTOCOL || 'http',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || String(2 * 1024 * 1024 * 1024), 10),
  cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '3600000', 10),
  fileMaxAgeMs: parseInt(process.env.FILE_MAX_AGE_MS || '86400000', 10),
  paths: {
    root: path.resolve(__dirname, '..'),
    temp: path.join('/tmp', 'affsign'),
  },
  google: {
    projectId: process.env.GOOGLE_PROJECT_ID || '',
    privateKeyId: process.env.GOOGLE_PRIVATE_KEY_ID || '',
    privateKey: process.env.GOOGLE_PRIVATE_KEY || '',
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    folderUploads: process.env.GOOGLE_DRIVE_FOLDER_UPLOADS || '',
    folderSigned: process.env.GOOGLE_DRIVE_FOLDER_SIGNED || '',
  },
};
