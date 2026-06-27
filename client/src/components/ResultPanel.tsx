import { motion } from 'framer-motion';
import { Download, ExternalLink, CheckCircle } from 'lucide-react';
import { getDownloadUrl } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';

interface ResultPanelProps {
  result: { downloadUrl: string; installUrl: string; otaLink: string; qrCodeDataUrl?: string; info?: { name: string; version: string } };
}

export function ResultPanel({ result }: ResultPanelProps) {
  const { t } = useLanguage();
  const appId = result.downloadUrl.split('/').pop();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl glass-solid glow-border p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
          <CheckCircle className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{t('signedSuccessfully')}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{result.info?.name} v{result.info?.version}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href={getDownloadUrl(appId!)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl btn-glass font-medium text-sm">
          <Download className="w-4 h-4" />{t('downloadIPA')}
        </a>
        <a href={result.otaLink} className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl btn-primary font-medium text-sm">
          <ExternalLink className="w-4 h-4" />{t('install')}
        </a>
        <a href={result.installUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl glass glow-border text-[var(--text-primary)] font-medium text-sm">
          {t('installPage')}
        </a>
      </div>
      {result.qrCodeDataUrl && (
        <div className="mt-6 flex flex-col items-center">
          <div className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wider">{t('scanToInstall')}</div>
          <div className="p-3 bg-white rounded-2xl shadow-[0_0_30px_rgba(0,180,255,0.15)]">
            <img src={result.qrCodeDataUrl} alt="QR Code" className="w-32 h-32" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
