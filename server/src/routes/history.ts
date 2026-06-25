import { Router, Request, Response } from 'express';
import { getAllApps } from '../services/storage';

const router = Router();

router.get('/history', (req: Request, res: Response) => {
  try {
    const apps = getAllApps();
    res.json({
      success: true,
      data: apps.map((app) => ({
        id: app.id,
        originalName: app.originalName,
        info: app.info,
        certificate: app.certificate,
        status: app.status,
        signedAt: app.signedAt,
        installUrl: app.installUrl,
        otaLink: app.otaLink,
        error: app.error,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

export { router as historyRouter };
