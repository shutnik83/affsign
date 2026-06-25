import { Router, Request, Response } from 'express';
import { getApp, deleteApp, getAllApps } from '../services/storage';
import { logger } from '../logger';

const router = Router();

router.delete('/app/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const app = getApp(id);

    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    const deleted = deleteApp(id);
    if (deleted) {
      res.json({ success: true, data: { message: 'App deleted successfully' } });
    } else {
      res.status(500).json({ success: false, error: 'Failed to delete app' });
    }
  } catch (err) {
    logger.error('Delete error:', err);
    res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

router.get('/app/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const app = getApp(id);

    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: app.id,
        originalName: app.originalName,
        info: app.info,
        certificate: app.certificate,
        status: app.status,
        signedAt: app.signedAt,
        installUrl: app.installUrl,
        otaLink: app.otaLink,
        error: app.error,
      },
    });
  } catch (err) {
    logger.error('Get app error:', err);
    res.status(500).json({ success: false, error: 'Failed to get app' });
  }
});

export { router as appRouter };
