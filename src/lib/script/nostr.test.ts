import { describe, expect, it } from "vitest";
import { deriveNostrKeys, shortenNpub } from "./nostr";
import { generateSecretKey } from "nostr-tools";
import { nsecEncode } from "nostr-tools/nip19";

describe("deriveNostrKeys", () => {
  it("derives pubkey and npub from nsec format", () => {
    const sk = generateSecretKey();
    const nsec = nsecEncode(sk);
    const keys = deriveNostrKeys(nsec);

    expect(keys.pubkey).toHaveLength(64);
    expect(keys.npub).toMatch(/^npub1/);
    expect(keys.secretKey).toBeInstanceOf(Uint8Array);
    expect(keys.secretKey).toHaveLength(32);
  });

  it("derives consistent keys for the same nsec", () => {
    const sk = generateSecretKey();
    const nsec = nsecEncode(sk);

    const keys1 = deriveNostrKeys(nsec);
    const keys2 = deriveNostrKeys(nsec);

    expect(keys1.pubkey).toBe(keys2.pubkey);
    expect(keys1.npub).toBe(keys2.npub);
  });

  it("throws on invalid nsec", () => {
    expect(() => deriveNostrKeys("invalid")).toThrow();
  });
});

describe("shortenNpub", () => {
  it("shortens a long npub", () => {
    const npub = "npub1abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuv";
    const shortened = shortenNpub(npub);
    expect(shortened).toMatch(/^npub1abcde/);
    expect(shortened).toContain("...");
    expect(shortened.length).toBeLessThan(npub.length);
  });

  it("returns short strings unchanged", () => {
    expect(shortenNpub("npub1short")).toBe("npub1short");
  });
});
