/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { composeShareText, savePendingShare } from "./lib/share/pendingShare";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

const SHARE_TARGET_PATH = "/share-target";

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// share_target POSTs are handled by the fetch listener below, so keep them out of the navigation fallback
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/"), {
    denylist: [new RegExp(`^${SHARE_TARGET_PATH}$`)],
  })
);

self.skipWaiting();
clientsClaim();

async function handleShareTarget(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const title = String(form.get("title") ?? "");
    const text = String(form.get("text") ?? "");
    const url = String(form.get("url") ?? "");
    const files = form
      .getAll("images")
      .filter((item): item is File => item instanceof File);

    await savePendingShare({ text: composeShareText(title, text, url), files });
    return Response.redirect("/?shared=1", 303);
  } catch (err) {
    console.error(err);
    return Response.redirect("/", 303);
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === SHARE_TARGET_PATH) {
    event.respondWith(handleShareTarget(event.request));
  }
});
