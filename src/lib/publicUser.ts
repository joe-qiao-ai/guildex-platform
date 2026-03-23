import type { Doc } from "../../convex/_generated/dataModel";

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
  | "bio"
  | "personality"
  | "keyQuote"
  | "careerHighlights"
  | "coreSkills"
  | "featuredQuote"
  | "category"
  | "rating"
  | "statsDownloads"
  | "trendingScore"
  | "verifiedCreator"
  | "title"
  | "categories"
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
