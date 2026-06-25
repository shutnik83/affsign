import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { config } from '../config';
import { logger } from '../logger';
import { AppInfo } from '../types';

export function extractIpa(ipaPath: string, destDir: string): string {
  if (!fs.existsSync(ipaPath)) {
    throw new Error(`IPA file not found: ${ipaPath}`);
  }

  const payloadDir = path.join(destDir, 'Payload');

  try {
    const zip = new AdmZip(ipaPath);
    zip.extractAllTo(destDir, true);
  } catch (err) {
    throw new Error(
      `Failed to extract IPA: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!fs.existsSync(payloadDir)) {
    throw new Error('Invalid IPA: Payload directory not found');
  }

  return destDir;
}

export function parseAppInfo(extractedDir: string): AppInfo {
  const payloadDir = path.join(extractedDir, 'Payload');
  const appDirs = fs.readdirSync(payloadDir).filter((d) => d.endsWith('.app'));

  if (appDirs.length === 0) {
    throw new Error('No .app bundle found in IPA');
  }

  const appBundlePath = path.join(payloadDir, appDirs[0]);
  const infoPlistPath = path.join(appBundlePath, 'Info.plist');

  if (!fs.existsSync(infoPlistPath)) {
    throw new Error('Info.plist not found in app bundle');
  }

  const plistContent = fs.readFileSync(infoPlistPath, 'utf-8');
  const info = parsePlist(plistContent);

  let iconBase64: string | undefined;
  try {
    iconBase64 = extractAppIcon(appBundlePath);
  } catch {
    // icon extraction is optional
  }

  let totalSize = 0;
  const statDir = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        statDir(fullPath);
      } else {
        totalSize += fs.statSync(fullPath).size;
      }
    }
  };
  statDir(appBundlePath);

  return {
    name: info.CFBundleDisplayName || info.CFBundleName || 'Unknown',
    bundleId: info.CFBundleIdentifier || 'unknown',
    version: info.CFBundleShortVersionString || '1.0.0',
    buildNumber: info.CFBundleVersion || '1',
    iconBase64,
    minOSVersion: info.MinimumOSVersion,
    size: totalSize,
  };
}

interface PlistInfo {
  CFBundleDisplayName?: string;
  CFBundleName?: string;
  CFBundleIdentifier?: string;
  CFBundleShortVersionString?: string;
  CFBundleVersion?: string;
  MinimumOSVersion?: string;
}

function parsePlist(plistContent: string): PlistInfo {
  const info: PlistInfo = {};

  const getKeyValue = (key: string): string | undefined => {
    const patterns = [
      new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`),
      new RegExp(`<key>${key}</key>\\s*<integer>([^<]*)</integer>`),
    ];
    for (const pattern of patterns) {
      const match = plistContent.match(pattern);
      if (match) return match[1];
    }
    return undefined;
  };

  info.CFBundleDisplayName = getKeyValue('CFBundleDisplayName');
  info.CFBundleName = getKeyValue('CFBundleName');
  info.CFBundleIdentifier = getKeyValue('CFBundleIdentifier');
  info.CFBundleShortVersionString = getKeyValue('CFBundleShortVersionString');
  info.CFBundleVersion = getKeyValue('CFBundleVersion');
  info.MinimumOSVersion = getKeyValue('MinimumOSVersion');

  return info;
}

function extractAppIcon(appBundlePath: string): string | undefined {
  const assetCatalogPath = path.join(appBundlePath, 'Assets.xcassets');
  if (fs.existsSync(assetCatalogPath)) {
    const iconDir = findIconInAssets(assetCatalogPath);
    if (iconDir) {
      const iconPath = path.join(iconDir, 'icon_1024x1024.png');
      if (fs.existsSync(iconPath)) {
        return fs.readFileSync(iconPath).toString('base64');
      }
      const contentsPath = path.join(iconDir, 'Contents.json');
      if (fs.existsSync(contentsPath)) {
        const contents = JSON.parse(fs.readFileSync(contentsPath, 'utf-8'));
        const images = contents.images || [];
        const sizeEntry = images.find(
          (img: { size?: string }) => img.size === '1024x1024' || img.size === '512x512'
        );
        if (sizeEntry?.filename) {
          const iconFile = path.join(iconDir, sizeEntry.filename);
          if (fs.existsSync(iconFile)) {
            return fs.readFileSync(iconFile).toString('base64');
          }
        }
        if (images.length > 0 && images[0]?.filename) {
          const iconFile = path.join(iconDir, images[0].filename);
          if (fs.existsSync(iconFile)) {
            return fs.readFileSync(iconFile).toString('base64');
          }
        }
      }
    }
  }

  const iconFiles = ['icon.png', 'Icon.png', 'AppIcon.png', 'icon@2x.png'];
  for (const iconFile of iconFiles) {
    const iconPath = path.join(appBundlePath, iconFile);
    if (fs.existsSync(iconPath)) {
      return fs.readFileSync(iconPath).toString('base64');
    }
  }

  const itunesArtwork = path.join(appBundlePath, 'iTunesArtwork');
  if (fs.existsSync(itunesArtwork)) {
    return fs.readFileSync(itunesArtwork).toString('base64');
  }
  const itunesArtwork2x = path.join(appBundlePath, 'iTunesArtwork@2x');
  if (fs.existsSync(itunesArtwork2x)) {
    return fs.readFileSync(itunesArtwork2x).toString('base64');
  }

  return undefined;
}

function findIconInAssets(assetsDir: string): string | undefined {
  const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.toLowerCase().includes('appicon')) {
      return path.join(assetsDir, entry.name);
    }
  }
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.toLowerCase().includes('icon')) {
      return path.join(assetsDir, entry.name);
    }
  }
  return undefined;
}
