import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { config } from '../config';
import { logger } from '../logger';
import { getCurrentAccount, updateAccountFolders, type GoogleAccount } from './accountStore';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

let driveClient: ReturnType<typeof google.drive> | null = null;
let oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;
let currentAcctId: string | null = null;

function getOAuth2Client(): InstanceType<typeof google.auth.OAuth2> {
  const acct = getCurrentAccount();
  const token = acct?.refreshToken || config.google.refreshToken;
  const acctId = acct?.id || 'env';

  if (oauth2Client && currentAcctId === acctId) {
    return oauth2Client;
  }

  oauth2Client = new google.auth.OAuth2(
    config.google.oauthClientId,
    config.google.oauthClientSecret,
    `${config.protocol}://${config.domain}/api/auth/google/callback`
  );
  if (token) {
    oauth2Client.setCredentials({ refresh_token: token });
  }
  currentAcctId = acctId;
  driveClient = null;
  logger.info(`Switched Drive client to account: ${acct?.email || 'env'}`);
  return oauth2Client;
}

function getDrive(): ReturnType<typeof google.drive> {
  if (!driveClient) {
    const auth = getOAuth2Client();
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

export function isGoogleDriveConfigured(): boolean {
  const acct = getCurrentAccount();
  if (acct) return !!(config.google.oauthClientId && config.google.oauthClientSecret);
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

async function findOrCreateFolder(drive: ReturnType<typeof google.drive>, name: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const createRes = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });

  const folderId = createRes.data.id!;
  logger.info(`Created Google Drive folder: ${name} (id: ${folderId})`);
  return folderId;
}

export async function ensureFolders(): Promise<void> {
  if (!isGoogleDriveConfigured()) return;
  const acct = getCurrentAccount();
  if (!acct) return;

  if (!acct.folderUploads || !acct.folderSigned) {
    const drive = getDrive();
    if (!acct.folderUploads) {
      acct.folderUploads = await findOrCreateFolder(drive, 'Uploads');
      logger.info(`Uploads folder: ${acct.folderUploads}`);
    }
    if (!acct.folderSigned) {
      acct.folderSigned = await findOrCreateFolder(drive, 'Signed');
      logger.info(`Signed folder: ${acct.folderSigned}`);
    }
    updateAccountFolders(acct.id, acct.folderUploads, acct.folderSigned);
  }
}

export function getFolderIds(): { uploads: string; signed: string } {
  const acct = getCurrentAccount();
  if (acct) {
    return {
      uploads: acct.folderUploads || config.google.folderUploads,
      signed: acct.folderSigned || config.google.folderSigned,
    };
  }
  return { uploads: config.google.folderUploads, signed: config.google.folderSigned };
}

function generateFileName(filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(filename);
  const safeName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${timestamp}_${random}_${safeName}${ext}`;
}

async function makePublic(drive: ReturnType<typeof google.drive>, fileId: string): Promise<string> {
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
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
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: mimeType || 'application/octet-stream', body: Readable.from(buffer) },
    fields: 'id',
  });

  const fileId = res.data.id!;
  const publicUrl = await makePublic(drive, fileId);
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
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: mimeType || 'application/octet-stream', body: fileStream },
    fields: 'id',
  });

  const fileId = res.data.id!;
  const publicUrl = await makePublic(drive, fileId);
  logger.info(`Uploaded stream to Drive: ${fileName} (id: ${fileId})`);
  return { fileId, publicUrl };
}

export async function downloadToFile(fileId: string, localPath: string): Promise<void> {
  const drive = getDrive();
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(localPath);
    res.data
      .on('end', () => { dest.close(); logger.info(`Downloaded from Drive: ${fileId}`); resolve(); })
      .on('error', (err) => { dest.close(); try { fs.unlinkSync(localPath); } catch {} reject(err); })
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
