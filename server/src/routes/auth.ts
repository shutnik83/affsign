import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { getAuthUrl, handleAuthCallback, isGoogleDriveConfigured } from '../services/googleDrive';
import { config } from '../config';
import { logger } from '../logger';
import { pendingAdminAuth, adminRouter } from './admin';
import { addAccount } from '../services/accountStore';

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
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).send('Missing authorization code');
    return;
  }

  const stateStr = typeof state === 'string' ? state : '';
  const isAdminFlow = stateStr.startsWith('admin_');

  if (isAdminFlow) {
    const pending = pendingAdminAuth.get(stateStr);
    if (!pending) {
      res.status(400).send('Session expired or invalid');
      return;
    }
    pendingAdminAuth.delete(stateStr);

    try {
      const auth = new google.auth.OAuth2(
        config.google.oauthClientId,
        config.google.oauthClientSecret,
        config.google.redirectUri
      );

      const { tokens } = await auth.getToken(code);
      auth.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email || 'unknown';

      const refreshToken = tokens.refresh_token || '';
      if (!refreshToken) {
        res.status(400).send('No refresh token received. Make sure you used prompt=consent.');
        return;
      }

      addAccount({ email, refreshToken, folderUploads: '', folderSigned: '' });
      logger.info(`OAuth account added: ${email}`);

      res.send(`<!DOCTYPE html>
<html><head><title>Done</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000;color:#fff;margin:0;}
.box{text-align:center;max-width:400px;padding:40px;}
h1{color:#22c55e;margin-bottom:12px;}p{color:#888;}</style></head>
<body><div class="box">
<h1>&#10003; Account added</h1><p>${email}</p>
<p style="margin-top:16px;color:#555;font-size:13px;">You can close this tab.</p>
</div></body></html>`);
    } catch (err) {
      logger.error('Admin OAuth callback error:', err);
      res.status(500).send(`Authorization failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    try {
      const refreshToken = await handleAuthCallback(code);
      const successHtml = `<!DOCTYPE html>
<html><head><title>Authorization Successful</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000;color:#fff;margin:0;}
.box{text-align:center;max-width:400px;padding:40px;}
h1{color:#22c55e;margin-bottom:16px;}p{color:#888;line-height:1.6;}
.code{background:#1a1a1a;padding:12px;border-radius:8px;margin:16px 0;font-family:monospace;font-size:11px;word-break:break-all;color:#aaa;}</style></head>
<body><div class="box">
<h1>Authorized!</h1>
<p>Google Drive connected successfully.</p>
<div class="code">${refreshToken}</div>
<p>Copy this refresh token and set it as <strong>GOOGLE_REFRESH_TOKEN</strong> in Railway Variables.</p>
</div></body></html>`;
      res.send(successHtml);
    } catch (err) {
      logger.error('OAuth callback error:', err);
      res.status(500).send(`Authorization failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
});

router.get('/auth/status', (req: Request, res: Response) => {
  res.json({ configured: isGoogleDriveConfigured() });
});

export { router as authRouter };
