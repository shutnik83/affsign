import forge from 'node-forge';
import { CertificateInfo } from '../types';
import { logger } from '../logger';

interface ForgeAttribute {
  shortName?: string;
  name?: string;
  value: unknown;
}

export function parseP12Certificate(
  p12Buffer: Buffer,
  password: string
): CertificateInfo {
  try {
    const p12Asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(p12Buffer));
    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    } catch {
      throw new Error('Invalid P12 password');
    }

    const CERT_BAG_OID = '1.2.840.113549.1.12.10.1.3';
    const certBags = p12.getBags({ bagType: CERT_BAG_OID });
    const certBag = (certBags as Record<string, Array<{ cert?: forge.pki.Certificate }>>)[CERT_BAG_OID];
    if (!certBag || certBag.length === 0) {
      throw new Error('No certificate found in P12 file');
    }

    const cert = certBag[0].cert;
    if (!cert) {
      throw new Error('Invalid certificate in P12 file');
    }

    const subjectAttrs = getAttributes(cert.subject);
    const commonName = findAttr(subjectAttrs, 'CN') || 'Unknown';
    const organization = findAttr(subjectAttrs, 'O') || 'Unknown';
    const organizationalUnit = findAttr(subjectAttrs, 'OU') || '';

    let teamId = organizationalUnit;
    if (!teamId) {
      const extensions = (cert as unknown as { extensions?: Array<{ name?: string; altNames?: Array<{ value?: string }> }> }).extensions || [];
      for (const ext of extensions) {
        if (ext.name === 'subjectAltName') {
          const values = ext.altNames || [];
          for (const san of values) {
            if (san.value && san.value.match(/^[A-Z0-9]{10}$/)) {
              teamId = san.value;
              break;
            }
          }
        }
      }
    }

    const validity = cert.validity;
    const notBefore = validity?.notBefore
      ? new Date(validity.notBefore).toISOString()
      : undefined;
    const notAfter = validity?.notAfter
      ? new Date(validity.notAfter).toISOString()
      : '';
    const now = new Date();
    const expiryDate = new Date(notAfter);
    const isValid = expiryDate > now;

    const serialNumber = (cert as unknown as { serialNumber?: string }).serialNumber || '';

    let issuer = 'Unknown';
    const issuerAttrs = getAttributes(cert.issuer);
    if (issuerAttrs.length > 0) {
      issuer = issuerAttrs.map((a) => String(a.value || '')).join(', ');
    }

    return {
      commonName,
      teamName: organization,
      teamId,
      expirationDate: notAfter,
      isValid,
      notBefore,
      serialNumber,
      issuer,
    };
  } catch (err) {
    logger.error('Failed to parse P12 certificate:', err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Failed to parse P12 certificate: ${String(err)}`);
  }
}

function getAttributes(nameObj: unknown): ForgeAttribute[] {
  if (Array.isArray(nameObj)) return nameObj as ForgeAttribute[];
  if (nameObj && typeof nameObj === 'object') {
    const obj = nameObj as Record<string, unknown>;
    if (Array.isArray(obj.attributes)) return obj.attributes as ForgeAttribute[];
    if (Array.isArray(obj.fields)) return obj.fields as ForgeAttribute[];
  }
  return [];
}

function findAttr(attrs: ForgeAttribute[], name: string): string {
  for (const a of attrs) {
    if (a.shortName === name || a.name === name) {
      return String(a.value || '');
    }
  }
  return '';
}

export function validateMobileProvision(
  provisionBuffer: Buffer,
  certInfo: CertificateInfo
): { valid: boolean; details: string; teamId?: string; expirationDate?: string } {
  const provisionStr = provisionBuffer.toString('utf-8');

  const plistStart = provisionStr.indexOf('<plist');
  if (plistStart === -1) {
    return { valid: false, details: 'Invalid MobileProvision: no plist found' };
  }

  const plistEnd = provisionStr.indexOf('</plist>', plistStart);
  if (plistEnd === -1) {
    return { valid: false, details: 'Invalid MobileProvision: malformed plist' };
  }

  const plistContent = provisionStr.substring(plistStart, plistEnd + 8);

  const teamIdMatch = plistContent.match(
    /<key>TeamIdentifier<\/key>\s*<string>([^<]+)<\/string>/
  );
  const teamId = teamIdMatch ? teamIdMatch[1] : undefined;

  const expirationMatch = plistContent.match(
    /<key>ExpirationDate<\/key>\s*<date>([^<]+)<\/date>/
  );
  const expirationDate = expirationMatch ? expirationMatch[1] : undefined;

  if (teamId && certInfo.teamId && teamId !== certInfo.teamId) {
    return {
      valid: false,
      details: `Team ID mismatch: provision has "${teamId}", cert has "${certInfo.teamId}"`,
      teamId,
      expirationDate,
    };
  }

  if (expirationDate) {
    const expDate = new Date(expirationDate);
    if (expDate < new Date()) {
      return {
        valid: false,
        details: `MobileProvision expired on ${expirationDate}`,
        teamId,
        expirationDate,
      };
    }
  }

  const appIdsMatch = plistContent.match(
    /<key>Entitlements<\/key>\s*<dict>([\s\S]*?)<\/dict>/
  );
  if (appIdsMatch) {
    const bundleIdMatch = appIdsMatch[1].match(
      /<key>application-identifier<\/key>\s*<string>([^<]+)<\/string>/
    );
    if (bundleIdMatch) {
      return { valid: true, details: 'MobileProvision is valid', teamId, expirationDate };
    }
  }

  return { valid: true, details: 'MobileProvision appears valid', teamId, expirationDate };
}
