import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ExternalLink, Trash2, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getHistory, deleteApp, getDownloadUrl, formatFileSize, type HistoryItem } from '../api/client';

export function HistoryPanel() {
  const [apps, setApps] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory();
      if (res.success && res.data) {
        setApps(res.data);
      }
    } catch {
      // ignore
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
      await deleteApp(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-20"
      >
        <Clock className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No signed apps yet</p>
        <p className="text-gray-600 text-sm mt-1">Your signing history will appear here</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Signing History</h2>
        <button
          onClick={loadHistory}
          className="p-2 rounded-lg bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-gray-300 transition-colors"
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
            className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {app.info?.iconBase64 ? (
                  <img
                    src={`data:image/png;base64,${app.info.iconBase64}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">📱</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">
                    {app.info?.name || app.originalName}
                  </span>
                  {app.status === 'signed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : app.status === 'error' ? (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : null}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {app.info?.bundleId} &middot; v{app.info?.version}
                  {app.info?.size ? ` · ${formatFileSize(app.info.size)}` : ''}
                </div>
                {app.signedAt && (
                  <div className="text-xs text-gray-600 mt-1">
                    Signed {new Date(app.signedAt).toLocaleString()}
                  </div>
                )}
                {app.error && (
                  <div className="text-xs text-red-400 mt-1">{app.error}</div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {app.status === 'signed' && (
                  <>
                    <a
                      href={getDownloadUrl(app.id)}
                      className="p-2 rounded-lg bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white transition-colors"
                      title="Download IPA"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {app.otaLink && (
                      <a
                        href={app.otaLink}
                        className="p-2 rounded-lg bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white transition-colors"
                        title="Install"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </>
                )}
                <button
                  onClick={() => handleDelete(app.id)}
                  disabled={deleting === app.id}
                  className="p-2 rounded-lg bg-zinc-800 text-gray-400 hover:bg-red-950 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === app.id ? (
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
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
