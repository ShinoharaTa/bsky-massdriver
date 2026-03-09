import { browser } from "$app/environment";
import { goto } from "$app/navigation";

import { AtpAgent, RichText } from "@atproto/api";
import type { AtpPersistSessionHandler, AtpSessionData } from "@atproto/api";
import { setMessage } from "../../stores/MassDriver";

const SERVICE = "https://bsky.social";
const LEGACY_SESSION_KEY = "sess";
const ACCOUNTS_KEY = "accounts";
const ACTIVE_ACCOUNT_KEY = "activeAccountId";
export const BSKY_IMAGE_MAX_BYTES = 1_000_000;
export const BSKY_IMAGE_MAX_DIMENSION = 1000;

export type StoredAccount = {
  id: string;
  handle: string;
  session: AtpSessionData;
};

export type MultiPostResult = {
  accountId: string;
  handle: string;
  success: boolean;
  error?: string;
};

let currentAccountId: string | null = null;
let currentHandle = "";

function updateStoredAccountSession(accountId: string, session: AtpSessionData): void {
  const accounts = readAccounts();
  const index = accounts.findIndex((account) => account.id === accountId);
  if (index === -1) return;

  const updatedAccount: StoredAccount = {
    ...accounts[index],
    handle: session.handle ?? accounts[index].handle,
    session,
  };
  accounts[index] = updatedAccount;
  writeAccounts(accounts);

  if (currentAccountId === updatedAccount.id) {
    setCurrentAccount(updatedAccount);
  }
}

function createPersistSessionHandler(getAccountId: () => string | null): AtpPersistSessionHandler {
  return (evt, session) => {
    if (!browser) return;

    if (evt === "create" || evt === "update") {
      if (!session) return;
      const accountId = getAccountId() ?? session.did;
      updateStoredAccountSession(accountId, session);
      return;
    }

    if (evt === "expired") {
      const accountId = getAccountId();
      if (accountId) removeStoredAccount(accountId);
    }
  };
}

const activeAgent = new AtpAgent({
  service: SERVICE,
  persistSession: createPersistSessionHandler(() => currentAccountId),
});

