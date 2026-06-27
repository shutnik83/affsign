import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface FileUploadZoneProps {
  label: string;
  accept: string;
  onDrop: (file: File) => void;
  progress?: number;
  loaded?: boolean;
}

export function FileUploadZone({ label, accept, onDrop, progress, loaded }: FileUploadZoneProps) {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragOut = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) onDrop(files[0]);
  }, [onDrop]);
  const handleClick = () => inputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onDrop(files[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative drop-zone rounded-2xl border p-5 text-center cursor-pointer transition-all duration-300 ${
        isDragging
          ? 'border-[var(--cyan)] bg-[var(--cyan-dim)] shadow-[0_0_30px_var(--cyan-glow)]'
          : loaded
          ? 'border-green-500/40 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
          : 'glass glow-border'
      }`}
      style={!isDragging && !loaded ? { borderStyle: 'dashed', borderWidth: '1px' } : { borderWidth: '1px' }}
      onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop} onClick={handleClick}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />

      {progress && progress > 0 && progress < 100 ? (
        <div className="space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-[var(--cyan)] border-t-transparent animate-spin" />
          <div className="text-sm text-[var(--text-secondary)]">{t('uploading')} {progress}%</div>
          <div className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--cyan)] to-blue-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : loaded ? (
        <div className="space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-green-500/10 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
            <Check className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-sm text-green-400 font-medium">{t('loaded')}</div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-[var(--cyan-dim)] flex items-center justify-center">
            <Upload className="w-5 h-5 text-[var(--cyan)]" />
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
          <div className="text-xs text-[var(--text-muted)]">{t('dragDrop')}</div>
        </div>
      )}
    </motion.div>
  );
}
