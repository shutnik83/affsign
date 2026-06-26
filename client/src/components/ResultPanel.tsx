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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass glow-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{t('signedSuccessfully')}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{result.info?.name} v{result.info?.version}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href={getDownloadUrl(appId!)} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl btn-glass font-medium text-sm">
          <Download className="w-4 h-4" />{t('downloadIPA')}
        </a>
        <a href={result.otaLink} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium text-sm hover:from-blue-500 hover:to-cyan-400 transition-all shadow-lg shadow-blue-500/20">
          <ExternalLink className="w-4 h-4" />{t('install')}
        </a>
        <a href={result.installUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass glow-border text-[var(--text-primary)] font-medium text-sm">
          {t('installPage')}
        </a>
      </div>
      {result.qrCodeDataUrl && (
        <div className="mt-6 flex flex-col items-center">
          <div className="text-xs text-[var(--text-muted)] mb-3">{t('scanToInstall')}</div>
          <div className="p-3 bg-white rounded-xl shadow-lg shadow-blue-500/10">
            <img src={result.qrCodeDataUrl} alt="QR Code" className="w-32 h-32" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
