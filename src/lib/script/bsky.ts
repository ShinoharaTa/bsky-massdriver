// src/lib/auth.ts
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

import { BskyAgent, RichText } from '@atproto/api';
import type { AtpSessionData } from '@atproto/api';
import { setMessage } from '../../stores/MassDriver';

let self: any
const agent = new BskyAgent({
  service: 'https://bsky.social',
  persistSession: (evt, sess) => {
    localStorage.setItem("sess", JSON.stringify(sess))
  },
})

export async function login(username: string, password: string): Promise<void> {
  if (browser) {
    self = await agent.login({
      identifier: username,
      password: password
    })
    return;
  }
}

export async function hasSession(): Promise<boolean> {
  if (browser) {
    let session = localStorage.getItem("sess") ?? null;
    if (!session) {
      localStorage.removeItem('sess');
      self = null;
      setMessage("Please Login.");
      goto('/login');
      return false;
    }
    try {
      let sess: AtpSessionData = JSON.parse(session);
      const { data } = await agent.resumeSession(sess)
      self = data
    } catch {
      self = null;
      setMessage("Please Login.");
      goto('/login');
      return false;
    }
    return true;
  }
  return false
}

export function logout(): void {
  if (browser) {
    localStorage.removeItem('sess');
    self = null;
    goto('/login');
  }
}

// 周りの実装

export async function post(text: string) {
  const rt = new RichText({ text });
  await rt.detectFacets(agent);
  console.log(rt);
  await agent.post({
    $type: "app.bsky.feed.post",
    text: rt.text,
    facets: rt.facets,
  });
}
