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
export const BSKY_IMAGE_MAX_DIMENSION = 2000;
export const MAX_ACCOUNTS = 10;

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

export type PostImageInput = {
  file: File;
  width: number;
  height: number;
  alt?: string;
};

export type AccountRequestError = {
  accountId: string;
  handle: string;
  error: string;
};

export type TimelineCursorByAccount = Record<string, string | null>;

export type AccountNotificationReason =
  | "reply"
  | "mention"
  | "repost"
  | "like"
  | "quote"
  | "follow"
  | "unknown";

export type AccountNotification = {
  id: string;
  accountId: string;
  accountHandle: string;
  reason: AccountNotificationReason;
  indexedAt: string;
  isRead: boolean;
  authorHandle: string;
  authorDisplayName: string;
  authorAvatar: string | null;
  previewText: string;
  subjectText: string;
  postUri: string | null;
};

export type ManagedPostMetrics = {
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
};

export type ManagedPost = {
  id: string;
  uri: string;
  cid: string | null;
  accountId: string;
  accountHandle: string;
  indexedAt: string;
  text: string;
  hasMedia: boolean;
  images: { thumb: string; fullsize: string; alt: string }[];
  metrics: ManagedPostMetrics;
  replyParentUri: string | null;
};

export type NotificationsPageResult = {
  items: AccountNotification[];
  cursorByAccount: TimelineCursorByAccount;
  errors: AccountRequestError[];
};

export type ManagedPostsPageResult = {
  items: ManagedPost[];
  cursorByAccount: TimelineCursorByAccount;
  errors: AccountRequestError[];
};

let currentAccountId: string | null = null;
let currentHandle = "";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toNumberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function createCursorMap(accountIds: string[], existing: TimelineCursorByAccount = {}): TimelineCursorByAccount {
  return Object.fromEntries(accountIds.map((accountId) => [accountId, existing[accountId] ?? null]));
}

export function sortTimelineDesc<T extends { indexedAt: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right.indexedAt).getTime();
    const leftTime = new Date(left.indexedAt).getTime();
    return rightTime - leftTime;
  });
}

function extractRecordText(record: unknown): string {
  if (!isRecord(record)) return "";
  if (typeof record.text === "string") return record.text;
  if (isRecord(record.value) && typeof record.value.text === "string") return record.value.text;
  return "";
}

export function chunkItems<T>(items: T[], size: number): T[][];
export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function normalizeNotificationReason(reason: unknown): AccountNotificationReason {
  switch (reason) {
    case "reply":
    case "mention":
    case "repost":
    case "like":
    case "quote":
    case "follow":
      return reason;
    default:
      return "unknown";
  }
}

function normalizeNotification(account: StoredAccount, notification: unknown): AccountNotification | null {
  if (!isRecord(notification)) return null;
  const author = isRecord(notification.author) ? notification.author : null;
  const indexedAt = toOptionalString(notification.indexedAt) ?? new Date(0).toISOString();
  const postUri = toOptionalString(notification.reasonSubject);
  const notificationUri = toOptionalString(notification.uri);
  const authorHandle = toOptionalString(author?.handle) ?? "";
  const authorDisplayName = toOptionalString(author?.displayName) ?? authorHandle;
  const reason = normalizeNotificationReason(notification.reason);
  const previewText = extractRecordText(notification.record).trim();
  const id =
    toOptionalString(notification.cid) ??
    notificationUri ??
    postUri ??
    `${account.id}:${reason}:${indexedAt}:${authorHandle || "unknown"}`;

  return {
    id,
    accountId: account.id,
    accountHandle: account.handle,
    reason,
    indexedAt,
    isRead: notification.isRead === true,
    authorHandle,
    authorDisplayName,
    authorAvatar: toOptionalString(author?.avatar),
    previewText,
    subjectText: "",
    postUri,
  };
}

