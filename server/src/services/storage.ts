import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../logger';
import { AppData } from '../types';
import { deleteFile } from './googleDrive';

const apps = new Map<string, AppData>();

export function initStorage(): void {
  if (!fs.existsSync(config.paths.temp)) {
    fs.mkdirSync(config.paths.temp, { recursive: true });
  }
  logger.info('Storage initialized');
}

export function generateId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

export function createApp(driveFileId: string, originalName: string): AppData {
  const id = generateId();
  const app: AppData = {
    id,
    originalName,
    driveFileId,
    status: 'uploaded',
  };
  apps.set(id, app);
  return app;
}

export function getApp(id: string): AppData | undefined {
  return apps.get(id);
}

export function updateApp(id: string, updates: Partial<AppData>): AppData | undefined {
  const app = apps.get(id);
  if (!app) return undefined;
  Object.assign(app, updates);
  return app;
}

export async function deleteApp(id: string): Promise<boolean> {
  const app = apps.get(id);
  if (!app) return false;

  const idsToDelete = [app.driveFileId, app.signedDriveFileId, app.manifestDriveFileId].filter(Boolean) as string[];
  for (const fileId of idsToDelete) {
    if (fileId !== 'local') await deleteFile(fileId);
  }

  if (app.localIpaPath) {
    try { if (fs.existsSync(app.localIpaPath)) fs.unlinkSync(app.localIpaPath); } catch {}
  }

  apps.delete(id);
  return true;
}

export function getAllApps(): AppData[] {
  return Array.from(apps.values()).sort((a, b) => {
    const aTime = a.signedAt || '';
    const bTime = b.signedAt || '';
    return bTime.localeCompare(aTime);
  });
}

export function cleanupOldApps(): void {
  const now = Date.now();
  for (const [id, app] of apps.entries()) {
    if (app.status === 'error' && app.signedAt) {
      const signedTime = new Date(app.signedAt).getTime();
      if (now - signedTime > config.fileMaxAgeMs) {
        deleteApp(id);
        logger.info(`Cleaned up old error app: ${id}`);
      }
    }
  }
}
