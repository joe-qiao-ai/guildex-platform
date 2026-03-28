/**
 * Guildex Download API
 *
 * POST /api/download
 * Body: { slug: string }
 *
 * Finds the skill/persona by slug, returns its file contents from DB as JSON.
 * The frontend uses fflate to bundle these into a real ZIP for download.
 */

import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { httpAction, internalMutation, internalQuery } from "./functions";
import { corsHeaders } from "./lib/httpHeaders";
import { insertStatEvent } from "./skillStatEvents";

// ── Internal query to fetch persona file contents ────────────────────────────

export const getPersonaFiles = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const skill = await ctx.db
      .query("skills")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!skill) return null;
    return {
      _id: skill._id,
      displayName: skill.displayName,
      categories: (skill as any).categories ?? [],
      soulContent: (skill as any).soulContent as string | undefined,
      readmeContent: (skill as any).readmeContent as string | undefined,
      skillsContent: (skill as any).skillsContent as string | undefined,
      examplesContent: (skill as any).examplesContent as string | undefined,
      testsContent: (skill as any).testsContent as string | undefined,
      summary: skill.summary,
      bio: (skill as any).bio as string | undefined,
    };
  },
});

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

  // 1. Find skill by slug (use internal query to get content fields)
  const skill = await ctx.runQuery(internal.downloadApi.getPersonaFiles, { slug });
  if (!skill) {
    return new Response(JSON.stringify({ error: "Skill not found" }), {
      status: 404,
      headers: cors(),
    });
  }

  // 2. Build files map from stored DB content fields
  const files: Record<string, string> = {};
  if (skill.soulContent) files["SOUL.md"] = skill.soulContent;
  if (skill.readmeContent) files["README.md"] = skill.readmeContent;
  if (skill.skillsContent) files["SKILLS.md"] = skill.skillsContent;
  if (skill.examplesContent) files["EXAMPLES.md"] = skill.examplesContent;
  if (skill.testsContent) files["TESTS.md"] = skill.testsContent;

  // Fallback: use summary/bio if no content stored
  if (Object.keys(files).length === 0) {
    const fallback = skill.summary ?? skill.bio ?? "No content available.";
    files["SOUL.md"] = fallback;
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
