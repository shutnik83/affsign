import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { createApp } from '../services/storage';
import { extractIpa, parseAppInfo } from '../services/ipaParser';
import { uploadBuffer, uploadFileStream, isGoogleDriveConfigured, getFolderIds } from '../services/googleDrive';
import { logger } from '../logger';

const router = Router();

const uploadDir = path.join(config.paths.temp, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
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

function cleanupFile(filePath?: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
}

function cleanupDir(dirPath: string): void {
  try {
    if (dirPath && fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {}
}

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  const uploadedFile = req.file?.path;
  let ipaKept = false;

  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    logger.info(`Upload received: ${req.file.originalname} (${req.file.size} bytes, type: ${ext})`);

    if (ext === '.ipa') {
      const tempExtractDir = path.join(config.paths.temp, `extract_${Date.now()}`);

      try {
        extractIpa(uploadedFile!, tempExtractDir);
        logger.info(`IPA extracted: ${tempExtractDir}`);

        const appInfo = parseAppInfo(tempExtractDir);
        appInfo.size = req.file.size;
        logger.info(`IPA parsed: ${appInfo.name} (${appInfo.bundleId})`);

        const app = createApp('local', req.file.originalname);
        app.info = appInfo;
        app.localIpaPath = uploadedFile;
        ipaKept = true;

        res.json({
          success: true,
          data: {
            id: app.id,
            type: 'ipa',
            info: appInfo,
          },
        });
      } catch (err) {
        logger.error('IPA parse error:', err);
        res.status(400).json({
          success: false,
          error: `Failed to parse IPA: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        cleanupDir(tempExtractDir);
      }
    } else if (ext === '.p12') {
      let driveFileId = 'local';
      if (isGoogleDriveConfigured()) {
        const result = await uploadBuffer(
          fs.readFileSync(uploadedFile!),
          req.file.originalname,
          getFolderIds().uploads,
          'application/x-pkcs12'
        );
        driveFileId = result.fileId;
      }
      res.json({
        success: true,
        data: { type: 'p12', driveFileId, originalName: req.file.originalname },
      });
    } else if (ext === '.mobileprovision' || ext === '.provisionprofile') {
      let driveFileId = 'local';
      if (isGoogleDriveConfigured()) {
        const result = await uploadBuffer(
          fs.readFileSync(uploadedFile!),
          req.file.originalname,
          getFolderIds().uploads,
          'application/octet-stream'
        );
        driveFileId = result.fileId;
      }
      res.json({
        success: true,
        data: { type: 'mobileprovision', driveFileId, originalName: req.file.originalname },
      });
    }
  } catch (err) {
    logger.error('Upload error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    });
  } finally {
    if (!ipaKept) cleanupFile(uploadedFile);
  }
});

router.post('/upload/p12', (req: Request, res: Response) => {
  res.status(400).json({ success: false, error: 'Use POST /upload with multipart form data' });
});

router.post('/upload/provision', (req: Request, res: Response) => {
  res.status(400).json({ success: false, error: 'Use POST /upload with multipart form data' });
});

export { router as uploadRouter };
