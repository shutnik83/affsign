import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ExternalLink, Trash2, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getLocalHistory, deleteFromHistory, deleteApp, getDownloadUrl, formatFileSize, type HistoryItem } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

export function HistoryPanel() {
  const { t } = useLanguage();
  const [apps, setApps] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadHistory = () => {
    setLoading(true);
    try {
      setApps(getLocalHistory());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      deleteFromHistory(id);
      deleteApp(id).catch(() => {});
      setApps((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--text-primary)] rounded-full animate-spin" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
        <Clock className="w-12 h-12 text-[var(--border)] mx-auto mb-4" />
        <p className="text-[var(--text-secondary)] text-lg">{t('noSignedApps')}</p>
        <p className="text-[var(--text-muted)] text-sm mt-1">{t('historyWillAppear')}</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t('signingHistory')}</h2>
        <button
          onClick={loadHistory}
          className="p-2 rounded-lg bg-[var(--bg-card-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {apps.map((app) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--bg-hover)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {app.info?.iconBase64 ? (
                  <img src={`data:image/png;base64,${app.info.iconBase64}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">📱</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)] truncate">
                    {app.info?.name || app.originalName}
                  </span>
                  {app.status === 'signed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : app.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : null}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {app.info?.bundleId} &middot; v{app.info?.version}
                  {app.info?.size ? ` · ${formatFileSize(app.info.size)}` : ''}
                </div>
                {app.signedAt && (
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {t('signed')} {new Date(app.signedAt).toLocaleString()}
                  </div>
                )}
                {app.error && (
                  <div className="text-xs text-red-500 dark:text-red-400 mt-1">{app.error}</div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {app.status === 'signed' && (
                  <>
                    <a
                      href={getDownloadUrl(app.id)}
                      className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
                      title={t('downloadIPA')}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {app.otaLink && (
                      <a
                        href={app.otaLink}
                        className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-hover)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
                        title={t('install')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleDelete(app.id)}
                  disabled={deleting === app.id}
                  className="p-2 rounded-lg bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 border border-[var(--border)] transition-colors disabled:opacity-50"
                >
                  {deleting === app.id ? (
                    <div className="w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
