import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Shield, X, Globe, Sun, Moon, ShoppingCart } from 'lucide-react';
import { FileUploadZone } from './components/FileUploadZone';
import { AppInfoCard } from './components/AppInfoCard';
import { CertificateInfoCard } from './components/CertificateInfoCard';
import { SigningPanel } from './components/SigningPanel';
import { ResultPanel } from './components/ResultPanel';
import { AdminPanel } from './components/AdminPanel';
import { NewsPanel } from './components/NewsPanel';
import { uploadFile, signApp, saveToHistory } from './api/client';
import { useLanguage } from './i18n/LanguageContext';
import { useTheme } from './i18n/ThemeContext';

interface IPAData {
  id: string;
  info: {
    name: string;
    bundleId: string;
    version: string;
    buildNumber: string;
    iconBase64?: string;
    size: number;
  };
}

interface P12Data {
  driveFileId: string;
  originalName: string;
}

interface ProvisionData {
  driveFileId: string;
  originalName: string;
}

interface SignResult {
  id?: string;
  downloadUrl: string;
  installUrl: string;
  otaLink: string;
  qrCodeDataUrl?: string;
  info?: IPAData['info'];
  certificate?: {
    commonName: string;
    teamName: string;
    teamId: string;
    expirationDate: string;
    isValid: boolean;
  };
  signedAt?: string;
  originalName?: string;
}

export default function App() {
  const { t, locale, toggleLocale } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [ipaData, setIpaData] = useState<IPAData | null>(null);
  const [p12Data, setP12Data] = useState<P12Data | null>(null);
  const [provisionData, setProvisionData] = useState<ProvisionData | null>(null);
  const [p12Password, setP12Password] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signResult, setSignResult] = useState<SignResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const handleIPADrop = useCallback(async (file: File) => {
    setError(null);
    setIpaData(null);
    setSignResult(null);
    try {
      const res = await uploadFile(file, (p) => setUploadProgress((prev) => ({ ...prev, ipa: p })));
      if (res.success && res.data) {
        setIpaData({ id: res.data.id, info: res.data.info! });
      } else {
        setError(res.error || t('failedToParse'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploadProgress((prev) => ({ ...prev, ipa: 0 }));
    }
  }, [t]);

  const handleP12Drop = useCallback(async (file: File) => {
    setError(null);
    try {
      const res = await uploadFile(file, (p) => setUploadProgress((prev) => ({ ...prev, p12: p })));
      if (res.success && res.data) {
        setP12Data({ driveFileId: res.data.driveFileId!, originalName: res.data.originalName! });
      } else {
        setError(res.error || t('uploadFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploadProgress((prev) => ({ ...prev, p12: 0 }));
    }
  }, [t]);

  const handleProvisionDrop = useCallback(async (file: File) => {
    setError(null);
    try {
      const res = await uploadFile(file, (p) => setUploadProgress((prev) => ({ ...prev, provision: p })));
      if (res.success && res.data) {
        setProvisionData({ driveFileId: res.data.driveFileId!, originalName: res.data.originalName! });
      } else {
        setError(res.error || t('uploadFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploadProgress((prev) => ({ ...prev, provision: 0 }));
    }
  }, [t]);

  const handleSign = useCallback(async () => {
    if (!ipaData) { setError(t('pleaseUploadIPA')); return; }
    if (!p12Data) { setError(t('pleaseUploadP12')); return; }
    if (!provisionData) { setError(t('pleaseUploadProvision')); return; }
    if (!p12Password) { setError(t('pleaseEnterPassword')); return; }

    setIsSigning(true);
    setError(null);
    try {
      const res = await signApp(ipaData.id, p12Data.driveFileId, p12Password, provisionData.driveFileId);
      if (res.success && res.data) {
        const result: SignResult = {
          id: res.data.id,
          downloadUrl: res.data.downloadUrl,
          installUrl: res.data.installUrl,
          otaLink: res.data.otaLink,
          qrCodeDataUrl: res.data.qrCodeDataUrl,
          info: res.data.info,
          certificate: res.data.certificate,
          signedAt: res.data.signedAt,
          originalName: ipaData.info?.name || '',
        };
        setSignResult(result);
        saveToHistory({
          id: res.data.id,
          originalName: ipaData.info?.name || '',
          info: res.data.info,
          certificate: res.data.certificate,
          status: 'signed',
          signedAt: res.data.signedAt,
          installUrl: res.data.installUrl,
          otaLink: res.data.otaLink,
        });
      } else {
        setError(res.error || t('signingFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signingFailed'));
    } finally {
      setIsSigning(false);
    }
  }, [ipaData, p12Data, provisionData, p12Password, t]);

  const handleReset = useCallback(() => {
    setIpaData(null);
    setP12Data(null);
    setProvisionData(null);
    setP12Password('');
    setSignResult(null);
    setError(null);
  }, []);

  const canSign = !!(ipaData && p12Data && provisionData && p12Password) && !isSigning;

  return (
    <div className="min-h-screen text-[var(--text-primary)] transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 relative"
        >
          <div className="absolute top-0 left-0 flex items-center gap-2">
            <NewsPanel />
            <button
              onClick={() => window.open('https://t.me/Isleepwithmylittlesister', '_blank')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              title={t('buyCertificate')}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">{t('buyCertificate')}</span>
            </button>
          </div>
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              title={locale === 'en' ? 'Русский' : 'English'}
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">{locale.toUpperCase()}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">AffSign</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-lg">{t('subtitle')}</p>
        </motion.header>

        <div className="flex justify-center gap-2 mb-8">
          <button
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 btn-glass shadow-lg shadow-blue-500/20"
          >
            <FileUp className="w-4 h-4" />
            {t('signIPA')}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key="sign"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl glass border border-red-500/30 flex items-center justify-between"
                >
                  <span className="text-red-400 text-sm">{error}</span>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FileUploadZone label={t('ipaFile')} accept=".ipa" onDrop={handleIPADrop} progress={uploadProgress.ipa} loaded={!!ipaData} />
                  <FileUploadZone label={t('p12Certificate')} accept=".p12" onDrop={handleP12Drop} progress={uploadProgress.p12} loaded={!!p12Data} />
                  <FileUploadZone label={t('mobileProvision')} accept=".mobileprovision,.provisionprofile" onDrop={handleProvisionDrop} progress={uploadProgress.provision} loaded={!!provisionData} />
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      {t('p12Password')}
                    </label>
                    <input
                      type="password"
                      value={p12Password}
                      onChange={(e) => setP12Password(e.target.value)}
                      placeholder={t('enterPassword')}
                      className="w-full px-4 py-3 rounded-xl glass glow-border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {ipaData && <AppInfoCard info={ipaData.info} />}
                  {signResult?.certificate && <CertificateInfoCard cert={signResult.certificate} />}
                  <SigningPanel canSign={canSign} isSigning={isSigning} onSign={handleSign} onReset={handleReset} hasResult={!!signResult} />
                </div>
              </div>

              {signResult && (
                <div className="mt-8">
                  <ResultPanel result={signResult} />
                </div>
              )}
            </motion.div>
        </AnimatePresence>
      </div>
      <AdminPanel />
    </div>
  );
}
