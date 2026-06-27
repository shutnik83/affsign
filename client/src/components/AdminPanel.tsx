import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Trash2, Check, LogIn, Plus, HardDrive, FileCheck, AlertCircle, Clock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const API_BASE = '/api';

interface Stats {
  totalSigned: number;
  totalErrors: number;
  totalUploaded: number;
  recentSigned: { id: string; name: string; signedAt: string }[];
}

interface AccountStorage {
  used: number;
  total: number;
  usedBytes: number;
  totalBytes: number;
}

interface Account {
  id: string;
  email: string;
  folderUploads: string;
  folderSigned: string;
  addedAt: string;
  storage: AccountStorage | null;
}

function StorageBar({ storage }: { storage: AccountStorage | null }) {
  if (!storage || storage.totalBytes === 0) {
    return <div className="text-xs text-[var(--text-muted)]">—</div>;
  }
  const pct = Math.min((storage.usedBytes / storage.totalBytes) * 100, 100);
  const free = storage.total - storage.used;
  const color = pct > 90 ? 'from-red-500 to-orange-500' : pct > 70 ? 'from-yellow-500 to-orange-400' : 'from-blue-500 to-cyan-400';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{storage.used} GB used</span>
        <span className="text-[var(--text-muted)]">{free} GB free</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-[var(--text-muted)]">{storage.total} GB total</div>
    </div>
  );
}

export function AdminPanel() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const headers = () => ({ 'Content-Type': 'application/json', 'X-Admin-Password': password });

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: headers() });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
  };

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

  useEffect(() => { if (loggedIn) { loadAccounts(); loadStats(); } }, [loggedIn]);

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
    const interval = setInterval(() => { loadAccounts(); loadStats(); }, 5000);
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

  const totalUsed = accounts.reduce((s, a) => s + (a.storage?.usedBytes || 0), 0);
  const totalSpace = accounts.reduce((s, a) => s + (a.storage?.totalBytes || 0), 0);

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
              className="glass-solid glow-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
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
                    {accounts.length > 0 && (
                      <div className="rounded-xl glass glow-border p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <HardDrive className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium text-[var(--text-primary)]">{t('adminTotalStorage')}</span>
                        </div>
                        {totalSpace > 0 ? (
                          <StorageBar storage={{ usedBytes: totalUsed, totalBytes: totalSpace, used: Math.round(totalUsed / (1024**3) * 10) / 10, total: Math.round(totalSpace / (1024**3) * 10) / 10 }} />
                        ) : (
                          <div className="text-xs text-[var(--text-muted)]">—</div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleAddGoogle}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-sm hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {t('adminAddGoogle')}
                    </button>

                    {stats && (
                      <div className="rounded-xl glass glow-border p-4">
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <FileCheck className="w-4 h-4 text-green-400" />
                              <span className="text-lg font-bold text-green-400">{stats.totalSigned}</span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">{t('adminStatsSigned')}</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <AlertCircle className="w-4 h-4 text-red-400" />
                              <span className="text-lg font-bold text-red-400">{stats.totalErrors}</span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">{t('adminStatsErrors')}</div>
                          </div>
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Clock className="w-4 h-4 text-yellow-400" />
                              <span className="text-lg font-bold text-yellow-400">{stats.totalUploaded}</span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">{t('adminStatsPending')}</div>
                          </div>
                        </div>

                        {stats.recentSigned.length > 0 && (
                          <div className="border-t border-[var(--border)] pt-3">
                            <div className="text-[10px] text-[var(--text-muted)] mb-2">{t('adminRecentSigned')}</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {stats.recentSigned.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <span className="text-[var(--text-secondary)] truncate">{item.name}</span>
                                  <span className="text-[var(--text-muted)] text-[10px] flex-shrink-0 ml-2">
                                    {new Date(item.signedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t border-[var(--border)] pt-4">
                      <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                        {t('adminAccounts')} ({accounts.length})
                      </h3>
                      {loading && accounts.length === 0 ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-sm">{t('adminLoading')}</div>
                      ) : accounts.length === 0 ? (
                        <div className="text-center py-4 text-[var(--text-muted)] text-sm">{t('adminNoAccounts')}</div>
                      ) : (
                        <div className="space-y-3">
                          {accounts.map((acct) => (
                            <div key={acct.id} className="rounded-xl glass glow-border p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">{acct.email}</div>
                                  <div className="text-[10px] text-[var(--text-muted)]">{t('adminAdded')} {new Date(acct.addedAt).toLocaleDateString()}</div>
                                </div>
                                <button onClick={() => handleActivate(acct.id)} className="p-1.5 rounded-lg glass glow-border text-[var(--text-secondary)] hover:text-green-400 transition-colors" title={t('adminActivate')}>
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(acct.id)} className="p-1.5 rounded-lg glass glow-border text-[var(--text-secondary)] hover:text-red-400 transition-colors" title={t('adminDelete')}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <StorageBar storage={acct.storage} />
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
