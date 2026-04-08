import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("$app/environment", () => ({ browser: true }));

const mockStorage = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

const cryptoMock = { randomUUID: () => "test-uuid-1234" };
Object.defineProperty(globalThis, "crypto", { value: cryptoMock, writable: true });

import {
  readAccounts,
  writeAccounts,
  getAccountById,
  getStoredAccounts,
  addAccount,
  removeStoredAccount,
  isBlueskyAccount,
  isNostrAccount,
  type StoredAccount,
  type BlueskyStoredAccount,
  type NostrStoredAccount,
} from "./accounts";

const blueskyAccount: BlueskyStoredAccount = {
  id: "did:plc:abc",
  handle: "alice.bsky.social",
  platform: "bluesky",
  session: { did: "did:plc:abc", handle: "alice.bsky.social" } as any,
};

const nostrAccount: NostrStoredAccount = {
  id: "hex-pubkey-123",
  handle: "npub1abc...xyz",
  platform: "nostr",
  nsec: "nsec1test",
  pubkey: "hex-pubkey-123",
};

beforeEach(() => {
  mockStorage.clear();
});

describe("readAccounts / writeAccounts", () => {
  it("returns empty array when no data", () => {
    expect(readAccounts()).toEqual([]);
  });

  it("round-trips accounts", () => {
    writeAccounts([blueskyAccount, nostrAccount]);
    const result = readAccounts();
    expect(result).toHaveLength(2);
    expect(result[0].platform).toBe("bluesky");
    expect(result[1].platform).toBe("nostr");
  });
});

describe("legacy account migration", () => {
  it("adds platform: bluesky to accounts without platform field", () => {
    const legacyAccounts = [
      { id: "did:plc:old", handle: "old.bsky.social", session: { did: "did:plc:old", handle: "old.bsky.social" } },
    ];
    mockStorage.set("accounts", JSON.stringify(legacyAccounts));

    const accounts = readAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].platform).toBe("bluesky");
    expect(accounts[0].id).toBe("did:plc:old");
  });

  it("migrates legacy single-session storage", () => {
    const legacySession = { did: "did:plc:legacy", handle: "legacy.bsky.social" };
    mockStorage.set("sess", JSON.stringify(legacySession));

    const accounts = getStoredAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].platform).toBe("bluesky");
    expect(accounts[0].id).toBe("did:plc:legacy");
    expect(mockStorage.has("sess")).toBe(false);
  });
});

describe("addAccount", () => {
  it("adds a new account", () => {
    addAccount(blueskyAccount);
    const accounts = readAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe(blueskyAccount.id);
  });

  it("replaces existing account with same id", () => {
    addAccount(blueskyAccount);
    const updated = { ...blueskyAccount, handle: "alice-updated.bsky.social" };
    addAccount(updated);
    const accounts = readAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].handle).toBe("alice-updated.bsky.social");
  });

  it("supports mixed Bluesky and Nostr accounts", () => {
    addAccount(blueskyAccount);
    addAccount(nostrAccount);
    const accounts = readAccounts();
    expect(accounts).toHaveLength(2);
    expect(accounts.map((a) => a.platform)).toEqual(["bluesky", "nostr"]);
  });
});

describe("removeStoredAccount", () => {
  it("removes the specified account", () => {
    writeAccounts([blueskyAccount, nostrAccount]);
    removeStoredAccount(blueskyAccount.id);
    const remaining = readAccounts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(nostrAccount.id);
  });
});

describe("getAccountById", () => {
  it("returns null for unknown id", () => {
    expect(getAccountById("nonexistent")).toBeNull();
  });

  it("finds Bluesky account", () => {
    writeAccounts([blueskyAccount, nostrAccount]);
    const found = getAccountById(blueskyAccount.id);
    expect(found?.platform).toBe("bluesky");
  });

  it("finds Nostr account", () => {
    writeAccounts([blueskyAccount, nostrAccount]);
    const found = getAccountById(nostrAccount.id);
    expect(found?.platform).toBe("nostr");
  });
});

describe("type guards", () => {
  it("isBlueskyAccount", () => {
    expect(isBlueskyAccount(blueskyAccount)).toBe(true);
    expect(isBlueskyAccount(nostrAccount)).toBe(false);
  });

  it("isNostrAccount", () => {
    expect(isNostrAccount(nostrAccount)).toBe(true);
    expect(isNostrAccount(blueskyAccount)).toBe(false);
  });
});