function readAccounts(): StoredAccount[] {
  if (!browser) return [];
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  if (!browser) return;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function getAccountById(accountId: string): StoredAccount | null {
  return readAccounts().find((account) => account.id === accountId) ?? null;
}

function setCurrentAccount(account: StoredAccount | null) {
  currentAccountId = account?.id ?? null;
  currentHandle = account?.handle ?? "";
}

function createAgentForSession(account: StoredAccount) {
  const agent = new AtpAgent({
    service: SERVICE,
    persistSession: createPersistSessionHandler(() => account.id),
  });
  return { agent, resume: () => agent.resumeSession(account.session) };
}

function migrateLegacySession() {
  if (!browser) return;
  const hasAccounts = !!localStorage.getItem(ACCOUNTS_KEY);
  const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
  if (hasAccounts || !legacy) return;
  try {
    const sess = JSON.parse(legacy) as AtpSessionData;
    const account: StoredAccount = {
      id: sess.did ?? crypto.randomUUID(),
      handle: sess.handle ?? "",
      session: sess,
    };
    writeAccounts([account]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
  } finally {
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}

export function getStoredAccounts(): StoredAccount[] {
  migrateLegacySession();
  return readAccounts();
}

export function getActiveAccountId(): string | null {
  if (!browser) return null;
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
}

export function setActiveAccount(accountId: string): void {
  if (!browser) return;
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  const account = getAccountById(accountId);
  setCurrentAccount(account);
}

export function removeStoredAccount(accountId: string): void {
  if (!browser) return;
  const nextAccounts = readAccounts().filter((account) => account.id !== accountId);
  writeAccounts(nextAccounts);
  const active = getActiveAccountId();
  if (active === accountId) {
    const nextActive = nextAccounts[0]?.id ?? null;
    if (nextActive) localStorage.setItem(ACTIVE_ACCOUNT_KEY, nextActive);
    else localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    setCurrentAccount(nextAccounts[0] ?? null);
  }
}

export async function login(username: string, password: string): Promise<void> {
  if (!browser) return;

  let persistedSession: AtpSessionData | null = null;
  const loginAgent = new AtpAgent({
    service: SERVICE,
    persistSession: (_evt, sess) => {
      persistedSession = sess ?? null;
    },
  });

  const result = await loginAgent.login({
    identifier: username,
    password,
  });

  const session = persistedSession ?? (result.data as AtpSessionData);
  const accountId = session.did ?? crypto.randomUUID();
  const handle = session.handle ?? username;
  const nextAccount: StoredAccount = { id: accountId, handle, session };
  const current = readAccounts().filter((item) => item.id !== accountId);
  writeAccounts([...current, nextAccount]);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
  setCurrentAccount(nextAccount);
}

export async function hasSession(): Promise<boolean> {
  if (!browser) return false;
  migrateLegacySession();

  const accounts = readAccounts();
  if (!accounts.length) {
    setCurrentAccount(null);
    setMessage("Please Login.");
    goto("/login");
    return false;
  }

  const activeId = getActiveAccountId() ?? accounts[0].id;
  const active = accounts.find((account) => account.id === activeId) ?? accounts[0];
  if (!active) {
    setCurrentAccount(null);
    setMessage("Please Login.");
    goto("/login");
    return false;
  }

  try {
    await activeAgent.resumeSession(active.session);
    setCurrentAccount(active);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, active.id);
    return true;
  } catch {
    removeStoredAccount(active.id);
    const remain = readAccounts();
    if (!remain.length) {
      setCurrentAccount(null);
      setMessage("Please Login.");
      goto("/login");
      return false;
    }
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, remain[0].id);
    return hasSession();
  }
}

export function logout(): void {
  if (!browser) return;
  const activeId = getActiveAccountId();
  if (activeId) removeStoredAccount(activeId);
  setCurrentAccount(null);
  goto("/login");
}

export async function getProfile() {
  if (!browser) return null;
  try {
    const actor = currentHandle || readAccounts()[0]?.handle;
    if (!actor) return null;
    const { data } = await activeAgent.getProfile({ actor });
    return data;
  } catch {
    return null;
  }
}

export async function getProfileForAccount(accountId: string) {
  if (!browser) return null;
  const account = getAccountById(accountId);
  if (!account) return null;

  try {
    const { agent, resume } = createAgentForSession(account);
    await resume();
    const { data } = await agent.getProfile({ actor: account.handle });
    return data;
  } catch {
    return null;
  }
}

export async function post(text: string, imageFiles: File[] = []) {
  const activeId = getActiveAccountId();
  if (!activeId) throw new Error("No active account");
  const results = await postToAccounts(text, [activeId], imageFiles);
  const first = results[0];
  if (!first?.success) throw new Error(first?.error ?? "Post failed");
}

export async function extractHashtagsFromRichText(text: string): Promise<string[]> {
  const rt = new RichText({ text });
  try {
    await rt.detectFacets(activeAgent);
  } catch {
    // fallback: facet extraction can fail before session initialization
  }

  const tags = new Set<string>();
  for (const facet of rt.facets ?? []) {
    for (const feature of facet.features ?? []) {
      if (feature.$type === "app.bsky.richtext.facet#tag" && "tag" in feature) {
        const normalized = String(feature.tag).trim().toLowerCase();
        if (normalized) tags.add(normalized);
      }
    }
  }
  return [...tags];
}

export async function postToAccounts(
  text: string,
  accountIds: string[],
  imageFiles: File[] = []
): Promise<MultiPostResult[]> {
  const allAccounts = readAccounts();
  const targets = allAccounts.filter((account) => accountIds.includes(account.id));

  const results = await Promise.all(
    targets.map(async (account): Promise<MultiPostResult> => {
      try {
        const { agent, resume } = createAgentForSession(account);
        await resume();

        const rt = new RichText({ text });
        await rt.detectFacets(agent);

        const postPayload: Parameters<typeof agent.post>[0] = {
          $type: "app.bsky.feed.post",
          text: rt.text,
          facets: rt.facets,
        };
        if (imageFiles.length > 0) {
          const images = await Promise.all(
            imageFiles.slice(0, 4).map(async (file) => {
              if (file.size > BSKY_IMAGE_MAX_BYTES) {
                throw new Error(
                  `Image too large after preprocessing: ${file.name} (${Math.round(file.size / 1024)}KB)`
                );
              }
              const buffer = new Uint8Array(await file.arrayBuffer());
              const uploaded = await agent.uploadBlob(buffer, {
                encoding: file.type || "image/jpeg",
              });
              return {
                alt: file.name || "",
                image: uploaded.data.blob,
              };
            })
          );
          postPayload.embed = {
            $type: "app.bsky.embed.images",
            images,
          };
        }

        await agent.post(postPayload);

        return { accountId: account.id, handle: account.handle, success: true };
      } catch (error) {
        return {
          accountId: account.id,
          handle: account.handle,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  return results;
}
