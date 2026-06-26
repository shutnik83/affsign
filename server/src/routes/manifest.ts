import { Router, Request, Response } from 'express';
import { getPublicUrl, isGoogleDriveConfigured } from '../services/googleDrive';

const router = Router();

router.get('/manifest/:fileId', async (req: Request, res: Response) => {
  const { fileId } = req.params;

  if (!isGoogleDriveConfigured()) {
    res.status(500).json({ success: false, error: 'Google Drive storage not configured' });
    return;
  }

  const url = await getPublicUrl(fileId);
  res.redirect(url);
});

export { router as manifestRouter };
