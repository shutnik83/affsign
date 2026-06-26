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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) onDrop(files[0]);
    },
    [onDrop]
  );

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) onDrop(files[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative drop-zone rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
        isDragging
          ? 'border-blue-500 bg-blue-500/5'
          : loaded
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-card-solid)]'
      }`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />

      {progress && progress > 0 && progress < 100 ? (
        <div className="space-y-3">
          <div className="w-10 h-10 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-sm text-[var(--text-secondary)]">{t('uploading')} {progress}%</div>
          <div className="w-full h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : loaded ? (
        <div className="space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-green-500/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-sm text-green-500 font-medium">{t('loaded')}</div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--bg-hover)] flex items-center justify-center">
            <Upload className="w-5 h-5 text-[var(--text-secondary)]" />
          </div>
          <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
          <div className="text-xs text-[var(--text-muted)]">{t('dragDrop')}</div>
        </div>
      )}
    </motion.div>
  );
}
