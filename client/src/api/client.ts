const API_BASE = '/api';

export interface AppInfo {
  name: string;
  bundleId: string;
  version: string;
  buildNumber: string;
  iconBase64?: string;
  minOSVersion?: string;
  size: number;
}

export interface CertificateInfo {
  commonName: string;
  teamName: string;
  teamId: string;
  expirationDate: string;
  isValid: boolean;
  notBefore?: string;
  serialNumber?: string;
  issuer?: string;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    id: string;
    type: string;
    info?: AppInfo;
    certificate?: CertificateInfo;
    r2Key?: string;
    originalName?: string;
  };
  error?: string;
}

export interface SignResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    info?: AppInfo;
    certificate?: CertificateInfo;
    downloadUrl: string;
    installUrl: string;
    otaLink: string;
    manifestUrl: string;
    qrCodeDataUrl?: string;
    signedAt?: string;
  };
  error?: string;
}

export interface HistoryItem {
  id: string;
  originalName: string;
  info?: AppInfo;
  certificate?: CertificateInfo;
  status: string;
  signedAt?: string;
  installUrl?: string;
  otaLink?: string;
  error?: string;
}

export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void,
  extraFields?: Record<string, string>
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  if (extraFields) {
    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText);
        resolve(response);
      } catch {
        reject(new Error('Invalid response'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.open('POST', `${API_BASE}/upload`);
    xhr.send(formData);
  });
}

export async function signApp(
  appId: string,
  p12Key: string,
  p12Password: string,
  mobileProvisionKey: string
): Promise<SignResponse> {
  const response = await fetch(`${API_BASE}/sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, p12Key, p12Password, mobileProvisionKey }),
  });
  return response.json();
}

export async function getHistory(): Promise<{ success: boolean; data?: HistoryItem[] }> {
  const response = await fetch(`${API_BASE}/history`);
  return response.json();
}

export async function deleteApp(
  appId: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/app/${appId}`, { method: 'DELETE' });
  return response.json();
}

export async function getApp(
  appId: string
): Promise<{ success: boolean; data?: HistoryItem }> {
  const response = await fetch(`${API_BASE}/app/${appId}`);
  return response.json();
}

export function getDownloadUrl(appId: string): string {
  return `${API_BASE}/download/${appId}`;
}

export function getInstallUrl(appId: string): string {
  return `${API_BASE}/install/${appId}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
