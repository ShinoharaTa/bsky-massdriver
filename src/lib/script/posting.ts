import {
  readAccounts,
  isBlueskyAccount,
  isNostrAccount,
  type StoredAccount,
} from "./accounts";
import { postToBluesky, type MultiPostResult, type PostImageInput } from "./bsky";
import { postToNostr } from "./nostr";

export type { MultiPostResult, PostImageInput };

export function extractHashtags(text: string): string[] {
  const tags = new Set<string>();
  const regex = /#([^\s#]+)/gu;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const tag = match[1].replace(/[.,!?;:）)」』】]+$/u, "").trim().toLowerCase();
    if (tag) tags.add(tag);
  }
  return [...tags];
}

export async function publishToAccounts(
  text: string,
  accountIds: string[],
  imageFiles: PostImageInput[] = []
): Promise<MultiPostResult[]> {
  const allAccounts = readAccounts();
  const targets = allAccounts.filter((a) => accountIds.includes(a.id));

  const results = await Promise.all(
    targets.map((account) => publishToSingleAccount(account, text, imageFiles))
  );

  return results;
}

async function publishToSingleAccount(
  account: StoredAccount,
  text: string,
  imageFiles: PostImageInput[]
): Promise<MultiPostResult> {
  if (isBlueskyAccount(account)) {
    return postToBluesky(account, text, imageFiles);
  }
  if (isNostrAccount(account)) {
    return postToNostr(account, text, imageFiles);
  }
  return {
    accountId: (account as StoredAccount).id,
    handle: (account as StoredAccount).handle,
    platform: (account as StoredAccount).platform,
    success: false,
    error: "Unknown platform",
  };
}
