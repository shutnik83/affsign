import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { createApp } from '../services/storage';
import { extractIpa, parseAppInfo } from '../services/ipaParser';
import { uploadBufferToR2, generateR2Key, isR2Configured } from '../services/r2';
import { logger } from '../logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
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
      const r2Key = generateR2Key('ipas', req.file.originalname);
      const tempPath = path.join(config.paths.temp, `upload_${Date.now()}${ext}`);

      try {
        fs.mkdirSync(path.dirname(tempPath), { recursive: true });
        fs.writeFileSync(tempPath, req.file.buffer);

        const tempExtractDir = path.join(config.paths.temp, `extract_${Date.now()}`);
        fs.mkdirSync(tempExtractDir, { recursive: true });

        try {
          extractIpa(tempPath, tempExtractDir);
          const appInfo = parseAppInfo(tempExtractDir);
          appInfo.size = req.file.size;

          let finalR2Key = r2Key;
          if (isR2Configured()) {
            await uploadBufferToR2(req.file.buffer, r2Key, 'application/zip');
          }

          const app = createApp(finalR2Key, req.file.originalname);
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
          res.status(400).json({
            success: false,
            error: `Failed to parse IPA: ${err instanceof Error ? err.message : String(err)}`,
          });
        } finally {
          try {
            fs.rmSync(tempExtractDir, { recursive: true, force: true });
          } catch {}
          try {
            fs.unlinkSync(tempPath);
          } catch {}
        }
      } catch (err) {
        logger.error('IPA upload error:', err);
        res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    } else if (ext === '.p12') {
      const r2Key = generateR2Key('certs', req.file.originalname);
      if (isR2Configured()) {
        await uploadBufferToR2(req.file.buffer, r2Key, 'application/x-pkcs12');
      }
      res.json({
        success: true,
        data: {
          type: 'p12',
          r2Key,
          originalName: req.file.originalname,
        },
      });
    } else if (ext === '.mobileprovision' || ext === '.provisionprofile') {
      const r2Key = generateR2Key('provisions', req.file.originalname);
      if (isR2Configured()) {
        await uploadBufferToR2(req.file.buffer, r2Key, 'application/octet-stream');
      }
      res.json({
        success: true,
        data: {
          type: 'mobileprovision',
          r2Key,
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
