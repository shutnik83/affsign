import { Router, Request, Response } from 'express';
import { getAuthUrl, handleAuthCallback, isGoogleDriveConfigured } from '../services/googleDrive';
import { config } from '../config';
import { logger } from '../logger';

const router = Router();

router.get('/auth/google', (req: Request, res: Response) => {
  if (!config.google.oauthClientId || !config.google.oauthClientSecret) {
    res.status(500).json({ success: false, error: 'OAuth credentials not configured' });
    return;
  }
  const url = getAuthUrl();
  res.redirect(url);
});

router.get('/auth/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    const refreshToken = await handleAuthCallback(code);
    const successHtml = `<!DOCTYPE html>
<html>
<head><title>Authorization Successful</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000;color:#fff;margin:0;}
.box{text-align:center;max-width:400px;padding:40px;}
h1{color:#22c55e;margin-bottom:16px;}p{color:#888;line-height:1.6;}
.code{background:#1a1a1a;padding:12px;border-radius:8px;margin:16px 0;font-family:monospace;font-size:11px;word-break:break-all;color:#aaa;}</style></head>
<body><div class="box">
<h1>Authorized!</h1>
<p>Google Drive connected successfully.</p>
<div class="code">${refreshToken}</div>
<p>Copy this refresh token and set it as <strong>GOOGLE_REFRESH_TOKEN</strong> in Railway Variables, then redeploy.</p>
</div></body></html>`;
    res.send(successHtml);
  } catch (err) {
    logger.error('OAuth callback error:', err);
    res.status(500).send(`Authorization failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});

router.get('/auth/status', (req: Request, res: Response) => {
  res.json({ configured: isGoogleDriveConfigured() });
});

export { router as authRouter };
