import { motion } from 'framer-motion';
import { PenLine, RotateCcw } from 'lucide-react';

interface SigningPanelProps {
  canSign: boolean;
  isSigning: boolean;
  onSign: () => void;
  onReset: () => void;
  hasResult: boolean;
}

export function SigningPanel({ canSign, isSigning, onSign, onReset, hasResult }: SigningPanelProps) {
  return (
    <div className="space-y-3">
      <motion.button
        whileHover={canSign ? { scale: 1.01 } : {}}
        whileTap={canSign ? { scale: 0.99 } : {}}
        onClick={onSign}
        disabled={!canSign}
        className={`w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
          canSign
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/20'
            : 'bg-zinc-900 text-gray-600 cursor-not-allowed'
        }`}
      >
        {isSigning ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Signing...
          </>
        ) : (
          <>
            <PenLine className="w-4 h-4" />
            Sign IPA
          </>
        )}
      </motion.button>

      {hasResult && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onReset}
          className="w-full py-3 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-gray-300 transition-all duration-200"
        >
          <RotateCcw className="w-4 h-4" />
          Sign Another
        </motion.button>
      )}
    </div>
  );
}