async function resolveNotificationSubjectTexts(
  agent: AtpAgent,
  items: AccountNotification[]
): Promise<AccountNotification[]> {
  const uris = [...new Set(items.map((item) => item.postUri).filter((uri): uri is string => !!uri))];
  if (uris.length === 0) return items;

  const textByUri: Record<string, string> = {};

  for (const batch of chunkItems(uris, 25)) {
    try {
      const { data } = await agent.getPosts({ uris: batch });
      for (const post of (data.posts ?? []) as unknown[]) {
        if (!isRecord(post)) continue;
        const uri = toOptionalString(post.uri);
        const text = extractRecordText(post.record).trim();
        if (!uri) continue;
        textByUri[uri] = text;
      }
    } catch {
      // 通知一覧の表示自体は継続する
    }
  }

  return items.map((item) => ({
    ...item,
    subjectText: item.postUri ? textByUri[item.postUri] ?? "" : "",
  }));
}

function extractReplyParentUri(postView: unknown): string | null {
  if (!isRecord(postView) || !isRecord(postView.reply) || !isRecord(postView.reply.parent)) return null;
  return toOptionalString(postView.reply.parent.uri);
}

function hasMediaEmbed(postView: unknown): boolean {
  if (!isRecord(postView) || !isRecord(postView.embed)) return false;
  const embedType = toOptionalString(postView.embed.$type) ?? "";
  return embedType.includes("images") || embedType.includes("video") || embedType.includes("media");
}

function extractImagesFromEmbed(postView: unknown): { thumb: string; fullsize: string; alt: string }[] {
  if (!isRecord(postView) || !isRecord(postView.embed)) return [];
  const embed = postView.embed;
  let imagesData: unknown[] = [];

  // app.bsky.embed.images#view
  if (embed.$type === "app.bsky.embed.images#view" && Array.isArray(embed.images)) {
    imagesData = embed.images;
  }
  // app.bsky.embed.recordWithMedia#view (メディア付き引用RPなど)
  else if (embed.$type === "app.bsky.embed.recordWithMedia#view" && isRecord(embed.media) && embed.media.$type === "app.bsky.embed.images#view" && Array.isArray(embed.media.images)) {
    imagesData = embed.media.images;
  }

  return imagesData.map(img => {
    if (!isRecord(img)) return null;
    return {
      thumb: toOptionalString(img.thumb) ?? "",
      fullsize: toOptionalString(img.fullsize) ?? "",
      alt: toOptionalString(img.alt) ?? "",
    };
  }).filter((img): img is { thumb: string; fullsize: string; alt: string } => img !== null && img.thumb !== "");
}

