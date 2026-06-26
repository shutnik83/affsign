import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { getAllAccounts, addAccount, removeAccount, setActiveAccount, getAccountCount } from '../services/accountStore';
import { config } from '../config';
import { logger } from '../logger';

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (!password || password !== config.adminPassword) {
    res.status(401).json({ success: false, error: 'Invalid password' });
    return false;
  }
  return true;
}

async function getStorageQuota(refreshToken: string): Promise<{ used: number; total: number; usedBytes: number; totalBytes: number } | null> {
  try {
    const auth = new google.auth.OAuth2(config.google.oauthClientId, config.google.oauthClientSecret, config.google.redirectUri);
    auth.setCredentials({ refresh_token: refreshToken });
    const drive = google.drive({ version: 'v3', auth });
    const about = await drive.about.get({ fields: 'storageQuota' });
    const q = about.data.storageQuota;
    if (!q) return null;
    const totalBytes = parseInt(q.limit || '0', 10);
    const usedBytes = parseInt(q.usage || '0', 10);
    return {
      totalBytes,
      usedBytes,
      total: totalBytes > 0 ? Math.round((totalBytes - usedBytes) / (1024 * 1024 * 1024) * 10) / 10 : 0,
      used: totalBytes > 0 ? Math.round(usedBytes / (1024 * 1024 * 1024) * 10) / 10 : 0,
    };
  } catch (err) {
    logger.error(`Failed to get quota: ${err}`);
    return null;
  }
}

router.post('/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || password !== config.adminPassword) {
    res.status(401).json({ success: false, error: 'Invalid password' });
    return;
  }
  res.json({ success: true });
});

router.get('/admin/accounts', async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const accounts = getAllAccounts();
  const data = await Promise.all(accounts.map(async (acct) => {
    const quota = await getStorageQuota(acct.refreshToken);
    return {
      id: acct.id,
      email: acct.email,
      folderUploads: acct.folderUploads,
      folderSigned: acct.folderSigned,
      addedAt: acct.addedAt,
      storage: quota,
    };
  }));
  res.json({ success: true, data, count: getAccountCount() });
});

router.post('/admin/accounts', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { email, refreshToken, folderUploads, folderSigned } = req.body;
  if (!email || !refreshToken) {
    res.status(400).json({ success: false, error: 'email and refreshToken are required' });
    return;
  }
  const account = addAccount({ email, refreshToken, folderUploads: folderUploads || '', folderSigned: folderSigned || '' });
  res.json({ success: true, data: { id: account.id, email: account.email, addedAt: account.addedAt } });
});

router.delete('/admin/accounts/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const deleted = removeAccount(req.params.id);
  res.json(deleted ? { success: true } : { success: false, error: 'Account not found' });
  if (!deleted) res.status(404);
});

router.post('/admin/accounts/:id/activate', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const activated = setActiveAccount(req.params.id);
  res.json(activated ? { success: true } : { success: false, error: 'Account not found' });
  if (!activated) res.status(404);
});

const pendingAuth = new Map<string, { password: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingAuth) {
    if (now - val.createdAt > 5 * 60 * 1000) pendingAuth.delete(key);
  }
}, 60_000);

router.get('/admin/auth/google', (req: Request, res: Response) => {
  const password = req.query.password as string;
  if (!password || password !== config.adminPassword) {
    res.status(401).send('Unauthorized');
    return;
  }
  if (!config.google.oauthClientId || !config.google.oauthClientSecret) {
    res.status(500).send('OAuth not configured');
    return;
  }

  const state = Buffer.from(Date.now().toString()).toString('base64url');
  pendingAuth.set(state, { password, createdAt: Date.now() });

  const auth = new google.auth.OAuth2(
    config.google.oauthClientId,
    config.google.oauthClientSecret,
    config.google.redirectUri
  );

  const url = auth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
    state,
  });

  res.redirect(url);
});

router.get('/admin/auth/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    res.status(400).send('Missing parameters');
    return;
  }

  const pending = pendingAuth.get(state);
  if (!pending) {
    res.status(400).send('Session expired or invalid');
    return;
  }
  pendingAuth.delete(state);

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
    logger.error('OAuth callback error:', err);
    res.status(500).send(`Authorization failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});

export { router as adminRouter };
