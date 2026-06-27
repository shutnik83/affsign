import { motion } from 'framer-motion';
import { PenLine, RotateCcw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface SigningPanelProps {
  canSign: boolean;
  isSigning: boolean;
  onSign: () => void;
  onReset: () => void;
  hasResult: boolean;
}

export function SigningPanel({ canSign, isSigning, onSign, onReset, hasResult }: SigningPanelProps) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      <motion.button
        whileHover={canSign ? { scale: 1.01 } : {}}
        whileTap={canSign ? { scale: 0.98 } : {}}
        onClick={onSign}
        disabled={!canSign}
        className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
          canSign
            ? 'btn-primary text-white'
            : 'glass text-[var(--text-muted)] cursor-not-allowed opacity-40'
        }`}
      >
        {isSigning ? (
          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{t('signing')}</>
        ) : (
          <><PenLine className="w-4 h-4" />{t('signIPA')}</>
        )}
      </motion.button>
      {hasResult && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="w-full py-3 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4" />{t('signAnother')}
        </motion.button>
      )}
    </div>
  );
}
