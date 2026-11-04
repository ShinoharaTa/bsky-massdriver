// Fallback for share_target. The Service Worker normally handles the POST, so this is
// only reached when the page is not controlled by the SW. Images are dropped; only text is passed on to `/`.
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const prerender = false;

export const POST: RequestHandler = async ({ request }) => {
  const params = new URLSearchParams();
  try {
    const form = await request.formData();
    for (const key of ["title", "text", "url"]) {
      const value = form.get(key);
      if (typeof value === "string" && value) params.set(key, value);
    }
  } catch (err) {
    console.error(err);
  }

  const query = params.toString();
  redirect(303, query ? `/?${query}` : "/");
};

export const GET: RequestHandler = () => {
  redirect(303, "/");
};
