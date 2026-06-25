import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { getApp, updateApp } from '../services/storage';
import { parseP12Certificate, validateMobileProvision } from '../services/certificateParser';
import { signIPA } from '../services/signer';
import { generateManifest, generateInstallPage, generateQRCode } from '../services/otaGenerator';
import { logger } from '../logger';

const router = Router();

router.post('/sign', async (req: Request, res: Response) => {
  try {
    const { appId, p12Path, p12Password, mobileProvisionPath } = req.body;

    if (!appId) {
      res.status(400).json({ success: false, error: 'appId is required' });
      return;
    }

    const app = getApp(appId);
    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    if (!p12Path || !fs.existsSync(p12Path)) {
      res.status(400).json({ success: false, error: 'P12 file not found. Please re-upload.' });
      return;
    }

    if (!mobileProvisionPath || !fs.existsSync(mobileProvisionPath)) {
      res.status(400).json({ success: false, error: 'MobileProvision file not found. Please re-upload.' });
      return;
    }

    if (!p12Password) {
      res.status(400).json({ success: false, error: 'P12 password is required' });
      return;
    }

    const p12Buffer = fs.readFileSync(p12Path);
    let certInfo;
    try {
      certInfo = parseP12Certificate(p12Buffer, p12Password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Invalid P12 password')) {
        res.status(400).json({ success: false, error: 'Invalid P12 password. Check the password and try again.' });
      } else {
        res.status(400).json({ success: false, error: `P12 certificate error: ${msg}` });
      }
      return;
    }

    const provisionBuffer = fs.readFileSync(mobileProvisionPath);
    const provisionResult = validateMobileProvision(provisionBuffer, certInfo);

    if (!provisionResult.valid) {
      res.status(400).json({
        success: false,
        error: `MobileProvision validation failed: ${provisionResult.details}`,
      });
      return;
    }

    updateApp(appId, { status: 'signing' });

    const signedFilename = `signed_${app.originalName}`;
    const signedPath = path.join(config.paths.signed, signedFilename);

    if (!fs.existsSync(config.paths.signed)) {
      fs.mkdirSync(config.paths.signed, { recursive: true });
    }

    const signedIpaPath = await signIPA({
      ipaPath: app.ipaPath,
      p12Buffer,
      p12Password,
      mobileProvisionBuffer: provisionBuffer,
      outputPath: signedPath,
      appInfo: app.info!,
      certInfo,
    });

    updateApp(appId, {
      status: 'signed',
      signedPath: signedIpaPath,
      certificate: certInfo,
      signedAt: new Date().toISOString(),
    });

    const updatedApp = getApp(appId)!;

    const manifestId = updatedApp.id;
    const ipaUrl = `${config.protocol}://${config.domain}/api/download/${manifestId}`;
    const manifestUrl = `${config.protocol}://${config.domain}/manifests/${manifestId}.plist`;
    const otaLink = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
    const installPageUrl = `${config.protocol}://${config.domain}/api/install/${manifestId}`;

    const manifestPath = generateManifest(
      updatedApp.info!,
      certInfo,
      ipaUrl,
      manifestId
    );

    generateInstallPage(updatedApp.info!, manifestUrl, otaLink, manifestId);

    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await generateQRCode(otaLink);
    } catch {
      // QR generation is optional
    }

    updateApp(appId, {
      manifestPath,
      installUrl: installPageUrl,
      otaLink,
    });

    res.json({
      success: true,
      data: {
        id: appId,
        status: 'signed',
        info: updatedApp.info,
        certificate: certInfo,
        downloadUrl: `/api/download/${appId}`,
        installUrl: `/api/install/${appId}`,
        otaLink,
        manifestUrl,
        qrCodeDataUrl,
        signedAt: updatedApp.signedAt,
      },
    });
  } catch (err) {
    logger.error('Signing error:', err);
    if (req.body.appId) {
      updateApp(req.body.appId, { status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
    res.status(500).json({
      success: false,
      error: `Signing failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

export { router as signRouter };
