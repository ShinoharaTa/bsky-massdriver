import { browser } from "$app/environment";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import { decode as nip19Decode, npubEncode, nsecEncode } from "nostr-tools/nip19";
import { SimplePool } from "nostr-tools";
import { hexToBytes } from "nostr-tools/utils";
import type { NostrStoredAccount } from "./accounts";
import { readAccounts, writeAccounts, isNostrAccount } from "./accounts";
import type { MultiPostResult, PostImageInput } from "./bsky";
import { uploadToNip96 } from "./nip96";

export const DEFAULT_RELAYS = [
  "wss://relay-jp.nostr.wirednet.jp/",
  "wss://yabu.me/",
  "wss://r.kojira.io/",
  "wss://nrelay-jp.c-stellar.net/",
  "wss://relay.nostr.band/",
  "wss://nos.lol/",
  "wss://relay.damus.io/",
];

export const DEFAULT_MEDIA_SERVER = "https://nostrcheck.me";

export const MEDIA_SERVERS = [
  "https://nostrcheck.me",
  "https://nostr.build",
  "https://files.sovbit.host",
  "https://nostpic.com",
  "https://yabu.me",
];

const NOSTR_RELAYS_KEY = "nostrRelays";
const NOSTR_MEDIA_SERVER_KEY = "nostrMediaServer";
const PUBLISH_TIMEOUT_MS = 15_000;
const PROFILE_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Relay management (client-level, stored on device)
// ---------------------------------------------------------------------------

export function getNostrRelays(): string[] {
  if (!browser) return DEFAULT_RELAYS;
  const raw = localStorage.getItem(NOSTR_RELAYS_KEY);
  if (!raw) return DEFAULT_RELAYS;
  try {
    const relays = JSON.parse(raw) as string[];
    return relays.length > 0 ? relays : DEFAULT_RELAYS;
  } catch {
    return DEFAULT_RELAYS;
  }
}

export function setNostrRelays(relays: string[]): void {
  if (!browser) return;
  localStorage.setItem(NOSTR_RELAYS_KEY, JSON.stringify(relays));
}

// ---------------------------------------------------------------------------
// Media server management (NIP-96, client-level, stored on device)
// ---------------------------------------------------------------------------

export function getNostrMediaServer(): string {
  if (!browser) return DEFAULT_MEDIA_SERVER;
  return localStorage.getItem(NOSTR_MEDIA_SERVER_KEY) || DEFAULT_MEDIA_SERVER;
}

export function setNostrMediaServer(server: string): void {
  if (!browser) return;
  localStorage.setItem(NOSTR_MEDIA_SERVER_KEY, server);
}

// ---------------------------------------------------------------------------
// Key utilities
// ---------------------------------------------------------------------------

export function nsecToHex(nsec: string): Uint8Array {
  if (nsec.startsWith("nsec1")) {
    const decoded = nip19Decode(nsec);
    if (decoded.type !== "nsec") throw new Error("Invalid nsec key");
    return decoded.data;
  }
  return hexToBytes(nsec);
}

export function deriveNostrKeys(nsec: string): { secretKey: Uint8Array; pubkey: string; npub: string } {
  const secretKey = nsecToHex(nsec);
  const pubkey = getPublicKey(secretKey);
  const npub = npubEncode(pubkey);
  return { secretKey, pubkey, npub };
}

export function shortenNpub(npub: string): string {
  if (npub.length <= 20) return npub;
  return `${npub.slice(0, 10)}...${npub.slice(-6)}`;
}

export function formatNsec(secretKeyBytes: Uint8Array): string {
  return nsecEncode(secretKeyBytes);
}

// ---------------------------------------------------------------------------
// Kind:0 profile
// ---------------------------------------------------------------------------

export type NostrProfile = {
  name: string | null;
  displayName: string | null;
  picture: string | null;
  about: string | null;
  nip05: string | null;
};

