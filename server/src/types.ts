import { Request } from 'express';

export interface AppData {
  id: string;
  originalName: string;
  driveFileId: string;
  signedDriveFileId?: string;
  manifestDriveFileId?: string;
  installUrl?: string;
  otaLink?: string;
  info?: AppInfo;
  certificate?: CertificateInfo;
  signedAt?: string;
  status: 'uploaded' | 'signing' | 'signed' | 'error';
  error?: string;
}

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

export interface SignRequest {
  appId: string;
  p12Password: string;
}

export interface UploadRequest extends Request {
  file?: Express.Multer.File;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
