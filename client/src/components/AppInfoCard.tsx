import { motion } from 'framer-motion';
import { formatFileSize } from '../api/client';

interface AppInfoCardProps {
  info: {
    name: string;
    bundleId: string;
    version: string;
    buildNumber: string;
    iconBase64?: string;
    size: number;
  };
}

export function AppInfoCard({ info }: AppInfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5"
    >
      <h3 className="text-sm font-medium text-gray-400 mb-4">App Information</h3>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          {info.iconBase64 ? (
            <img
              src={`data:image/png;base64,${info.iconBase64}`}
              alt="App Icon"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">📱</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{info.name}</div>
          <div className="text-xs text-gray-500 truncate">{info.bundleId}</div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-gray-300">
              v{info.version}
            </span>
            <span className="text-xs text-gray-500">
              Build {info.buildNumber}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatFileSize(info.size)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
