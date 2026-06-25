import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Shield, History, X } from 'lucide-react';
import { FileUploadZone } from './components/FileUploadZone';
import { AppInfoCard } from './components/AppInfoCard';
import { CertificateInfoCard } from './components/CertificateInfoCard';
import { SigningPanel } from './components/SigningPanel';
import { ResultPanel } from './components/ResultPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { uploadFile, signApp } from './api/client';

type Tab = 'sign' | 'history';

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
  tempPath: string;
  originalName: string;
}

interface ProvisionData {
  tempPath: string;
  originalName: string;
}

interface SignResult {
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
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sign');
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
        setError(res.error || 'Failed to parse IPA');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadProgress((prev) => ({ ...prev, ipa: 0 }));
    }
  }, []);

  const handleP12Drop = useCallback(async (file: File) => {
    setError(null);
    try {
      const res = await uploadFile(file, (p) => setUploadProgress((prev) => ({ ...prev, p12: p })));
      if (res.success && res.data) {
        setP12Data({ tempPath: res.data.tempPath!, originalName: res.data.originalName! });
      } else {
        setError(res.error || 'Failed to upload P12');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadProgress((prev) => ({ ...prev, p12: 0 }));
    }
  }, []);

  const handleProvisionDrop = useCallback(async (file: File) => {
    setError(null);
    try {
      const res = await uploadFile(file, (p) => setUploadProgress((prev) => ({ ...prev, provision: p })));
      if (res.success && res.data) {
        setProvisionData({ tempPath: res.data.tempPath!, originalName: res.data.originalName! });
      } else {
        setError(res.error || 'Failed to upload MobileProvision');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadProgress((prev) => ({ ...prev, provision: 0 }));
    }
  }, []);

  const handleSign = useCallback(async () => {
    if (!ipaData) {
      setError('Please upload an IPA file');
      return;
    }
    if (!p12Data) {
      setError('Please upload a P12 certificate');
      return;
    }
    if (!provisionData) {
      setError('Please upload a MobileProvision file');
      return;
    }
    if (!p12Password) {
      setError('Please enter the P12 password');
      return;
    }
    setIsSigning(true);
    setError(null);
    try {
      const res = await signApp(ipaData.id, p12Data.tempPath, p12Password, provisionData.tempPath);
      if (res.success && res.data) {
        setSignResult({
          downloadUrl: res.data.downloadUrl,
          installUrl: res.data.installUrl,
          otaLink: res.data.otaLink,
          qrCodeDataUrl: res.data.qrCodeDataUrl,
          info: res.data.info,
          certificate: res.data.certificate,
        });
      } else {
        setError(res.error || 'Signing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed');
    } finally {
      setIsSigning(false);
    }
  }, [ipaData, p12Data, provisionData, p12Password]);

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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">AffSign</h1>
          </div>
          <p className="text-gray-400 text-lg">IPA Signing & OTA Distribution</p>
        </motion.header>

        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('sign')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === 'sign'
                ? 'bg-white text-black'
                : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-gray-300'
            }`}
          >
            <FileUp className="w-4 h-4" />
            Sign IPA
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              activeTab === 'history'
                ? 'bg-white text-black'
                : 'bg-zinc-900 text-gray-400 hover:bg-zinc-800 hover:text-gray-300'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'sign' ? (
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
                  className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-900/50 flex items-center justify-between"
                >
                  <span className="text-red-400 text-sm">{error}</span>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FileUploadZone
                    label="IPA File"
                    accept=".ipa"
                    onDrop={handleIPADrop}
                    progress={uploadProgress.ipa}
                    loaded={!!ipaData}
                  />
                  <FileUploadZone
                    label="P12 Certificate"
                    accept=".p12"
                    onDrop={handleP12Drop}
                    progress={uploadProgress.p12}
                    loaded={!!p12Data}
                  />
                  <FileUploadZone
                    label="MobileProvision"
                    accept=".mobileprovision,.provisionprofile"
                    onDrop={handleProvisionDrop}
                    progress={uploadProgress.provision}
                    loaded={!!provisionData}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      P12 Password
                    </label>
                    <input
                      type="password"
                      value={p12Password}
                      onChange={(e) => setP12Password(e.target.value)}
                      placeholder="Enter certificate password"
                      className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {ipaData && <AppInfoCard info={ipaData.info} />}
                  {signResult?.certificate && <CertificateInfoCard cert={signResult.certificate} />}

                  <SigningPanel
                    canSign={canSign}
                    isSigning={isSigning}
                    onSign={handleSign}
                    onReset={handleReset}
                    hasResult={!!signResult}
                  />
                </div>
              </div>

              {signResult && (
                <div className="mt-8">
                  <ResultPanel result={signResult} />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <HistoryPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
