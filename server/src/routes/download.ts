import { Router, Request, Response } from 'express';
import { getApp } from '../services/storage';
import { getPublicUrl, isGoogleDriveConfigured } from '../services/googleDrive';

const router = Router();

router.get('/download/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const app = getApp(id);

  if (!app) {
    res.status(404).json({ success: false, error: 'App not found' });
    return;
  }

  if (app.status !== 'signed' || !app.signedDriveFileId) {
    res.status(400).json({ success: false, error: 'App is not signed yet' });
    return;
  }

  if (!isGoogleDriveConfigured()) {
    res.status(500).json({ success: false, error: 'Google Drive storage not configured' });
    return;
  }

  const url = await getPublicUrl(app.signedDriveFileId);
  res.redirect(url);
});

export { router as downloadRouter };