function normalizeManagedPost(account: StoredAccount, entry: unknown): ManagedPost | null {
  if (!isRecord(entry) || !isRecord(entry.post)) return null;
  if (entry.reason) return null;

  const postView = entry.post;
  const author = isRecord(postView.author) ? postView.author : null;
  const authorDid = toOptionalString(author?.did);
  if (authorDid && account.session.did && authorDid !== account.session.did) return null;

  const uri = toOptionalString(postView.uri);
  if (!uri) return null;

  const indexedAt =
    toOptionalString(postView.indexedAt) ??
    (isRecord(postView.record) ? toOptionalString(postView.record.createdAt) : null) ??
    new Date(0).toISOString();

  return {
    id: uri,
    uri,
    cid: toOptionalString(postView.cid),
    accountId: account.id,
    accountHandle: account.handle,
    indexedAt,
    text: extractRecordText(postView.record).trim(),
    hasMedia: hasMediaEmbed(postView),
    images: extractImagesFromEmbed(postView),
    metrics: {
      likeCount: toNumberOrZero(postView.likeCount),
      repostCount: toNumberOrZero(postView.repostCount),
      replyCount: toNumberOrZero(postView.replyCount),
      quoteCount: toNumberOrZero(postView.quoteCount),
    },
    replyParentUri: extractReplyParentUri(postView),
  };
}

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

  const existing = readAccounts();
  const isNewAccount = !existing.some(
    (a) => a.handle.toLowerCase() === username.toLowerCase()
  );
  if (isNewAccount && existing.length >= MAX_ACCOUNTS) {
    throw new Error(`登録できるアカウントは最大${MAX_ACCOUNTS}件です。不要なアカウントを削除してください。`);
  }

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
    setMessage("アカウントを追加してはじめましょう。", "info");
    goto("/login");
    return false;
  }

  const activeId = getActiveAccountId() ?? accounts[0].id;
  const active = accounts.find((account) => account.id === activeId) ?? accounts[0];
  if (!active) {
    setCurrentAccount(null);
    setMessage("アカウントを追加してはじめましょう。", "info");
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
      setMessage("セッションが期限切れになりました。アプリパスワードで再ログインしてください。", "warning");
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

export async function getNotificationsForAccounts(
  accountIds: string[],
  cursorByAccount: TimelineCursorByAccount = {},
  limit = 25
): Promise<NotificationsPageResult> {
  const allAccounts = readAccounts();
  const targets =
    accountIds.length > 0
      ? allAccounts.filter((account) => accountIds.includes(account.id))
      : allAccounts;

  const nextCursorByAccount = createCursorMap(
    targets.map((account) => account.id),
    cursorByAccount
  );

  const results = await Promise.all(
    targets.map(async (account) => {
      try {
        const { agent, resume } = createAgentForSession(account);
        await resume();
        const { data } = await agent.listNotifications({
          limit,
          cursor: cursorByAccount[account.id] ?? undefined,
        });
        const normalizedItems = ((data.notifications ?? []) as unknown[])
          .map((notification) => normalizeNotification(account, notification))
          .filter((notification): notification is AccountNotification => notification !== null);
        const items = await resolveNotificationSubjectTexts(agent, normalizedItems);
        return {
          accountId: account.id,
          cursor: data.cursor ?? null,
          items,
          error: null,
        };
      } catch (error) {
        return {
          accountId: account.id,
          cursor: cursorByAccount[account.id] ?? null,
          items: [] as AccountNotification[],
          error: {
            accountId: account.id,
            handle: account.handle,
            error: toErrorMessage(error),
          },
        };
      }
    })
  );

  const items: AccountNotification[] = [];
  const errors: AccountRequestError[] = [];

  for (const result of results) {
    nextCursorByAccount[result.accountId] = result.cursor;
    items.push(...result.items);
    if (result.error) errors.push(result.error);
  }

  return {
    items: sortTimelineDesc(items),
    cursorByAccount: nextCursorByAccount,
    errors,
  };
}

export async function getManagedPostsForAccounts(
  accountIds: string[],
  cursorByAccount: TimelineCursorByAccount = {},
  limit = 25
): Promise<ManagedPostsPageResult> {
  const allAccounts = readAccounts();
  const targets =
    accountIds.length > 0
      ? allAccounts.filter((account) => accountIds.includes(account.id))
      : allAccounts;

  const nextCursorByAccount = createCursorMap(
    targets.map((account) => account.id),
    cursorByAccount
  );

  const results = await Promise.all(
    targets.map(async (account) => {
      try {
        const { agent, resume } = createAgentForSession(account);
        await resume();
        const { data } = await agent.getAuthorFeed({
          actor: account.session.did ?? account.handle,
          filter: "posts_with_replies",
          limit,
          cursor: cursorByAccount[account.id] ?? undefined,
        });
        const items = ((data.feed ?? []) as unknown[])
          .map((entry) => normalizeManagedPost(account, entry))
          .filter((post): post is ManagedPost => post !== null);
        return {
          accountId: account.id,
          cursor: data.cursor ?? null,
          items,
          error: null,
        };
      } catch (error) {
        return {
          accountId: account.id,
          cursor: cursorByAccount[account.id] ?? null,
          items: [] as ManagedPost[],
          error: {
            accountId: account.id,
            handle: account.handle,
            error: toErrorMessage(error),
          },
        };
      }
    })
  );

  const items: ManagedPost[] = [];
  const errors: AccountRequestError[] = [];

  for (const result of results) {
    nextCursorByAccount[result.accountId] = result.cursor;
    items.push(...result.items);
    if (result.error) errors.push(result.error);
  }

  return {
    items: sortTimelineDesc(items),
    cursorByAccount: nextCursorByAccount,
    errors,
  };
}

export async function deleteManagedPost(accountId: string, postUri: string): Promise<void> {
  const account = getAccountById(accountId);
  if (!account) throw new Error("Account not found");

  const { agent, resume } = createAgentForSession(account);
  await resume();
  await agent.deletePost(postUri);
}

export async function post(text: string, imageFiles: PostImageInput[] = []) {
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
  imageFiles: PostImageInput[] = []
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
            imageFiles.slice(0, 4).map(async ({ file, width, height, alt }) => {
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
                alt: (alt ?? file.name) || "",
                aspectRatio: { width, height },
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
