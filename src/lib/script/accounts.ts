import { browser } from "$app/environment";
import type { AtpSessionData } from "@atproto/api";

export type Platform = "bluesky" | "nostr";

export type BlueskyStoredAccount = {
  id: string;
  handle: string;
  platform: "bluesky";
  session: AtpSessionData;
};

export type NostrStoredAccount = {
  id: string;
  handle: string;
  platform: "nostr";
  nsec: string;
  pubkey: string;
};

export type StoredAccount = BlueskyStoredAccount | NostrStoredAccount;

export const MAX_ACCOUNTS = 10;
const ACCOUNTS_KEY = "accounts";
const ACTIVE_ACCOUNT_KEY = "activeAccountId";
const LEGACY_SESSION_KEY = "sess";

export function readAccounts(): StoredAccount[] {
  if (!browser) return [];
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return parsed.map(migrateAccountRecord);
  } catch {
    return [];
  }
}

function migrateAccountRecord(raw: Record<string, unknown>): StoredAccount {
  if (raw.platform === "bluesky" || raw.platform === "nostr") {
    return raw as unknown as StoredAccount;
  }
  return { ...raw, platform: "bluesky" } as unknown as StoredAccount;
}

export function writeAccounts(accounts: StoredAccount[]): void {
  if (!browser) return;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getAccountById(accountId: string): StoredAccount | null {
  return readAccounts().find((a) => a.id === accountId) ?? null;
}

export function getStoredAccounts(): StoredAccount[] {
  migrateLegacySession();
  return readAccounts();
}

export function getActiveAccountId(): string | null {
  if (!browser) return null;
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
}

export function setActiveAccountId(accountId: string): void {
  if (!browser) return;
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
}

export function removeStoredAccount(accountId: string): void {
  if (!browser) return;
  const nextAccounts = readAccounts().filter((a) => a.id !== accountId);
  writeAccounts(nextAccounts);
  const active = getActiveAccountId();
  if (active === accountId) {
    const nextActive = nextAccounts[0]?.id ?? null;
    if (nextActive) localStorage.setItem(ACTIVE_ACCOUNT_KEY, nextActive);
    else localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }
}

function migrateLegacySession(): void {
  if (!browser) return;
  const hasAccounts = !!localStorage.getItem(ACCOUNTS_KEY);
  const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
  if (hasAccounts || !legacy) return;
  try {
    const sess = JSON.parse(legacy) as AtpSessionData;
    const account: BlueskyStoredAccount = {
      id: sess.did ?? crypto.randomUUID(),
      handle: sess.handle ?? "",
      platform: "bluesky",
      session: sess,
    };
    writeAccounts([account]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
  } finally {
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}

export function addAccount(account: StoredAccount): void {
  if (!browser) return;
  const existing = readAccounts();
  const isNew = !existing.some((a) => a.id === account.id);
  if (isNew && existing.length >= MAX_ACCOUNTS) {
    throw new Error(`登録できるアカウントは最大${MAX_ACCOUNTS}件です。不要なアカウントを削除してください。`);
  }
  const current = existing.filter((a) => a.id !== account.id);
  writeAccounts([...current, account]);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
}

export function isBlueskyAccount(account: StoredAccount): account is BlueskyStoredAccount {
  return account.platform === "bluesky";
}

export function isNostrAccount(account: StoredAccount): account is NostrStoredAccount {
  return account.platform === "nostr";
}
