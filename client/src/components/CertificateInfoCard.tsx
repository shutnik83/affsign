import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';

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
  const expiryDate = new Date(cert.expirationDate);
  const formattedDate = expiryDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${
        cert.isValid
          ? 'bg-green-950/20 border-green-900/30'
          : 'bg-red-950/20 border-red-900/30'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">Certificate</h3>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${
          cert.isValid ? 'text-green-400' : 'text-red-400'
        }`}>
          {cert.isValid ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              Valid
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              Expired
            </>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-500">Common Name</div>
          <div className="text-sm text-white font-medium truncate">{cert.commonName}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Team Name</div>
          <div className="text-sm text-white truncate">{cert.teamName}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Team ID</div>
          <div className="text-sm text-white font-mono">{cert.teamId}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Expires</div>
          <div className={`text-sm ${cert.isValid ? 'text-white' : 'text-red-400'}`}>
            {formattedDate}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
