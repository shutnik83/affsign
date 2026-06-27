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
    <div className="min-h-screen text-[var(--text-primary)] relative">

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 relative"
        >
          <div className="absolute top-0 left-0 flex items-center gap-2">
            <NewsPanel />
            <button
              onClick={() => window.open('https://t.me/Isleepwithmylittlesister', '_blank')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-xs"
              title={t('buyCertificate')}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('buyCertificate')}</span>
            </button>
          </div>
          <div className="absolute top-0 right-0 flex items-center gap-2">
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all text-xs"
              title={locale === 'en' ? 'Русский' : 'English'}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{locale.toUpperCase()}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full glass glow-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--cyan)] to-blue-600 flex items-center justify-center shadow-[0_0_25px_var(--cyan-glow)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_20px_var(--cyan-glow)]">
              AffSign
            </h1>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">{t('subtitle')}</p>
        </motion.header>

        <div className="flex justify-center mb-8">
          <button className="flex items-center gap-2 px-8 py-3 rounded-full text-sm font-semibold btn-primary">
            <FileUp className="w-4 h-4" />
            {t('signIPA')}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key="sign"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl glass border border-red-500/30 flex items-center justify-between"
                style={{ boxShadow: '0 0 20px rgba(239,68,68,0.15)' }}
              >
                <span className="text-red-400 text-sm">{error}</span>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            <div className="glass-solid glow-border rounded-3xl p-6 sm:p-8 mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <FileUploadZone label={t('ipaFile')} accept=".ipa" onDrop={handleIPADrop} progress={uploadProgress.ipa} loaded={!!ipaData} />
                  <FileUploadZone label={t('p12Certificate')} accept=".p12" onDrop={handleP12Drop} progress={uploadProgress.p12} loaded={!!p12Data} />
                  <FileUploadZone label={t('mobileProvision')} accept=".mobileprovision,.provisionprofile" onDrop={handleProvisionDrop} progress={uploadProgress.provision} loaded={!!provisionData} />
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                      {t('p12Password')}
                    </label>
                    <input
                      type="password"
                      value={p12Password}
                      onChange={(e) => setP12Password(e.target.value)}
                      placeholder={t('enterPassword')}
                      className="w-full px-4 py-3 rounded-2xl glass glow-border text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--cyan)] focus:shadow-[0_0_20px_var(--cyan-dim)] transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  {ipaData && <AppInfoCard info={ipaData.info} />}
                  {signResult?.certificate && <CertificateInfoCard cert={signResult.certificate} />}
                  <SigningPanel canSign={canSign} isSigning={isSigning} onSign={handleSign} onReset={handleReset} hasResult={!!signResult} />
                </div>
              </div>
            </div>

            {signResult && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ResultPanel result={signResult} />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <AdminPanel />
    </div>
  );
}
