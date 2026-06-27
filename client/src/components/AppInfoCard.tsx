import { motion } from 'framer-motion';
import { formatFileSize } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

interface AppInfoCardProps {
  info: { name: string; bundleId: string; version: string; buildNumber: string; iconBase64?: string; size: number };
}

export function AppInfoCard({ info }: AppInfoCardProps) {
  const { t } = useLanguage();
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass glow-border p-5">
      <h3 className="text-xs font-medium text-[var(--text-secondary)] mb-4 uppercase tracking-wider">{t('appInformation')}</h3>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[var(--border)]">
          {info.iconBase64 ? (
            <img src={`data:image/png;base64,${info.iconBase64}`} alt="App Icon" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl">📱</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--text-primary)] truncate text-sm">{info.name}</div>
          <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">{info.bundleId}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--cyan-dim)] text-[var(--cyan)] border border-[var(--border)] font-medium">v{info.version}</span>
            <span className="text-xs text-[var(--text-muted)]">{t('build')} {info.buildNumber}</span>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{formatFileSize(info.size)}</div>
        </div>
      </div>
    </motion.div>
  );
}
