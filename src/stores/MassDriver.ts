import { writable } from 'svelte/store';

export type MessageType = "info" | "success" | "warning" | "error";

export const isLoading = writable(false);
export const urlQuery = writable("");
export const message = writable("");
export const messageType = writable<MessageType>("info");

export function setMessage(value: string, type: MessageType = "info") {
  messageType.set(type);
  message.set(value);
}
