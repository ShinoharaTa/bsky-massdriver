import { writable } from 'svelte/store';

export const isLoading = writable(false);
export const urlQuery = writable("");
export const message = writable("")

export function setMessage (value: string) {
  message.set(value);
}
