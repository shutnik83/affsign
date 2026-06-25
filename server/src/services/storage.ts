import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../logger';
import { AppData } from '../types';

const apps = new Map<string, AppData>();

export function initStorage(): void {
  Object.values(config.paths).forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  logger.info('Storage directories initialized');
}

export function generateId(): string {
  return uuidv4().replace(/-/g, '').substring(0, 16);
}

export function createApp(ipaPath: string, originalName: string): AppData {
  const id = generateId();
  const app: AppData = {
    id,
    originalName,
    ipaPath,
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

export function deleteApp(id: string): boolean {
  const app = apps.get(id);
  if (!app) return false;

  const filesToDelete = [app.ipaPath, app.signedPath, app.manifestPath];
  filesToDelete.forEach((filePath) => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        logger.error(`Failed to delete file ${filePath}:`, err);
      }
    }
  });

  const installDir = path.join(config.paths.install, id);
  if (fs.existsSync(installDir)) {
    try {
      fs.rmSync(installDir, { recursive: true, force: true });
    } catch (err) {
      logger.error(`Failed to delete install dir ${installDir}:`, err);
    }
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

export function cleanupTempFiles(): void {
  const now = Date.now();
  try {
    const tempFiles = fs.readdirSync(config.paths.temp);
    for (const file of tempFiles) {
      const filePath = path.join(config.paths.temp, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > config.fileMaxAgeMs) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old temp file: ${file}`);
      }
    }
  } catch (err) {
    logger.error('Error during temp cleanup:', err);
  }
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
