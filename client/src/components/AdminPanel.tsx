import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Plus, Trash2, Check, LogIn } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const API_BASE = '/api';

interface Account {
  id: string;
  email: string;
  folderUploads: string;
  folderSigned: string;
  addedAt: string;
}

export function AdminPanel() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [newRefreshToken, setNewRefreshToken] = useState('');
  const [newFolderUploads, setNewFolderUploads] = useState('');
  const [newFolderSigned, setNewFolderSigned] = useState('');
  const [addError, setAddError] = useState('');

  const headers = () => ({ 'Content-Type': 'application/json', 'X-Admin-Password': password });

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/accounts`, { headers: headers() });
      const data = await res.json();
      if (data.success) setAccounts(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedIn) loadAccounts();
  }, [loggedIn]);

  const handleLogin = async () => {
    setPasswordError('');
    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setLoggedIn(true);
        localStorage.setItem('affsign_admin_pw', password);
      } else {
        setPasswordError('Invalid password');
      }
    } catch {
      setPasswordError('Connection error');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('affsign_admin_pw');
    if (saved) {
      setPassword(saved);
      fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: saved }),
      }).then((r) => { if (r.ok) setLoggedIn(true); }).catch(() => {});
    }
  }, []);

  const handleAdd = async () => {
    setAddError('');
    if (!newEmail || !newRefreshToken) {
      setAddError('Email and Refresh Token are required');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/admin/accounts`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          email: newEmail,
          refreshToken: newRefreshToken,
          folderUploads: newFolderUploads,
          folderSigned: newFolderSigned,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewEmail('');
        setNewRefreshToken('');
        setNewFolderUploads('');
        setNewFolderSigned('');
        loadAccounts();
      } else {
        setAddError(data.error || 'Failed to add account');
      }
    } catch {
      setAddError('Connection error');
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/admin/accounts/${id}`, { method: 'DELETE', headers: headers() });
    loadAccounts();
  };

  const handleActivate = async (id: string) => {
    await fetch(`${API_BASE}/admin/accounts/${id}/activate`, { method: 'POST', headers: headers() });
    loadAccounts();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center"
      >
        <Settings className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--bg-card-solid)] border border-[var(--border)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Admin</h2>
                <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {!loggedIn ? (
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--text-secondary)]">Enter admin password</p>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      placeholder="Password"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm"
                    />
                    {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                    <button
                      onClick={handleLogin}
                      className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" /> Login
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-[var(--text-secondary)]">Add Google Account</h3>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm"
                      />
                      <input
                        type="text"
                        value={newRefreshToken}
                        onChange={(e) => setNewRefreshToken(e.target.value)}
                        placeholder="Refresh Token"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm"
                      />
                      <input
                        type="text"
                        value={newFolderUploads}
                        onChange={(e) => setNewFolderUploads(e.target.value)}
                        placeholder="Uploads Folder ID (optional)"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm"
                      />
                      <input
                        type="text"
                        value={newFolderSigned}
                        onChange={(e) => setNewFolderSigned(e.target.value)}
                        placeholder="Signed Folder ID (optional)"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm"
                      />
                      {addError && <p className="text-xs text-red-500">{addError}</p>}
                      <button
                        onClick={handleAdd}
                        className="w-full py-2.5 rounded-xl bg-green-600 text-white font-medium text-sm hover:bg-green-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Account
                      </button>
                    </div>

                    <div className="border-t border-[var(--border)] pt-4">
                      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                        Accounts ({accounts.length})
                      </h3>
                      {loading ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-sm">Loading...</div>
                      ) : accounts.length === 0 ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-sm">No accounts added</div>
                      ) : (
                        <div className="space-y-2">
                          {accounts.map((acct, i) => (
                            <div
                              key={acct.id}
                              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{acct.email}</div>
                                <div className="text-xs text-[var(--text-muted)] truncate">
                                  Added {new Date(acct.addedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button
                                onClick={() => handleActivate(acct.id)}
                                className="p-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-green-500 border border-[var(--border)] transition-colors"
                                title="Activate"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(acct.id)}
                                className="p-1.5 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-red-500 border border-[var(--border)] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
