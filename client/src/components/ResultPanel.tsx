import { motion } from 'framer-motion';
import { Download, ExternalLink, CheckCircle } from 'lucide-react';
import { getDownloadUrl } from '../api/client';

interface ResultPanelProps {
  result: {
    downloadUrl: string;
    installUrl: string;
    otaLink: string;
    qrCodeDataUrl?: string;
    info?: {
      name: string;
      version: string;
    };
  };
}

export function ResultPanel({ result }: ResultPanelProps) {
  const appId = result.downloadUrl.split('/').pop();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Signed Successfully</h3>
          <p className="text-sm text-gray-400">{result.info?.name} v{result.info?.version}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href={getDownloadUrl(appId!)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black font-medium text-sm hover:bg-gray-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download IPA
        </a>

        <a
          href={result.otaLink}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Install
        </a>

        <a
          href={result.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 text-gray-300 font-medium text-sm hover:bg-zinc-700 transition-colors"
        >
          Install Page
        </a>
      </div>

      {result.qrCodeDataUrl && (
        <div className="mt-6 flex flex-col items-center">
          <div className="text-xs text-gray-500 mb-3">Scan to install on another device</div>
          <div className="p-3 bg-white rounded-xl">
            <img src={result.qrCodeDataUrl} alt="QR Code" className="w-32 h-32" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
