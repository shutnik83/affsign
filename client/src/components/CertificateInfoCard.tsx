import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface CertificateInfoCardProps {
  cert: { commonName: string; teamName: string; teamId: string; expirationDate: string; isValid: boolean };
}

export function CertificateInfoCard({ cert }: CertificateInfoCardProps) {
  const { t } = useLanguage();
  const formattedDate = new Date(cert.expirationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 backdrop-blur-xl ${
        cert.isValid
          ? 'bg-green-500/5 border-green-500/25 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
          : 'bg-red-500/5 border-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('certificate')}</h3>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${cert.isValid ? 'text-green-400' : 'text-red-400'}`}>
          {cert.isValid ? <><CheckCircle className="w-3.5 h-3.5" />{t('valid')}</> : <><AlertCircle className="w-3.5 h-3.5" />{t('expired')}</>}
        </div>
      </div>
      <div className="space-y-3">
        <div><div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{t('commonName')}</div><div className="text-sm text-[var(--text-primary)] font-medium truncate">{cert.commonName}</div></div>
        <div><div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{t('teamName')}</div><div className="text-sm text-[var(--text-primary)] truncate">{cert.teamName}</div></div>
        <div><div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{t('teamId')}</div><div className="text-sm text-[var(--text-primary)] font-mono">{cert.teamId}</div></div>
        <div><div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{t('expires')}</div><div className={`text-sm ${cert.isValid ? 'text-[var(--text-primary)]' : 'text-red-400'}`}>{formattedDate}</div></div>
      </div>
    </motion.div>
  );
}
