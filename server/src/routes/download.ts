import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getApp } from '../services/storage';

const router = Router();

router.get('/download/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const app = getApp(id);

  if (!app) {
    res.status(404).json({ success: false, error: 'App not found' });
    return;
  }

  if (app.status !== 'signed' || !app.signedPath) {
    res.status(400).json({ success: false, error: 'App is not signed yet' });
    return;
  }

  if (!fs.existsSync(app.signedPath)) {
    res.status(404).json({ success: false, error: 'Signed file not found' });
    return;
  }

  const filename = `signed_${app.info?.name || 'app'}.ipa`;
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(app.signedPath);
  fileStream.pipe(res);

  fileStream.on('error', (err) => {
    res.status(500).json({ success: false, error: 'Download failed' });
  });
});

export { router as downloadRouter };
