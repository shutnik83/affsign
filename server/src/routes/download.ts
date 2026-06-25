import { Router, Request, Response } from 'express';
import { getApp } from '../services/storage';
import { getPublicUrl, isR2Configured } from '../services/r2';

const router = Router();

router.get('/download/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const app = getApp(id);

  if (!app) {
    res.status(404).json({ success: false, error: 'App not found' });
    return;
  }

  if (app.status !== 'signed' || !app.signedR2Key) {
    res.status(400).json({ success: false, error: 'App is not signed yet' });
    return;
  }

  if (!isR2Configured()) {
    res.status(500).json({ success: false, error: 'R2 storage not configured' });
    return;
  }

  const url = getPublicUrl(app.signedR2Key);
  res.redirect(url);
});

export { router as downloadRouter };
