import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { createApp } from '../services/storage';
import { extractIpa, parseAppInfo } from '../services/ipaParser';
import { logger } from '../logger';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = config.paths.uploads;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.ipa', '.p12', '.mobileprovision', '.provisionprofile'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${ext}. Allowed: ${allowedTypes.join(', ')}`));
    }
  },
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.ipa') {
      const app = createApp(req.file.path, req.file.originalname);

      const tempExtractDir = path.join(config.paths.temp, `extract_${app.id}`);
      fs.mkdirSync(tempExtractDir, { recursive: true });

      try {
        extractIpa(req.file.path, tempExtractDir);
        const appInfo = parseAppInfo(tempExtractDir);
        const fileSize = fs.statSync(req.file.path).size;
        appInfo.size = fileSize;

        app.info = appInfo;

        res.json({
          success: true,
          data: {
            id: app.id,
            type: 'ipa',
            info: appInfo,
          },
        });
      } catch (err) {
        app.status = 'error';
        app.error = err instanceof Error ? err.message : String(err);
        res.status(400).json({
          success: false,
          error: `Failed to parse IPA: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        try {
          fs.rmSync(tempExtractDir, { recursive: true, force: true });
        } catch {
          // cleanup non-critical
        }
      }
    } else if (ext === '.p12') {
      res.json({
        success: true,
        data: {
          type: 'p12',
          tempPath: req.file.path,
          originalName: req.file.originalname,
        },
      });
    } else if (ext === '.mobileprovision' || ext === '.provisionprofile') {
      res.json({
        success: true,
        data: {
          type: 'mobileprovision',
          tempPath: req.file.path,
          originalName: req.file.originalname,
        },
      });
    }
  } catch (err) {
    logger.error('Upload error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    });
  }
});

router.post('/upload/p12', (req: Request, res: Response) => {
  res.status(400).json({ success: false, error: 'Use POST /upload with multipart form data' });
});

router.post('/upload/provision', (req: Request, res: Response) => {
  res.status(400).json({ success: false, error: 'Use POST /upload with multipart form data' });
});

export { router as uploadRouter };
