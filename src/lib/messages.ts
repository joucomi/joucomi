import { Message } from "./types";

export function sendMessage(message: Message): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

export function onMessage(
  handler: (
    message: Message,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => boolean | void
): void {
  chrome.runtime.onMessage.addListener(handler);
}
