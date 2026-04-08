import { browser } from "$app/environment";
import { goto } from "$app/navigation";

import { AtpAgent, RichText } from "@atproto/api";
import type { AtpPersistSessionHandler, AtpSessionData } from "@atproto/api";
import { setMessage } from "../../stores/MassDriver";
import {
  readAccounts,
  writeAccounts,
  getAccountById,
  getActiveAccountId,
  setActiveAccountId,
  removeStoredAccount,
  getStoredAccounts,
  addAccount,
  isBlueskyAccount,
  isNostrAccount,
  type BlueskyStoredAccount,
  type StoredAccount,
  type Platform,
  type NostrStoredAccount,
} from "./accounts";

export {
  getStoredAccounts,
  getActiveAccountId,
  removeStoredAccount,
  type StoredAccount,
  type BlueskyStoredAccount,
  type NostrStoredAccount,
  type Platform,
};
export { MAX_ACCOUNTS } from "./accounts";
export { isBlueskyAccount, isNostrAccount } from "./accounts";

const SERVICE = "https://bsky.social";
export const BSKY_IMAGE_MAX_BYTES = 1_000_000;
export const BSKY_IMAGE_MAX_DIMENSION = 2000;

export type MultiPostResult = {
  accountId: string;
  handle: string;
  platform: Platform;
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
      // keep showing the notification list
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

  if (embed.$type === "app.bsky.embed.images#view" && Array.isArray(embed.images)) {
    imagesData = embed.images;
  } else if (embed.$type === "app.bsky.embed.recordWithMedia#view" && isRecord(embed.media) && embed.media.$type === "app.bsky.embed.images#view" && Array.isArray(embed.media.images)) {
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

function normalizeManagedPost(account: BlueskyStoredAccount, entry: unknown): ManagedPost | null {
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

  const existing = accounts[index];
  if (!isBlueskyAccount(existing)) return;

  const updatedAccount: BlueskyStoredAccount = {
    ...existing,
    handle: session.handle ?? existing.handle,
    session,
  };
  accounts[index] = updatedAccount;
  writeAccounts(accounts);

  if (currentAccountId === updatedAccount.id) {
    setCurrentAccount(updatedAccount);
  }
}

function createPersistSessionHandler(getAccountIdFn: () => string | null): AtpPersistSessionHandler {
  return (evt, session) => {
    if (!browser) return;

    if (evt === "create" || evt === "update") {
      if (!session) return;
      const accountId = getAccountIdFn() ?? session.did;
      updateStoredAccountSession(accountId, session);
      return;
    }

    if (evt === "expired") {
      const accountId = getAccountIdFn();
      if (accountId) removeStoredAccount(accountId);
    }
  };
}

const activeAgent = new AtpAgent({
  service: SERVICE,
  persistSession: createPersistSessionHandler(() => currentAccountId),
});

function setCurrentAccount(account: StoredAccount | null) {
  currentAccountId = account?.id ?? null;
  currentHandle = account?.handle ?? "";
}

export function createAgentForSession(account: BlueskyStoredAccount) {
  const agent = new AtpAgent({
    service: SERVICE,
    persistSession: createPersistSessionHandler(() => account.id),
  });
  return { agent, resume: () => agent.resumeSession(account.session) };
}

export function setActiveAccount(accountId: string): void {
  setActiveAccountId(accountId);
  const account = getAccountById(accountId);
  setCurrentAccount(account);
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
  const nextAccount: BlueskyStoredAccount = { id: accountId, handle, platform: "bluesky", session };
  addAccount(nextAccount);
  setCurrentAccount(nextAccount);
}

export async function hasSession(): Promise<boolean> {
  if (!browser) return false;

  const accounts = getStoredAccounts();
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

  if (!isBlueskyAccount(active)) {
    setCurrentAccount(active);
    setActiveAccountId(active.id);
    return true;
  }

  try {
    await activeAgent.resumeSession(active.session);
    setCurrentAccount(active);
    setActiveAccountId(active.id);
    return true;
  } catch {
    removeStoredAccount(active.id);
    const remain = getStoredAccounts();
    if (!remain.length) {
      setCurrentAccount(null);
      setMessage("セッションが期限切れになりました。アプリパスワードで再ログインしてください。", "warning");
      goto("/login");
      return false;
    }
    setActiveAccountId(remain[0].id);
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
    const actor = currentHandle || readAccounts().filter(isBlueskyAccount)[0]?.handle;
    if (!actor) return null;
    const { data } = await activeAgent.getProfile({ actor });
    return data;
  } catch {
    return null;
  }
}

export async function getProfileForAccount(accountId: string): Promise<{ avatar?: string | null; displayName?: string; handle?: string } | null> {
  if (!browser) return null;
  const account = getAccountById(accountId);
  if (!account) return null;

  if (isBlueskyAccount(account)) {
    try {
      const { agent, resume } = createAgentForSession(account);
      await resume();
      const { data } = await agent.getProfile({ actor: account.handle });
      return data;
    } catch {
      return null;
    }
  }

  if (isNostrAccount(account)) {
    const { refreshNostrAccountHandle } = await import("./nostr");
    const profile = await refreshNostrAccountHandle(accountId);
    if (!profile) return null;
    return {
      avatar: profile.picture,
      displayName: profile.displayName || profile.name || undefined,
      handle: account.handle,
    };
  }

  return null;
}

export async function getNotificationsForAccounts(
  accountIds: string[],
  cursorByAccount: TimelineCursorByAccount = {},
  limit = 25
): Promise<NotificationsPageResult> {
  const allAccounts = readAccounts().filter(isBlueskyAccount);
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
  const allAccounts = readAccounts().filter(isBlueskyAccount);
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
  if (!account || !isBlueskyAccount(account)) throw new Error("Account not found");

  const { agent, resume } = createAgentForSession(account);
  await resume();
  await agent.deletePost(postUri);
}

export async function postToBluesky(
  account: BlueskyStoredAccount,
  text: string,
  imageFiles: PostImageInput[] = []
): Promise<MultiPostResult> {
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

    return { accountId: account.id, handle: account.handle, platform: "bluesky", success: true };
  } catch (error) {
    return {
      accountId: account.id,
      handle: account.handle,
      platform: "bluesky",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function post(text: string, imageFiles: PostImageInput[] = []) {
  const activeId = getActiveAccountId();
  if (!activeId) throw new Error("No active account");
  const account = getAccountById(activeId);
  if (!account || !isBlueskyAccount(account)) throw new Error("Active account is not a Bluesky account");
  const result = await postToBluesky(account, text, imageFiles);
  if (!result.success) throw new Error(result.error ?? "Post failed");
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

/** @deprecated Use publishToAccounts from posting.ts instead */
export async function postToAccounts(
  text: string,
  accountIds: string[],
  imageFiles: PostImageInput[] = []
): Promise<MultiPostResult[]> {
  const { publishToAccounts } = await import("./posting");
  return publishToAccounts(text, accountIds, imageFiles);
}
