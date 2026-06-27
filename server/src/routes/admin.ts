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

export const pendingAdminAuth = new Map<string, { password: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingAdminAuth) {
    if (now - val.createdAt > 5 * 60 * 1000) pendingAdminAuth.delete(key);
  }
}, 60_000);

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
  } catch {
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
      id: acct.id, email: acct.email, folderUploads: acct.folderUploads,
      folderSigned: acct.folderSigned, addedAt: acct.addedAt, storage: quota,
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

  const state = 'admin_' + Buffer.from(Date.now().toString()).toString('base64url');
  pendingAdminAuth.set(state, { password, createdAt: Date.now() });

  const redirectUri = `${config.protocol}://${config.domain}/api/auth/google/callback`;
  const auth = new google.auth.OAuth2(
    config.google.oauthClientId,
    config.google.oauthClientSecret,
    redirectUri
  );

  const url = auth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent',
    state,
  });

  res.redirect(url);
});

export { router as adminRouter };
