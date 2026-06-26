import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { config } from './config';
import { logger } from './logger';
import { initStorage, cleanupOldApps } from './services/storage';
import { ensureFolders, isGoogleDriveConfigured } from './services/googleDrive';
import { addAccount, getAccountCount } from './services/accountStore';
import { uploadRouter } from './routes/upload';
import { signRouter } from './routes/sign';
import { installRouter } from './routes/install';
import { downloadRouter } from './routes/download';
import { appRouter } from './routes/app';
import { historyRouter } from './routes/history';
import { manifestRouter } from './routes/manifest';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

app.use('/api', uploadRouter);
app.use('/api', signRouter);
app.use('/api', installRouter);
app.use('/api', downloadRouter);
app.use('/api', appRouter);
app.use('/api', historyRouter);
app.use('/api', manifestRouter);
app.use('/api', authRouter);
app.use('/api', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const publicPath = path.join(__dirname, '..', 'public', 'client');
app.use(express.static(publicPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.use(errorHandler);

initStorage();

import fs from 'fs';
const uploadDir = path.join(config.paths.temp, 'uploads');
try {
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    for (const f of files) {
      try { fs.unlinkSync(path.join(uploadDir, f)); } catch {}
    }
    logger.info(`Cleaned ${files.length} old upload files`);
  }
} catch {}

const extractDirs = path.join(config.paths.temp);
try {
  if (fs.existsSync(extractDirs)) {
    const entries = fs.readdirSync(extractDirs, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && (e.name.startsWith('extract_') || e.name.startsWith('sign_'))) {
        try { fs.rmSync(path.join(extractDirs, e.name), { recursive: true, force: true }); } catch {}
      }
    }
  }
} catch {}

if (isGoogleDriveConfigured()) {
  if (getAccountCount() === 0 && config.google.refreshToken) {
    addAccount({
      email: 'primary-account',
      refreshToken: config.google.refreshToken,
      folderUploads: config.google.folderUploads,
      folderSigned: config.google.folderSigned,
    });
    logger.info('Auto-imported primary Google account from env');
  }
  ensureFolders().catch(err => logger.error('Failed to ensure Drive folders:', err));
}

setInterval(() => {
  cleanupOldApps();
}, config.cleanupIntervalMs);

app.listen(config.port, config.host, () => {
  logger.info(`AffSign server running on ${config.host}:${config.port}`);
  logger.info(`Domain: ${config.protocol}://${config.domain}`);
});
