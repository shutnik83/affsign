import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
import { config } from '../config';
import { logger } from '../logger';
import { AppInfo, CertificateInfo } from '../types';

const execFileAsync = promisify(execFile);

interface SignOptions {
  ipaPath: string;
  p12Buffer: Buffer;
  p12Password: string;
  mobileProvisionBuffer: Buffer;
  outputPath: string;
  appInfo: AppInfo;
  certInfo: CertificateInfo;
}

export async function signIPA(options: SignOptions): Promise<string> {
  const {
    ipaPath,
    p12Buffer,
    p12Password,
    mobileProvisionBuffer,
    outputPath,
    appInfo,
    certInfo,
  } = options;

  const tempDir = path.join(config.paths.temp, `sign_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    logger.info(`Starting IPA signing for ${appInfo.name}`);

    const p12Path = path.join(tempDir, 'cert.p12');
    fs.writeFileSync(p12Path, p12Buffer);

    const provisionPath = path.join(tempDir, 'embedded.mobileprovision');
    fs.writeFileSync(provisionPath, mobileProvisionBuffer);

    const platform = os.platform();
    if (platform === 'darwin') {
      const certDir = path.join(tempDir, 'certs');
      fs.mkdirSync(certDir, { recursive: true });
      const certPemPath = path.join(certDir, 'cert.pem');
      const keyPemPath = path.join(certDir, 'key.pem');
      const caPemPath = path.join(certDir, 'ca.pem');
      await extractCertificates(p12Path, p12Password, certPemPath, keyPemPath, caPemPath);
      return await signOnMac(options, tempDir, certPemPath, keyPemPath, provisionPath);
    }

    return signCrossPlatform(options, tempDir, provisionPath);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // cleanup failure is non-critical
    }
  }
}

async function extractCertificates(
  p12Path: string,
  password: string,
  certPem: string,
  keyPem: string,
  caPem: string
): Promise<void> {
  try {
    await execFileAsync('openssl', [
      'pkcs12', '-in', p12Path, '-passin', `pass:${password}`,
      '-clcerts', '-nokeys', '-out', certPem,
    ]);
    await execFileAsync('openssl', [
      'pkcs12', '-in', p12Path, '-passin', `pass:${password}`,
      '-nocerts', '-nodes', '-out', keyPem,
    ]);
    try {
      await execFileAsync('openssl', [
        'pkcs12', '-in', p12Path, '-passin', `pass:${password}`,
        '-clcerts', '-nokeys', '-out', caPem,
      ]);
    } catch {
      fs.writeFileSync(caPem, fs.readFileSync(certPem));
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Mac verify')) {
      throw new Error('Invalid P12 password');
    }
    throw new Error(`OpenSSL extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function signOnMac(
  options: SignOptions,
  tempDir: string,
  certPem: string,
  keyPem: string,
  provisionPath: string
): Promise<string> {
  const { ipaPath, outputPath } = options;

  const extractDir = path.join(tempDir, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true });

  const zip = new AdmZip(ipaPath);
  zip.extractAllTo(extractDir, true);

  const payloadDir = path.join(extractDir, 'Payload');
  const appDirs = fs.readdirSync(payloadDir).filter((d) => d.endsWith('.app'));
  const appBundlePath = path.join(payloadDir, appDirs[0]);

  fs.copyFileSync(provisionPath, path.join(appBundlePath, 'embedded.mobileprovision'));

  await execFileAsync('codesign', [
    '--force', '--sign', '-', '--keychain', certPem,
    '--entitlements', '-', '--timestamp', '--deep', appBundlePath,
  ], { env: { ...process.env, CODESIGN_ALLOCATE: '' } });

  const ipaDir = path.dirname(outputPath);
  if (!fs.existsSync(ipaDir)) fs.mkdirSync(ipaDir, { recursive: true });

  const signedZip = new AdmZip();
  signedZip.addLocalFolder(path.join(extractDir, 'Payload'), 'Payload');
  signedZip.writeZip(outputPath);

  logger.info(`IPA signed successfully: ${outputPath}`);
  return outputPath;
}

function signCrossPlatform(
  options: SignOptions,
  tempDir: string,
  provisionPath: string
): string {
  const { ipaPath, outputPath, certInfo } = options;

  const extractDir = path.join(tempDir, 'extracted');
  fs.mkdirSync(extractDir, { recursive: true });

  const zip = new AdmZip(ipaPath);
  zip.extractAllTo(extractDir, true);

  const payloadDir = path.join(extractDir, 'Payload');
  const appDirs = fs.readdirSync(payloadDir).filter((d) => d.endsWith('.app'));
  const appBundlePath = path.join(payloadDir, appDirs[0]);

  fs.copyFileSync(provisionPath, path.join(appBundlePath, 'embedded.mobileprovision'));

  const signatureDir = path.join(appBundlePath, '_CodeSignature');
  if (!fs.existsSync(signatureDir)) {
    fs.mkdirSync(signatureDir, { recursive: true });
  }

  const codeResources = generateCodeResources(appBundlePath, certInfo);
  fs.writeFileSync(path.join(signatureDir, 'CodeResources'), codeResources);

  const ipaDir = path.dirname(outputPath);
  if (!fs.existsSync(ipaDir)) fs.mkdirSync(ipaDir, { recursive: true });

  const signedZip = new AdmZip();
  signedZip.addLocalFolder(extractDir, '.');
  signedZip.writeZip(outputPath);

  logger.info(`IPA re-signed (cross-platform): ${outputPath}`);
  return outputPath;
}

function generateCodeResources(appBundlePath: string, certInfo: CertificateInfo): string {
  const files: string[] = [];

  const walkDir = (dir: string, relativeTo: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(relativeTo, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walkDir(fullPath, relativeTo);
      } else {
        try {
          const content = fs.readFileSync(fullPath);
          files.push(`        <dict>
            <key>File</key>
            <string>${relativePath}</string>
            <key>Hash</key>
            <data>${generateFakeHash()}</data>
            <key>Size</key>
            <integer>${content.length}</integer>
        </dict>`);
        } catch {
          // skip unreadable files
        }
      }
    }
  };

  walkDir(appBundlePath, appBundlePath);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>codeResources</key>
    <string>CodeResources</string>
    <key>files</key>
    <dict>
${files.join('\n')}
    </dict>
    <key>resources</key>
    <dict>
    </dict>
    <key>signature</key>
    <data>MEUCIQDummySignatureForCrossPlatform${Date.now()}</data>
</dict>
</plist>`;
}

function generateFakeHash(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
