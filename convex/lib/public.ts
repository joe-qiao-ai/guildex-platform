import type { Doc } from "../_generated/dataModel";
import { isPublicSkillDoc } from "./globalStats";

export type PublicUser = Pick<
  Doc<"users">,
  "_id" | "_creationTime" | "handle" | "name" | "displayName" | "image" | "bio"
>;

export type PublicSkill = Pick<
  Doc<"skills">,
  | "_id"
  | "_creationTime"
  | "slug"
  | "displayName"
  | "summary"
  | "ownerUserId"
  | "canonicalSkillId"
  | "forkOf"
  | "latestVersionId"
  | "tags"
  | "badges"
  | "stats"
  | "createdAt"
  | "updatedAt"
  // 名人分身 v2 enriched fields
  | "bio"
  | "personality"
  | "keyQuote"
  | "careerHighlights"
  | "coreSkills"
  | "featuredQuote"
  | "category"
  | "rating"
  | "trendingScore"
  | "statsDownloads"
  | "verifiedCreator"
  // AI Twin v3 fields
  | "title"
  | "categories"
  // Security scan
  | "securityScan"
>;

/**
 * Minimum set of fields needed by `hydrateResults` to filter and convert
 * a skill into a `PublicSkill`.  Both `Doc<'skills'>` and the lightweight
 * `skillSearchDigest` row (after mapping) satisfy this interface, so the
 * compiler will catch any field that drifts between them.
 */
export type HydratableSkill = Pick<
  Doc<"skills">,
  | "_id"
  | "_creationTime"
  | "slug"
  | "displayName"
  | "summary"
  | "ownerUserId"
  | "canonicalSkillId"
  | "forkOf"
  | "latestVersionId"
  | "latestVersionSummary"
  | "tags"
  | "badges"
  | "stats"
  | "statsDownloads"
  | "statsStars"
  | "statsInstallsCurrent"
  | "statsInstallsAllTime"
  | "softDeletedAt"
  | "moderationStatus"
  | "moderationFlags"
  | "moderationReason"
  | "createdAt"
  | "updatedAt"
  // 名人分身 v2 enriched fields
  | "bio"
  | "personality"
  | "keyQuote"
  | "careerHighlights"
  | "coreSkills"
  | "featuredQuote"
  | "category"
  | "rating"
  | "trendingScore"
  | "statsDownloads"
  | "verifiedCreator"
  // AI Twin v3 fields
  | "title"
  | "categories"
  // Security scan
  | "securityScan"
>;

export type PublicSoul = Pick<
  Doc<"souls">,
  | "_id"
  | "_creationTime"
  | "slug"
  | "displayName"
  | "summary"
  | "ownerUserId"
  | "latestVersionId"
  | "tags"
  | "stats"
  | "securityScan"
  | "securityScanReason"
  | "bio"
  | "tagline"
  | "personality"
  | "coreSkills"
  | "skillTags"
  | "categories"
  | "createdAt"
  | "updatedAt"
>;

export function toPublicUser(user: Doc<"users"> | null | undefined): PublicUser | null {
  if (!user || user.deletedAt || user.deactivatedAt) return null;
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    handle: user.handle,
    name: user.name,
    displayName: user.displayName,
    image: user.image,
    bio: user.bio,
  };
}

export function toPublicSkill(skill: HydratableSkill | null | undefined): PublicSkill | null {
  if (!skill) return null;
  if (!isPublicSkillDoc(skill)) return null;
  const stats = {
    downloads:
      typeof skill.statsDownloads === "number"
        ? skill.statsDownloads
        : (skill.stats?.downloads ?? 0),
    stars: typeof skill.statsStars === "number" ? skill.statsStars : (skill.stats?.stars ?? 0),
    installsCurrent:
      typeof skill.statsInstallsCurrent === "number"
        ? skill.statsInstallsCurrent
        : (skill.stats?.installsCurrent ?? 0),
    installsAllTime:
      typeof skill.statsInstallsAllTime === "number"
        ? skill.statsInstallsAllTime
        : (skill.stats?.installsAllTime ?? 0),
    versions: skill.stats?.versions ?? 0,
    comments: skill.stats?.comments ?? 0,
  };
  return {
    _id: skill._id,
    _creationTime: skill._creationTime,
    slug: skill.slug,
    displayName: skill.displayName,
    summary: skill.summary,
    ownerUserId: skill.ownerUserId,
    canonicalSkillId: skill.canonicalSkillId,
    forkOf: skill.forkOf,
    latestVersionId: skill.latestVersionId,
    tags: skill.tags,
    badges: skill.badges,
    stats,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
    // 名人分身 v2 enriched fields
    bio: skill.bio,
    personality: skill.personality,
    keyQuote: skill.keyQuote,
    careerHighlights: skill.careerHighlights,
    coreSkills: skill.coreSkills,
    featuredQuote: skill.featuredQuote,
    category: skill.category,
    rating: skill.rating,
    trendingScore: skill.trendingScore,
    statsDownloads: typeof skill.statsDownloads === "number" ? skill.statsDownloads : undefined,
    verifiedCreator: skill.verifiedCreator,
    // AI Twin v3 fields
    title: skill.title,
    categories: skill.categories,
    // Security scan
    securityScan: skill.securityScan,
  };
}

export function toPublicSoul(soul: Doc<"souls"> | null | undefined): PublicSoul | null {
  if (!soul || soul.softDeletedAt) return null;
  return {
    _id: soul._id,
    _creationTime: soul._creationTime,
    slug: soul.slug,
    displayName: soul.displayName,
    summary: soul.summary,
    ownerUserId: soul.ownerUserId,
    latestVersionId: soul.latestVersionId,
    tags: soul.tags,
    stats: soul.stats,
    securityScan: soul.securityScan,
    securityScanReason: soul.securityScanReason,
    bio: soul.bio,
    tagline: soul.tagline,
    personality: soul.personality,
    coreSkills: soul.coreSkills,
    skillTags: soul.skillTags,
    categories: soul.categories,
    createdAt: soul.createdAt,
    updatedAt: soul.updatedAt,
  };
}
