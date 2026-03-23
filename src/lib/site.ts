export type SiteMode = "skills" | "souls";

import { getRuntimeEnv } from "./runtimeEnv";

const DEFAULT_CLAWHUB_SITE_URL = "https://guildex.ai";
const DEFAULT_ONLYCRABS_SITE_URL = "https://onlycrabs.ai";
const DEFAULT_ONLYCRABS_HOST = "onlycrabs.ai";
const LEGACY_CLAWDHUB_HOSTS = new Set(["clawdhub.com", "www.clawdhub.com", "auth.clawdhub.com"]);

export function normalizeClawHubSiteOrigin(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (LEGACY_CLAWDHUB_HOSTS.has(url.hostname.toLowerCase())) {
      return DEFAULT_CLAWHUB_SITE_URL;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getClawHubSiteUrl() {
  return normalizeClawHubSiteOrigin(getRuntimeEnv("VITE_SITE_URL")) ?? DEFAULT_CLAWHUB_SITE_URL;
}

export function getOnlyCrabsSiteUrl() {
  const explicit = getRuntimeEnv("VITE_SOULHUB_SITE_URL");
  if (explicit) return explicit;

  const siteUrl = getRuntimeEnv("VITE_SITE_URL");
  if (siteUrl) {
    try {
      const url = new URL(siteUrl);
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "0.0.0.0"
      ) {
        return url.origin;
      }
    } catch {
      // ignore invalid URLs, fall through to default
    }
  }

  return DEFAULT_ONLYCRABS_SITE_URL;
}

export function getOnlyCrabsHost() {
  return getRuntimeEnv("VITE_SOULHUB_HOST") ?? DEFAULT_ONLYCRABS_HOST;
}

export function detectSiteMode(host?: string | null): SiteMode {
  if (!host) return "skills";
  const onlyCrabsHost = getOnlyCrabsHost().toLowerCase();
  const lower = host.toLowerCase();
  if (lower === onlyCrabsHost || lower.endsWith(`.${onlyCrabsHost}`)) return "souls";
  return "skills";
}

export function detectSiteModeFromUrl(value?: string | null): SiteMode {
  if (!value) return "skills";
  try {
    const host = new URL(value).hostname;
    return detectSiteMode(host);
  } catch {
    return detectSiteMode(value);
  }
}

export function getSiteMode(): SiteMode {
  if (typeof window !== "undefined") {
    return detectSiteMode(window.location.hostname);
  }
  const forced = getRuntimeEnv("VITE_SITE_MODE");
  if (forced === "souls" || forced === "skills") return forced;

  const onlyCrabsSite = getRuntimeEnv("VITE_SOULHUB_SITE_URL");
  if (onlyCrabsSite) return detectSiteModeFromUrl(onlyCrabsSite);

  const siteUrl = getRuntimeEnv("VITE_SITE_URL") ?? process.env.SITE_URL;
  if (siteUrl) return detectSiteModeFromUrl(siteUrl);

  return "skills";
}

export function getSiteName(mode: SiteMode = getSiteMode()) {
  return mode === "souls" ? "Guildex" : "Guildex";
}

export function getSiteDescription(mode: SiteMode = getSiteMode()) {
  return "Guildex is the AI Talent Network. Find the AI talent you need. Get their real expertise and judgment.";
}

export function getSiteOgDescription(_mode: SiteMode = getSiteMode()) {
  return "Browse, download, and deploy AI talent built on real expertise and real personality. Not generic AI.";
}

export function getSiteOgTitle(_mode: SiteMode = getSiteMode()) {
  return "Guildex · The AI Talent Network";
}

export function getSiteUrlForMode(mode: SiteMode = getSiteMode()) {
  return mode === "souls" ? getOnlyCrabsSiteUrl() : getClawHubSiteUrl();
}