export async function getNostrProfile(pubkey: string): Promise<NostrProfile | null> {
  const pool = new SimplePool();
  const relays = getNostrRelays();

  try {
    const event = await Promise.race([
      pool.get(relays, { kinds: [0], authors: [pubkey] }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PROFILE_TIMEOUT_MS)),
    ]);

    if (!event) return null;

    const content = JSON.parse(event.content) as Record<string, unknown>;
    return {
      name: typeof content.name === "string" ? content.name : null,
      displayName: typeof content.display_name === "string" ? content.display_name : null,
      picture: typeof content.picture === "string" ? content.picture : null,
      about: typeof content.about === "string" ? content.about : null,
      nip05: typeof content.nip05 === "string" ? content.nip05 : null,
    };
  } catch {
    return null;
  } finally {
    pool.destroy();
  }
}

/**
 * Fetches the kind:0 profile and updates the stored account handle
 * with the display name if available.
 */
export async function refreshNostrAccountHandle(accountId: string): Promise<NostrProfile | null> {
  const accounts = readAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account || !isNostrAccount(account)) return null;

  const profile = await getNostrProfile(account.pubkey);
  if (!profile) return null;

  const displayName = profile.displayName || profile.name;
  if (displayName && displayName !== account.handle) {
    const updated = accounts.map((a) =>
      a.id === accountId ? { ...a, handle: displayName } : a
    );
    writeAccounts(updated);
  }

  return profile;
}

// ---------------------------------------------------------------------------
// Posting
// ---------------------------------------------------------------------------

export async function postToNostr(
  account: NostrStoredAccount,
  text: string,
  imageFiles: PostImageInput[] = []
): Promise<MultiPostResult> {
  const pool = new SimplePool();
  try {
    const secretKey = nsecToHex(account.nsec);
    let content = text;
    const tags: string[][] = [];

    if (imageFiles.length > 0) {
      const uploadedUrls = await Promise.all(
        imageFiles.map((img) => uploadToNip96(img.file, secretKey, getNostrMediaServer()))
      );

      for (let i = 0; i < uploadedUrls.length; i++) {
        const url = uploadedUrls[i];
        const img = imageFiles[i];
        content += `\n${url}`;
        const imetaParts = [`url ${url}`];
        if (img.file.type) imetaParts.push(`m ${img.file.type}`);
        if (img.width && img.height) imetaParts.push(`dim ${img.width}x${img.height}`);
        if (img.alt) imetaParts.push(`alt ${img.alt}`);
        tags.push(["imeta", ...imetaParts]);
      }
    }

    const hashtags = extractHashtagsFromContent(content);
    for (const tag of hashtags) {
      tags.push(["t", tag]);
    }

    const event = finalizeEvent(
      {
        kind: 1,
        content,
        tags,
        created_at: Math.floor(Date.now() / 1000),
      },
      secretKey
    );

    const relays = getNostrRelays();
    const perRelayPromises = pool.publish(relays, event);

    const publishResults = await Promise.allSettled(
      perRelayPromises.map((p, i) =>
        Promise.race([
          p.then(() => relays[i]),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${relays[i]}`)), PUBLISH_TIMEOUT_MS)
          ),
        ])
      )
    );

    const succeeded = publishResults.filter(
      (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
    );

    if (succeeded.length === 0) {
      const firstError = publishResults.find(
        (r): r is PromiseRejectedResult => r.status === "rejected"
      );
      throw new Error(firstError?.reason?.message ?? "全てのリレーへの送信に失敗しました");
    }

    return {
      accountId: account.id,
      handle: account.handle,
      platform: "nostr",
      success: true,
    };
  } catch (error) {
    return {
      accountId: account.id,
      handle: account.handle,
      platform: "nostr",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    pool.destroy();
  }
}

function extractHashtagsFromContent(text: string): string[] {
  const tags = new Set<string>();
  const regex = /#([^\s#]+)/gu;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const tag = match[1].replace(/[.,!?;:）)」』】]+$/u, "").trim().toLowerCase();
    if (tag) tags.add(tag);
  }
  return [...tags];
}
