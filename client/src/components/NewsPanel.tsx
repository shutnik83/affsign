import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, X, Tag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface NewsItem {
  id: number;
  date: string;
  titleEn: string;
  titleRu: string;
  descEn: string;
  descRu: string;
  version: string;
}

const NEWS: NewsItem[] = [
  {
    id: 1,
    date: '2026-06-26',
    titleEn: 'History tab removed',
    titleRu: 'Вкладка «История» убрана',
    descEn: 'Private history is now stored only in your browser via localStorage.',
    descRu: 'Приватная история теперь хранится только в браузере через localStorage.',
    version: 'v2.0',
  },
];

const NEWS_VERSION_KEY = 'affsign_news_version';
const CURRENT_VERSION = NEWS[0]?.id || 1;

export function NewsPanel() {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => {
    try { return parseInt(localStorage.getItem(NEWS_VERSION_KEY) || '0', 10); } catch { return 0; }
  });

  const hasNew = lastSeen < CURRENT_VERSION;

  const handleOpen = () => {
    setIsOpen(true);
    localStorage.setItem(NEWS_VERSION_KEY, String(CURRENT_VERSION));
    setLastSeen(CURRENT_VERSION);
  };

  const handleClose = () => setIsOpen(false);

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
        title={locale === 'ru' ? 'Новости' : 'News'}
      >
        <Newspaper className="w-4 h-4" />
        {hasNew && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[var(--bg-primary)]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-solid glow-border rounded-3xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{locale === 'ru' ? 'Новости' : 'News'}</h2>
                <button onClick={handleClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {NEWS.map((item) => (
                  <div key={item.id} className="rounded-xl glass glow-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-blue-400 font-medium">{item.version}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{item.date}</span>
                    </div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      {locale === 'ru' ? item.titleRu : item.titleEn}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {locale === 'ru' ? item.descRu : item.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
