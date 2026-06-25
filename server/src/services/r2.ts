import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../logger';

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return r2Client;
}

export function isR2Configured(): boolean {
  return !!(config.r2.accountId && config.r2.accessKeyId && config.r2.secretAccessKey && config.r2.bucket);
}

export function generateR2Key(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(filename);
  const safeName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}/${timestamp}_${random}_${safeName}${ext}`;
}

export async function uploadFileToR2(
  localPath: string,
  r2Key: string,
  contentType?: string
): Promise<string> {
  const client = getR2Client();
  const fileBuffer = fs.readFileSync(localPath);

  const command = new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: r2Key,
    Body: fileBuffer,
    ContentType: contentType || 'application/octet-stream',
  });

  await client.send(command);
  logger.info(`Uploaded to R2: ${r2Key}`);

  return `${config.r2.publicUrl}/${r2Key}`;
}

export async function uploadBufferToR2(
  buffer: Buffer,
  r2Key: string,
  contentType?: string
): Promise<string> {
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: r2Key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });

  await client.send(command);
  logger.info(`Uploaded buffer to R2: ${r2Key}`);

  return `${config.r2.publicUrl}/${r2Key}`;
}

export async function downloadFromR2(r2Key: string, localPath: string): Promise<void> {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: config.r2.bucket,
    Key: r2Key,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error('Empty response from R2');
  }

  const chunks: Uint8Array[] = [];
  const reader = response.Body.transformToWebStream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(localPath, Buffer.concat(chunks));
  logger.info(`Downloaded from R2: ${r2Key} -> ${localPath}`);
}

export async function deleteFromR2(r2Key: string): Promise<void> {
  try {
    const client = getR2Client();
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: config.r2.bucket,
      Key: r2Key,
    });
    await client.send(command);
    logger.info(`Deleted from R2: ${r2Key}`);
  } catch (err) {
    logger.error(`Failed to delete from R2: ${r2Key}`, err);
  }
}

export function getPublicUrl(r2Key: string): string {
  return `${config.r2.publicUrl}/${r2Key}`;
}
