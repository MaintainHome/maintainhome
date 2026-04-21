import { Capacitor } from "@capacitor/core";

const PROD_API_BASE = "https://maintainhome.ai";

const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const API_BASE: string = isNative() ? PROD_API_BASE : "";

export const apiUrl = (path: string): string => {
  if (!path) return API_BASE || "/";
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path;
  return path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
};

let installed = false;

export function installNativeFetchRewrite(): void {
  if (installed) return;
  installed = true;

  if (!isNative() || typeof window === "undefined" || !window.fetch) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      let rewritten: RequestInfo | URL = input;

      if (typeof input === "string") {
        if (input.startsWith("/")) {
          rewritten = `${PROD_API_BASE}${input}`;
        }
      } else if (input instanceof URL) {
        if (
          input.protocol === "capacitor:" ||
          input.hostname === "localhost"
        ) {
          rewritten = new URL(
            input.pathname + input.search + input.hash,
            PROD_API_BASE,
          );
        }
      } else if (input instanceof Request) {
        try {
          const u = new URL(input.url);
          if (
            u.protocol === "capacitor:" ||
            u.hostname === "localhost"
          ) {
            const newUrl = new URL(
              u.pathname + u.search + u.hash,
              PROD_API_BASE,
            ).toString();
            rewritten = new Request(newUrl, input);
          }
        } catch {
          /* not a parseable URL, leave it alone */
        }
      }

      const nextInit: RequestInit = {
        credentials: "include",
        ...(init || {}),
      };

      return originalFetch(rewritten, nextInit);
    } catch {
      return originalFetch(input, init);
    }
  }) as typeof window.fetch;

  console.log(
    `[Capacitor] Running in native mode — using production API: ${PROD_API_BASE}`,
  );
}
