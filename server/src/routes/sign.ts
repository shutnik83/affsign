import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { getApp, updateApp } from '../services/storage';
import { parseP12Certificate, validateMobileProvision } from '../services/certificateParser';
import { signIPA } from '../services/signer';
import { generateQRCode } from '../services/otaGenerator';
import { downloadFromR2, uploadFileToR2, generateR2Key, isR2Configured } from '../services/r2';
import { logger } from '../logger';

const router = Router();

router.post('/sign', async (req: Request, res: Response) => {
  const tempFiles: string[] = [];

  try {
    const { appId, p12Key, p12Password, mobileProvisionKey } = req.body;

    if (!appId) {
      res.status(400).json({ success: false, error: 'appId is required' });
      return;
    }

    const app = getApp(appId);
    if (!app) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    if (!p12Key) {
      res.status(400).json({ success: false, error: 'P12 certificate key is required' });
      return;
    }

    if (!mobileProvisionKey) {
      res.status(400).json({ success: false, error: 'MobileProvision key is required' });
      return;
    }

    if (!p12Password) {
      res.status(400).json({ success: false, error: 'P12 password is required' });
      return;
    }

    const tempDir = path.join(config.paths.temp, `sign_${appId}_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const p12Path = path.join(tempDir, 'cert.p12');
    const provisionPath = path.join(tempDir, 'embedded.mobileprovision');
    const ipaPath = path.join(tempDir, 'app.ipa');
    const signedPath = path.join(tempDir, 'signed.ipa');

    tempFiles.push(p12Path, provisionPath, ipaPath, signedPath, tempDir);

    if (isR2Configured()) {
      await downloadFromR2(p12Key, p12Path);
      await downloadFromR2(mobileProvisionKey, provisionPath);
      await downloadFromR2(app.r2Key, ipaPath);
    } else {
      res.status(500).json({ success: false, error: 'R2 storage not configured' });
      return;
    }

    if (!fs.existsSync(p12Path)) {
      res.status(400).json({ success: false, error: 'P12 file not found. Please re-upload.' });
      return;
    }

    if (!fs.existsSync(provisionPath)) {
      res.status(400).json({ success: false, error: 'MobileProvision file not found. Please re-upload.' });
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

    const provisionBuffer = fs.readFileSync(provisionPath);
    const provisionResult = validateMobileProvision(provisionBuffer, certInfo);

    if (!provisionResult.valid) {
      res.status(400).json({
        success: false,
        error: `MobileProvision validation failed: ${provisionResult.details}`,
      });
      return;
    }

    updateApp(appId, { status: 'signing' });

    const signedIpaPath = await signIPA({
      ipaPath,
      p12Buffer,
      p12Password,
      mobileProvisionBuffer: provisionBuffer,
      outputPath: signedPath,
      appInfo: app.info!,
      certInfo,
    });

    const signedR2Key = generateR2Key('signed', `signed_${app.originalName}`);
    await uploadFileToR2(signedIpaPath, signedR2Key, 'application/zip');

    updateApp(appId, {
      status: 'signed',
      signedR2Key,
      certificate: certInfo,
      signedAt: new Date().toISOString(),
    });

    const updatedApp = getApp(appId)!;

    const manifestId = updatedApp.id;
    const signedDownloadUrl = `${config.r2.publicUrl}/${signedR2Key}`;

    const manifestContent = generateManifestContent(
      updatedApp.info!,
      certInfo,
      signedDownloadUrl,
      manifestId
    );

    const manifestR2Key = generateR2Key('manifests', `${manifestId}.plist`);
    await uploadFileToR2(
      Buffer.from(manifestContent, 'utf-8'),
      manifestR2Key,
      'application/xml'
    );

    const manifestUrl = `${config.protocol}://${config.domain}/api/manifest/${manifestR2Key}`;
    const otaLink = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
    const installPageUrl = `${config.protocol}://${config.domain}/api/install/${manifestId}`;

    const installPageContent = generateInstallPageContent(updatedApp.info!, manifestUrl, otaLink, manifestId);
    const installR2Key = generateR2Key('install', `${manifestId}/index.html`);
    await uploadFileToR2(
      Buffer.from(installPageContent, 'utf-8'),
      installR2Key,
      'text/html'
    );

    let qrCodeDataUrl: string | undefined;
    try {
      qrCodeDataUrl = await generateQRCode(otaLink);
    } catch {}

    updateApp(appId, {
      manifestR2Key,
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
  } finally {
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) {
          const stat = fs.statSync(f);
          if (stat.isDirectory()) {
            fs.rmSync(f, { recursive: true, force: true });
          } else {
            fs.unlinkSync(f);
          }
        }
      } catch {}
    }
  }
});

