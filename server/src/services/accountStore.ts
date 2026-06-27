import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../logger';

export interface GoogleAccount {
  id: string;
  email: string;
  refreshToken: string;
  folderUploads: string;
  folderSigned: string;
  addedAt: string;
}

interface AccountsData {
  accounts: GoogleAccount[];
  currentAccountIndex: number;
}

const ACCOUNTS_FILE = path.join(config.paths.temp, 'google_accounts.json');

function loadAccounts(): AccountsData {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
    }
  } catch (err) {
    logger.error('Failed to load accounts:', err);
  }
  return { accounts: [], currentAccountIndex: 0 };
}

function saveAccounts(data: AccountsData): void {
  const dir = path.dirname(ACCOUNTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
}

export function getAllAccounts(): GoogleAccount[] {
  return loadAccounts().accounts;
}

export function getAccountCount(): number {
  return loadAccounts().accounts.length;
}

export function getCurrentAccount(): GoogleAccount | null {
  const data = loadAccounts();
  if (data.accounts.length === 0) return null;
  const idx = data.currentAccountIndex % data.accounts.length;
  return data.accounts[idx];
}

export function addAccount(account: Omit<GoogleAccount, 'id' | 'addedAt'>): GoogleAccount {
  const data = loadAccounts();
  const newAccount: GoogleAccount = {
    ...account,
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
    addedAt: new Date().toISOString(),
  };
  data.accounts.push(newAccount);
  if (data.accounts.length === 1) data.currentAccountIndex = 0;
  saveAccounts(data);
  logger.info(`Added Google account: ${account.email}`);
  return newAccount;
}

export function removeAccount(id: string): boolean {
  const data = loadAccounts();
  const idx = data.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  data.accounts.splice(idx, 1);
  if (data.currentAccountIndex >= data.accounts.length) {
    data.currentAccountIndex = Math.max(0, data.accounts.length - 1);
  }
  saveAccounts(data);
  logger.info(`Removed Google account: ${id}`);
  return true;
}

export function setActiveAccount(id: string): boolean {
  const data = loadAccounts();
  const idx = data.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return false;
  data.currentAccountIndex = idx;
  saveAccounts(data);
  logger.info(`Set active account: ${data.accounts[idx].email}`);
  return true;
}

export function rotateAccount(): GoogleAccount | null {
  const data = loadAccounts();
  if (data.accounts.length === 0) return null;
  data.currentAccountIndex = (data.currentAccountIndex + 1) % data.accounts.length;
  saveAccounts(data);
  return data.accounts[data.currentAccountIndex];
}

export function getActiveAccountId(): string | null {
  const data = loadAccounts();
  if (data.accounts.length === 0) return null;
  return data.accounts[data.currentAccountIndex % data.accounts.length]?.id || null;
}
