/**
 * AI credentials must stay on the server. Never expose them through VITE_ variables.
 */

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE?: string;
  }
}

export function getAiApiUrl(): string {
  const path = "/api/public/chat";
  if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
    return `${window.location.origin}${path}`;
  }
  const apiBase = import.meta.env.VITE_API_BASE?.trim().replace(/\/+$/, "");
  if (!apiBase) {
    throw new Error("Set VITE_API_BASE to your hosted Noor Habit server URL for the Android app.");
  }
  return `${apiBase}${path}`;
}
