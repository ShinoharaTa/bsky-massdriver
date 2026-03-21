import { describe, expect, it } from "vitest";
import { fitWithinBounds, renameFileExtension, formatKB, mimeLabel } from "./image";

describe("fitWithinBounds", () => {
  it("returns original dimensions when within bounds", () => {
    expect(fitWithinBounds(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });

  it("scales down landscape image by longest side", () => {
    const result = fitWithinBounds(4000, 2000, 2000);
    expect(result.width).toBe(2000);
    expect(result.height).toBe(1000);
  });

  it("scales down portrait image by longest side", () => {
    const result = fitWithinBounds(1500, 3000, 2000);
    expect(result.width).toBe(1000);
    expect(result.height).toBe(2000);
  });

  it("scales down square image", () => {
    const result = fitWithinBounds(4000, 4000, 2000);
    expect(result.width).toBe(2000);
    expect(result.height).toBe(2000);
  });

  it("returns at least 1x1", () => {
    const result = fitWithinBounds(10000, 1, 100);
    expect(result.width).toBe(100);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe("renameFileExtension", () => {
  it("renames .png to .jpg for JPEG type", () => {
    expect(renameFileExtension("photo.png", "image/jpeg")).toBe("photo.jpg");
  });

  it("renames .jpg to .webp for WebP type", () => {
    expect(renameFileExtension("photo.jpg", "image/webp")).toBe("photo.webp");
  });

  it("keeps original name for PNG type", () => {
    expect(renameFileExtension("photo.png", "image/png")).toBe("photo.png");
  });

  it("handles filenames without extension", () => {
    expect(renameFileExtension("photo", "image/jpeg")).toBe("photo.jpg");
  });

  it("handles filenames with multiple dots", () => {
    expect(renameFileExtension("my.vacation.photo.png", "image/jpeg")).toBe(
      "my.vacation.photo.jpg",
    );
  });
});

describe("formatKB", () => {
  it("formats bytes to KB with 2 decimal places", () => {
    expect(formatKB(1024)).toBe("1.00");
    expect(formatKB(1_000_000)).toBe("976.56");
    expect(formatKB(512)).toBe("0.50");
  });

  it("formats 0 bytes", () => {
    expect(formatKB(0)).toBe("0.00");
  });
});

describe("mimeLabel", () => {
  it("returns JPEG for image/jpeg", () => {
    expect(mimeLabel("image/jpeg")).toBe("JPEG");
  });

  it("returns WebP for image/webp", () => {
    expect(mimeLabel("image/webp")).toBe("WebP");
  });

  it("returns PNG for image/png", () => {
    expect(mimeLabel("image/png")).toBe("PNG");
  });

  it("returns fallback for unknown types", () => {
    expect(mimeLabel("image/gif")).toBe("画像");
  });
});
