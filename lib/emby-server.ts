const getConfig = () => {
  const rawUrl = (process.env.EMBY_SERVER_URL || "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.EMBY_API_KEY || "").trim();
  const userId = (process.env.EMBY_USER_ID || "").trim();

  if (!rawUrl || !apiKey) {
    throw new Error("Emby is not configured. Set EMBY_SERVER_URL and EMBY_API_KEY in the server environment.");
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("EMBY_SERVER_URL must be a valid URL.");
  }

  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
    throw new Error("Emby must use HTTPS outside local development.");
  }
  if (url.username || url.password) {
    throw new Error("Do not put credentials in EMBY_SERVER_URL.");
  }

  return { baseUrl: url.toString().replace(/\/+$/, ""), apiKey, userId };
};

export async function embyFetch(path: string, init: RequestInit = {}) {
  const config = getConfig();
  const endpoint = new URL(path.replace(/^\/+/, ""), config.baseUrl + "/");
  if (endpoint.origin !== new URL(config.baseUrl).origin) {
    throw new Error("Invalid Emby endpoint.");
  }

  const headers = new Headers(init.headers);
  headers.set("X-Emby-Token", config.apiKey);
  headers.set("Accept", "application/json");
  return fetch(endpoint, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal || AbortSignal.timeout(12000),
  });
}

export function getEmbyUserId() {
  return getConfig().userId;
}

export function embyIsConfigured() {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}
