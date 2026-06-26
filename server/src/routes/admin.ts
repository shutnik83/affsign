import { Router, Request, Response } from 'express';
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

router.post('/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || password !== config.adminPassword) {
    res.status(401).json({ success: false, error: 'Invalid password' });
    return;
  }
  res.json({ success: true });
});

router.get('/admin/accounts', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const accounts = getAllAccounts().map(({ refreshToken, ...rest }) => rest);
  res.json({ success: true, data: accounts, count: getAccountCount() });
});

router.post('/admin/accounts', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { email, refreshToken, folderUploads, folderSigned } = req.body;

  if (!email || !refreshToken) {
    res.status(400).json({ success: false, error: 'email and refreshToken are required' });
    return;
  }

  const account = addAccount({
    email,
    refreshToken,
    folderUploads: folderUploads || '',
    folderSigned: folderSigned || '',
  });

  res.json({ success: true, data: { id: account.id, email: account.email, addedAt: account.addedAt } });
});

router.delete('/admin/accounts/:id', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const deleted = removeAccount(req.params.id);
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Account not found' });
  }
});

router.post('/admin/accounts/:id/activate', (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const activated = setActiveAccount(req.params.id);
  if (activated) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Account not found' });
  }
});

export { router as adminRouter };
