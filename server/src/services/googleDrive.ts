import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { config } from '../config';
import { logger } from '../logger';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

let driveClient: ReturnType<typeof google.drive> | null = null;
let oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

let cachedFolderUploads = config.google.folderUploads;
let cachedFolderSigned = config.google.folderSigned;

function getOAuth2Client() {
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      config.google.oauthClientId,
      config.google.oauthClientSecret,
      config.google.redirectUri
    );
    if (config.google.refreshToken) {
      oauth2Client.setCredentials({ refresh_token: config.google.refreshToken });
    }
  }
  return oauth2Client;
}

function getDrive() {
  if (!driveClient) {
    const auth = getOAuth2Client();
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

export function isGoogleDriveConfigured(): boolean {
  return !!(config.google.oauthClientId && config.google.oauthClientSecret && config.google.refreshToken);
}

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export async function handleAuthCallback(code: string): Promise<string> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const refreshToken = tokens.refresh_token || '';
  logger.info('Google OAuth2 authorized successfully');
  return refreshToken;
}

async function findOrCreateFolder(name: string): Promise<string> {
  const drive = getDrive();
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  const folderId = createRes.data.id!;
  logger.info(`Created Google Drive folder: ${name} (id: ${folderId})`);
  return folderId;
}

export async function ensureFolders(): Promise<void> {
  if (!isGoogleDriveConfigured()) return;

  if (!cachedFolderUploads) {
    cachedFolderUploads = await findOrCreateFolder('Uploads');
    logger.info(`Uploads folder: ${cachedFolderUploads}`);
  }
  if (!cachedFolderSigned) {
    cachedFolderSigned = await findOrCreateFolder('Signed');
    logger.info(`Signed folder: ${cachedFolderSigned}`);
  }
}

function getUploadsFolder(): string {
  return cachedFolderUploads || config.google.folderUploads;
}

function getSignedFolder(): string {
  return cachedFolderSigned || config.google.folderSigned;
}

export function getFolderIds(): { uploads: string; signed: string } {
  return { uploads: getUploadsFolder(), signed: getSignedFolder() };
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
