import { finalizeEvent } from "nostr-tools";
import { translate } from "../i18n";

const NIP98_AUTH_KIND = 27235;
const PROCESSING_TIMEOUT_SECONDS = 60;
const PROCESSING_POLL_MS = 1000;

type Nip96Info = {
  api_url: string;
};

type Nip96Response = {
  status: string;
  message?: string;
  processing_url?: string;
  nip94_event?: {
    tags: string[][];
  };
};

async function fetchNip96Info(origin: string): Promise<Nip96Info> {
  const url = new URL(origin);
  url.pathname = "/.well-known/nostr/nip96.json";
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(translate("error.nip96.infoFailed", { status: response.status }));
  }
  return (await response.json()) as Nip96Info;
}

function createNip98AuthEvent(
  secretKey: Uint8Array,
  apiUrl: string,
  method: string
): string {
  const event = finalizeEvent(
    {
      kind: NIP98_AUTH_KIND,
      content: "",
      tags: [
        ["u", apiUrl],
        ["method", method],
      ],
      created_at: Math.floor(Date.now() / 1000),
    },
    secretKey
  );
  return btoa(JSON.stringify(event));
}

function findTag(tags: string[][], name: string): string | undefined {
  return tags.find((t) => t[0] === name)?.[1];
}

export async function uploadToNip96(
  file: File,
  secretKey: Uint8Array,
  serverUrl: string
): Promise<string> {
  const nip96Info = await fetchNip96Info(serverUrl);
  if (!nip96Info.api_url) {
    throw new Error(translate("error.nip96.apiUrlMissing"));
  }

  const apiUrl = nip96Info.api_url;
  const method = "POST";
  const authToken = createNip98AuthEvent(secretKey, apiUrl, method);

  const form = new FormData();
  form.append("file", file);

  const response = await fetch(apiUrl, {
    method,
    headers: {
      Authorization: `Nostr ${authToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      translate("error.nip96.uploadFailed", {
        status: response.status,
        detail: errorText || response.statusText,
      })
    );
  }

  const data = (await response.json()) as Nip96Response;

  if (data.processing_url) {
    return await waitForProcessing(data.processing_url, secretKey);
  }

  const url = findTag(data.nip94_event?.tags ?? [], "url");
  if (!url) {
    throw new Error(translate("error.nip96.noUrl"));
  }
  return url;
}

async function waitForProcessing(
  processingUrl: string,
  secretKey: Uint8Array
): Promise<string> {
  const startTime = Math.floor(Date.now() / 1000);

  while (true) {
    const authToken = createNip98AuthEvent(secretKey, processingUrl, "GET");

    const res = await fetch(processingUrl, {
      headers: {
        Authorization: `Nostr ${authToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(
        translate("error.nip96.statusFailed", { status: res.status })
      );
    }

    const data = (await res.json()) as Nip96Response;

    if (data.status === "success") {
      const url = findTag(data.nip94_event?.tags ?? [], "url");
      if (!url) {
        throw new Error(translate("error.nip96.noProcessedUrl"));
      }
      return url;
    }

    if (data.status === "error") {
      throw new Error(
        translate("error.nip96.processingError", {
          reason: data.message ?? translate("common.unknownError"),
        })
      );
    }

    const elapsed = Math.floor(Date.now() / 1000) - startTime;
    if (elapsed > PROCESSING_TIMEOUT_SECONDS) {
      throw new Error(translate("error.nip96.timeout"));
    }

    await new Promise((resolve) => setTimeout(resolve, PROCESSING_POLL_MS));
  }
}
