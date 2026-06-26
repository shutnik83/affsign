import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { config } from '../config';
import { logger } from '../logger';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

let driveClient: ReturnType<typeof google.drive> | null = null;

function getDrive() {
  if (!driveClient) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: config.google.projectId,
        private_key_id: config.google.privateKeyId,
        private_key: config.google.privateKey.replace(/\\n/g, '\n'),
        client_email: config.google.clientEmail,
        client_id: config.google.clientId,
      },
      scopes: SCOPES,
    });
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

export function isGoogleDriveConfigured(): boolean {
  return !!(config.google.projectId && config.google.privateKey && config.google.clientEmail);
}

function generateFileName(filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(filename);
  const safeName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${timestamp}_${random}_${safeName}${ext}`;
}

async function makePublic(fileId: string): Promise<string> {
  const drive = getDrive();
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export async function uploadBuffer(
  buffer: Buffer,
  originalName: string,
  folderId: string,
  mimeType?: string
): Promise<{ fileId: string; publicUrl: string }> {
  const drive = getDrive();
  const fileName = generateFileName(originalName);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: Readable.from(buffer),
    },
    fields: 'id',
  });

  const fileId = res.data.id!;
  const publicUrl = await makePublic(fileId);
  logger.info(`Uploaded to Drive: ${fileName} (id: ${fileId})`);
  return { fileId, publicUrl };
}

export async function uploadFileStream(
  fileStream: fs.ReadStream,
  originalName: string,
  folderId: string,
  mimeType?: string
): Promise<{ fileId: string; publicUrl: string }> {
  const drive = getDrive();
  const fileName = generateFileName(originalName);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: fileStream,
    },
    fields: 'id',
  });

  const fileId = res.data.id!;
  const publicUrl = await makePublic(fileId);
  logger.info(`Uploaded stream to Drive: ${fileName} (id: ${fileId})`);
  return { fileId, publicUrl };
}

export async function downloadToFile(
  fileId: string,
  localPath: string
): Promise<void> {
  const drive = getDrive();
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(localPath);
    res.data
      .on('end', () => {
        dest.close();
        logger.info(`Downloaded from Drive: ${fileId} -> ${localPath}`);
        resolve();
      })
      .on('error', (err) => {
        dest.close();
        fs.unlinkSync(localPath);
        reject(err);
      })
      .pipe(dest);
  });
}

export async function getPublicUrl(fileId: string): Promise<string> {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    const drive = getDrive();
    await drive.files.delete({ fileId });
    logger.info(`Deleted from Drive: ${fileId}`);
  } catch (err) {
    logger.error(`Failed to delete from Drive: ${fileId}`, err);
  }
}