function generateManifestContent(
  appInfo: { name: string; bundleId: string; version: string },
  certInfo: { commonName: string },
  ipaUrl: string,
  manifestId: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>items</key>
    <array>
        <dict>
            <key>assets</key>
            <array>
                <dict>
                    <key>kind</key>
                    <string>software-package</string>
                    <key>url</key>
                    <string>${ipaUrl}</string>
                </dict>
            </array>
            <key>metadata</key>
            <dict>
                <key>bundle-identifier</key>
                <string>${appInfo.bundleId}</string>
                <key>bundle-version</key>
                <string>${appInfo.version}</string>
                <key>kind</key>
                <string>software</string>
                <key>title</key>
                <string>${appInfo.name}</string>
            </dict>
        </dict>
    </array>
</dict>
</plist>`;
}

function generateInstallPageContent(
  appInfo: { name: string; version: string; buildNumber: string; size: number; iconBase64?: string },
  manifestUrl: string,
  otaLink: string,
  installId: string
): string {
  const sizeStr = formatSize(appInfo.size);
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Install ${escapeHtml(appInfo.name)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
            background: #000000;
            color: #ffffff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { max-width: 400px; width: 100%; padding: 40px 24px; text-align: center; }
        .app-icon {
            width: 120px; height: 120px; border-radius: 26px; margin: 0 auto 24px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex; align-items: center; justify-content: center; font-size: 48px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4); overflow: hidden;
        }
        .app-icon img { width: 100%; height: 100%; object-fit: cover; }
        .app-name { font-size: 28px; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.5px; }
        .app-version { font-size: 15px; color: #8e8e93; margin-bottom: 4px; }
        .app-size { font-size: 13px; color: #636366; margin-bottom: 32px; }
        .install-btn {
            display: inline-block; padding: 16px 48px;
            background: linear-gradient(135deg, #007AFF 0%, #0055D4 100%);
            color: #fff; font-size: 18px; font-weight: 600; border: none; border-radius: 14px;
            cursor: pointer; text-decoration: none; transition: all 0.2s ease;
            box-shadow: 0 4px 16px rgba(0,122,255,0.3);
        }
        .install-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,122,255,0.4); }
        .install-btn:active { transform: translateY(0); }
        .install-btn-link { display: inline-block; }
        .divider { width: 40px; height: 1px; background: #38383a; margin: 32px auto; }
        .qr-section { margin-top: 8px; }
        .qr-label { font-size: 13px; color: #636366; margin-bottom: 16px; }
        .qr-code { display: inline-block; padding: 12px; background: #ffffff; border-radius: 12px; }
        .qr-code img { display: block; }
        .footer { margin-top: 40px; font-size: 12px; color: #48484a; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .container > * { animation: fadeIn 0.5s ease forwards; }
        .container > *:nth-child(1) { animation-delay: 0.1s; opacity: 0; }
        .container > *:nth-child(2) { animation-delay: 0.2s; opacity: 0; }
        .container > *:nth-child(3) { animation-delay: 0.3s; opacity: 0; }
        .container > *:nth-child(4) { animation-delay: 0.4s; opacity: 0; }
        .container > *:nth-child(5) { animation-delay: 0.5s; opacity: 0; }
        .container > *:nth-child(6) { animation-delay: 0.6s; opacity: 0; }
        .container > *:nth-child(7) { animation-delay: 0.7s; opacity: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="app-icon">
            ${appInfo.iconBase64 ? `<img src="data:image/png;base64,${appInfo.iconBase64}" alt="App Icon">` : ''}
        </div>
        <div class="app-name">${escapeHtml(appInfo.name)}</div>
        <div class="app-version">Version ${escapeHtml(appInfo.version)} (${escapeHtml(appInfo.buildNumber)})</div>
        <div class="app-size">${sizeStr}</div>
        <a href="${escapeHtml(otaLink)}" class="install-btn-link">
            <button class="install-btn" onclick="window.location.href='${escapeHtml(otaLink)}'">Install</button>
        </a>
        <div class="divider"></div>
        <div class="qr-section">
            <div class="qr-label">Scan to install on another device</div>
            <div class="qr-code" id="qr-container"></div>
        </div>
        <div class="footer">Signed with AffSign</div>
    </div>
    <script>
        const otaUrl = '${escapeHtml(otaLink)}';
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size; canvas.height = size;
        document.getElementById('qr-container').appendChild(canvas);
        function drawQR(text) {
            const qr = makeQR(text, size);
            const ctx = canvas.getContext('2d');
            const moduleSize = size / qr.length;
            ctx.fillStyle = '#000000';
            for (let y = 0; y < qr.length; y++) {
                for (let x = 0; x < qr[y].length; x++) {
                    if (qr[y][x]) ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
                }
            }
        }
        function makeQR(text, size) {
            const len = 25;
            const grid = Array.from({length: len}, () => Array(len).fill(false));
            function setFinder(sx, sy) {
                for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
                    const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
                    const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
                    grid[sy + y][sx + x] = isOuter || isInner;
                }
            }
            setFinder(0, 0); setFinder(len - 7, 0); setFinder(0, len - 7);
            for (let i = 8; i < len - 8; i++) { grid[6][i] = i % 2 === 0; grid[i][6] = i % 2 === 0; }
            const data = [];
            for (let i = 0; i < text.length; i++) { const byte = text.charCodeAt(i); for (let bit = 7; bit >= 0; bit--) data.push((byte >> bit) & 1); }
            let idx = 0;
            for (let x = len - 1; x >= 0; x -= 2) {
                if (x === 6) x--;
                for (let row = 0; row < len; row++) {
                    const y = (Math.floor((len - 1 - x) / 2) % 2 === 0) ? len - 1 - row : row;
                    if (!grid[y][x] && (x > 8 || y > 8)) grid[y][x] = idx < data.length ? data[idx++] === 1 : Math.random() > 0.5;
                }
            }
            return grid;
        }
        drawQR(otaUrl);
    </script>
</body>
</html>`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { router as signRouter };
