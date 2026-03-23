/**
 * Guildex Download API
 *
 * POST /api/download
 * Body: { slug: string }
 *
 * Finds the skill/persona by slug, fetches its 5 files from GitHub,
 * increments download stats, and returns the file contents as JSON.
 */

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { httpAction, internalMutation } from "./functions";
import { corsHeaders } from "./lib/httpHeaders";
import { insertStatEvent } from "./skillStatEvents";

// ── GitHub config ────────────────────────────────────────────────────────────

const GITHUB_OWNER = "joe-qiao-ai";
const GITHUB_REPO = "guildex-ai-talent";
const GITHUB_BRANCH = "main";
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const PERSONA_FILES = ["SOUL.md", "README.md", "SKILLS.md", "EXAMPLES.md", "TESTS.md"] as const;

// ── Category → folder mapping ────────────────────────────────────────────────

const CATEGORY_FOLDER_MAP: Record<string, string> = {
  "Famous Figure Style": "famous-figures",
  Engineering: "engineering",
  "Tech & AI": "engineering",
  Marketing: "marketing",
  Design: "design",
  "Product & Strategy": "product-strategy",
  "Startup/Investment": "product-strategy",
  "Investing & Finance": "product-strategy",
  Entrepreneurship: "product-strategy",
  "Leadership & Change": "product-strategy",
  "Sales & Support": "sales-support",
  "Sales & Influence": "sales-support",
  "Game Development": "game-development",
  "Academic & Specialized": "academic-specialized",
  "Science & Learning": "academic-specialized",
  "Writing & Media": "academic-specialized",
  "Philosophy & Wisdom": "academic-specialized",
  "Performance & Mindset": "health-mindset",
  "Health & Mind": "health-mindset",
};

const ALL_CATEGORY_FOLDERS = [
  "famous-figures",
  "engineering",
  "marketing",
  "design",
  "product-strategy",
  "sales-support",
  "game-development",
  "academic-specialized",
  "health-mindset",
];

/**
 * Resolve the GitHub folder for a given categories array.
 * Returns null if nothing maps, in which case caller tries all folders.
 */
function resolveCategoryFolder(categories: string[] | undefined): string | null {
  if (!categories || categories.length === 0) return null;
  for (const cat of categories) {
    const folder = CATEGORY_FOLDER_MAP[cat];
    if (folder) return folder;
  }
  return null;
}

/**
 * Fetch a raw file from GitHub. Returns null on 404.
 */
async function fetchGitHubFile(path: string): Promise<string | null> {
  const url = `${GITHUB_RAW_BASE}/${path}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub fetch failed (${res.status}): ${url}`);
  return res.text();
}

/**
 * Try to fetch files for a persona from a specific category folder.
 * Returns the files map if at least one file was found, otherwise null.
 */
async function tryFetchPersonaFiles(
  categoryFolder: string,
  slug: string,
): Promise<Record<string, string> | null> {
  const files: Record<string, string> = {};
  let anyFound = false;

  for (const filename of PERSONA_FILES) {
    const path = `${categoryFolder}/${slug}/${filename}`;
    const content = await fetchGitHubFile(path);
    if (content !== null) {
      files[filename] = content;
      anyFound = true;
    }
  }

  return anyFound ? files : null;
}

// ── Internal mutation to bump stats ─────────────────────────────────────────

export const incrementDownloadStats = internalMutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Increment on the skill document
    const skill = await ctx.db.get(args.skillId);
    if (!skill) return;

    const currentDownloads =
      typeof skill.statsDownloads === "number" ? skill.statsDownloads : skill.stats.downloads;
    await ctx.db.patch(args.skillId, {
      statsDownloads: currentDownloads + 1,
      stats: { ...skill.stats, downloads: currentDownloads + 1 },
    });

    // 2. Increment on the skillSearchDigest
    const digest = await ctx.db
      .query("skillSearchDigest")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .unique();

    if (digest) {
      const currentDigestDownloads =
        typeof digest.statsDownloads === "number"
          ? digest.statsDownloads
          : digest.stats.downloads;
      await ctx.db.patch(digest._id, {
        statsDownloads: currentDigestDownloads + 1,
        stats: { ...digest.stats, downloads: currentDigestDownloads + 1 },
        updatedAt: now,
      });
    }

    // 3. Insert a stat event (feeds into globalStats and daily stats via cron)
    await insertStatEvent(ctx, { skillId: args.skillId, kind: "download", occurredAt: now });
  },
});

// ── HTTP action handler ───────────────────────────────────────────────────────

const cors = () => ({
  ...corsHeaders(),
  "Content-Type": "application/json",
});

export const downloadPersonaHandler = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Parse body
  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: cors(),
    });
  }

  const slug = body.slug?.trim().toLowerCase();
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug" }), {
      status: 400,
      headers: cors(),
    });
  }

  // 1. Find skill by slug
  const skillResult = await ctx.runQuery(api.skills.getBySlug, { slug });
  if (!skillResult?.skill) {
    return new Response(JSON.stringify({ error: "Skill not found" }), {
      status: 404,
      headers: cors(),
    });
  }

  const skill = skillResult.skill;

  // 2. Resolve category folder from skill categories
  const categoryFolder = resolveCategoryFolder(skill.categories);

  let files: Record<string, string> | null = null;

  if (categoryFolder) {
    // Try the mapped folder first
    files = await tryFetchPersonaFiles(categoryFolder, slug);
  }

  if (!files) {
    // Fallback: search across all category folders
    for (const folder of ALL_CATEGORY_FOLDERS) {
      if (folder === categoryFolder) continue; // already tried
      files = await tryFetchPersonaFiles(folder, slug);
      if (files) break;
    }
  }

  if (!files) {
    return new Response(
      JSON.stringify({ error: `Persona files not found in GitHub for slug: ${slug}` }),
      { status: 404, headers: cors() },
    );
  }

  // 3. Update download stats (best-effort; don't fail the download on error)
  try {
    await ctx.runMutation(internal.downloadApi.incrementDownloadStats, {
      skillId: skill._id,
    });
  } catch (err) {
    console.error("[downloadApi] Failed to update download stats:", err);
  }

  // 4. Return file contents
  const payload = {
    name: skill.displayName,
    slug,
    categories: skill.categories ?? [],
    files,
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: cors(),
  });
});
