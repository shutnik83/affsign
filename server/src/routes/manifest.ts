import { Router, Request, Response } from 'express';
import { getApp } from '../services/storage';

const router = Router();

router.get('/manifest/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const app = getApp(id);

  if (!app || !app.manifestContent) {
    res.status(404).json({ success: false, error: 'Manifest not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/xml');
  res.send(app.manifestContent);
});

export { router as manifestRouter };
