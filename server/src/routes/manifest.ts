import { Router, Request, Response } from 'express';
import { getPublicUrl, isR2Configured } from '../services/r2';

const router = Router();

router.get('/manifest/:key', (req: Request, res: Response) => {
  const { key } = req.params;

  if (!isR2Configured()) {
    res.status(500).json({ success: false, error: 'R2 storage not configured' });
    return;
  }

  const r2Key = `manifests/${key}`;
  const url = getPublicUrl(r2Key);
  res.redirect(url);
});

export { router as manifestRouter };
