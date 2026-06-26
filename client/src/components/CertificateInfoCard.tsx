import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface CertificateInfoCardProps {
  cert: {
    commonName: string;
    teamName: string;
    teamId: string;
    expirationDate: string;
    isValid: boolean;
  };
}

export function CertificateInfoCard({ cert }: CertificateInfoCardProps) {
  const { t } = useLanguage();
  const expiryDate = new Date(cert.expirationDate);
  const formattedDate = expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${
        cert.isValid ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">{t('certificate')}</h3>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${cert.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {cert.isValid ? (
            <><CheckCircle className="w-3.5 h-3.5" />{t('valid')}</>
          ) : (
            <><AlertCircle className="w-3.5 h-3.5" />{t('expired')}</>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs text-[var(--text-muted)]">{t('commonName')}</div>
          <div className="text-sm text-[var(--text-primary)] font-medium truncate">{cert.commonName}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">{t('teamName')}</div>
          <div className="text-sm text-[var(--text-primary)] truncate">{cert.teamName}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">{t('teamId')}</div>
          <div className="text-sm text-[var(--text-primary)] font-mono">{cert.teamId}</div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-muted)]">{t('expires')}</div>
          <div className={`text-sm ${cert.isValid ? 'text-[var(--text-primary)]' : 'text-red-600 dark:text-red-400'}`}>{formattedDate}</div>
        </div>
      </div>
    </motion.div>
  );
}
