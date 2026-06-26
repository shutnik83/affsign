import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Trash2, Check, LogIn, Plus } from 'lucide-react';
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

  useEffect(() => { if (loggedIn) loadAccounts(); }, [loggedIn]);

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
        setPasswordError(t('adminInvalidPassword'));
      }
    } catch {
      setPasswordError(t('adminConnectionError'));
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

  const handleAddGoogle = () => {
    window.open(`${API_BASE}/admin/auth/google?password=${encodeURIComponent(password)}`, '_blank');
  };

  useEffect(() => {
    if (!loggedIn) return;
    const interval = setInterval(loadAccounts, 3000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/admin/accounts/${id}`, { method: 'DELETE', headers: headers() });
    loadAccounts();
  };

  const handleActivate = async (id: string) => {
    await fetch(`${API_BASE}/admin/accounts/${id}/activate`, { method: 'POST', headers: headers() });
    loadAccounts();
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl glass glow-border text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full btn-glass shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center hover:scale-110"
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
              className="glass-solid glow-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('adminTitle')}</h2>
                <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                {!loggedIn ? (
                  <div className="space-y-4">
                    <p className="text-sm text-[var(--text-secondary)]">{t('adminEnterPassword')}</p>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      placeholder={t('adminPassword')}
                      className={inputClass}
                    />
                    {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                    <button
                      onClick={handleLogin}
                      className="w-full py-3 rounded-xl btn-glass font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4" /> {t('adminLogin')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <button
                      onClick={handleAddGoogle}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-sm hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {t('adminAddGoogle')}
                    </button>

                    <div className="border-t border-[var(--border)] pt-4">
                      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                        {t('adminAccounts')} ({accounts.length})
                      </h3>
                      {loading ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-sm">{t('adminLoading')}</div>
                      ) : accounts.length === 0 ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-sm">{t('adminNoAccounts')}</div>
                      ) : (
                        <div className="space-y-2">
                          {accounts.map((acct) => (
                            <div key={acct.id} className="flex items-center gap-3 p-3 rounded-xl glass glow-border">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{acct.email}</div>
                                <div className="text-xs text-[var(--text-muted)] truncate">
                                  {t('adminAdded')} {new Date(acct.addedAt).toLocaleDateString()}
                                </div>
                              </div>
                              <button onClick={() => handleActivate(acct.id)} className="p-1.5 rounded-lg glass glow-border text-[var(--text-secondary)] hover:text-green-400 transition-colors" title={t('adminActivate')}>
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(acct.id)} className="p-1.5 rounded-lg glass glow-border text-[var(--text-secondary)] hover:text-red-400 transition-colors" title={t('adminDelete')}>
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
