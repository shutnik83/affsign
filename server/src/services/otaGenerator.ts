import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { config } from '../config';
import { logger } from '../logger';
import { AppInfo, CertificateInfo } from '../types';

export interface OTAResult {
  manifestUrl: string;
  otaLink: string;
  installPageUrl: string;
  qrCodeDataUrl: string;
}

export function generateManifest(
  appInfo: AppInfo,
  certInfo: CertificateInfo,
  ipaUrl: string,
  manifestId: string
): string {
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
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

  const manifestDir = config.paths.manifests;
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  const manifestPath = path.join(manifestDir, `${manifestId}.plist`);
  fs.writeFileSync(manifestPath, manifest, 'utf-8');
  logger.info(`Manifest generated: ${manifestPath}`);

  return manifestPath;
}

export function generateInstallPage(
  appInfo: AppInfo,
  manifestUrl: string,
  otaLink: string,
  installId: string
): string {
  const installDir = path.join(config.paths.install, installId);
  if (!fs.existsSync(installDir)) {
    fs.mkdirSync(installDir, { recursive: true });
  }

  const sizeStr = formatSize(appInfo.size);

  const html = `<!DOCTYPE html>
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
        .container {
            max-width: 400px;
            width: 100%;
            padding: 40px 24px;
            text-align: center;
        }
        .app-icon {
            width: 120px;
            height: 120px;
            border-radius: 26px;
            margin: 0 auto 24px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            overflow: hidden;
        }
        .app-icon img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .app-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        .app-version {
            font-size: 15px;
            color: #8e8e93;
            margin-bottom: 4px;
        }
        .app-size {
            font-size: 13px;
            color: #636366;
            margin-bottom: 32px;
        }
        .install-btn {
            display: inline-block;
            padding: 16px 48px;
            background: linear-gradient(135deg, #007AFF 0%, #0055D4 100%);
            color: #fff;
            font-size: 18px;
            font-weight: 600;
            border: none;
            border-radius: 14px;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 4px 16px rgba(0,122,255,0.3);
        }
        .install-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0,122,255,0.4);
        }
        .install-btn:active {
            transform: translateY(0);
        }
        .install-btn-link {
            display: inline-block;
        }
        .divider {
            width: 40px;
            height: 1px;
            background: #38383a;
            margin: 32px auto;
        }
        .qr-section {
            margin-top: 8px;
        }
        .qr-label {
            font-size: 13px;
            color: #636366;
            margin-bottom: 16px;
        }
        .qr-code {
            display: inline-block;
            padding: 12px;
            background: #ffffff;
            border-radius: 12px;
        }
        .qr-code img {
            display: block;
        }
        .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #48484a;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .container > * {
            animation: fadeIn 0.5s ease forwards;
        }
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
            ${appInfo.iconBase64
              ? `<img src="data:image/png;base64,${appInfo.iconBase64}" alt="App Icon">`
              : '📱'
            }
        </div>
        <div class="app-name">${escapeHtml(appInfo.name)}</div>
        <div class="app-version">Version ${escapeHtml(appInfo.version)} (${escapeHtml(appInfo.buildNumber)})</div>
        <div class="app-size">${sizeStr}</div>
        <a href="${escapeHtml(otaLink)}" class="install-btn-link">
            <button class="install-btn" onclick="window.location.href='${escapeHtml(otaLink)}'">
                Install
            </button>
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
        canvas.width = size;
        canvas.height = size;
        document.getElementById('qr-container').appendChild(canvas);

        function drawQR(text) {
            const qr = makeQR(text, size);
            const ctx = canvas.getContext('2d');
            const moduleSize = size / qr.length;
            ctx.fillStyle = '#000000';
            for (let y = 0; y < qr.length; y++) {
                for (let x = 0; x < qr[y].length; x++) {
                    if (qr[y][x]) {
                        ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
                    }
                }
            }
        }

        function makeQR(text, size) {
            const len = 25;
            const grid = Array.from({length: len}, () => Array(len).fill(false));

            function setFinder(startX, startY) {
                for (let y = 0; y < 7; y++) {
                    for (let x = 0; x < 7; x++) {
                        const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
                        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4;
                        grid[startY + y][startX + x] = isOuter || isInner;
                    }
                }
            }

            setFinder(0, 0);
            setFinder(len - 7, 0);
            setFinder(0, len - 7);

            for (let i = 8; i < len - 8; i++) {
                grid[6][i] = i % 2 === 0;
                grid[i][6] = i % 2 === 0;
            }

            const data = [];
            for (let i = 0; i < text.length; i++) {
                const byte = text.charCodeAt(i);
                for (let bit = 7; bit >= 0; bit--) {
                    data.push((byte >> bit) & 1);
                }
            }

            let idx = 0;
            for (let x = len - 1; x >= 0; x -= 2) {
                if (x === 6) x--;
                for (let row = 0; row < len; row++) {
                    const y = (Math.floor((len - 1 - x) / 2) % 2 === 0) ? len - 1 - row : row;
                    if (!grid[y][x] && (x > 8 || y > 8)) {
                        grid[y][x] = idx < data.length ? data[idx++] === 1 : Math.random() > 0.5;
                    }
                }
            }

            return grid;
        }

        drawQR(otaUrl);
    </script>
</body>
</html>`;

  const htmlPath = path.join(installDir, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  logger.info(`Install page generated: ${htmlPath}`);

  return htmlPath;
}

export async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    logger.error('QR code generation failed:', err);
    throw new Error('Failed to generate QR code');
  }
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
