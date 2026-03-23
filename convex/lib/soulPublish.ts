import { ConvexError } from "convex/values";
import semver from "semver";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { generateEmbedding } from "./embeddings";
import { requireGitHubAccountAge } from "./githubAccount";
import {
  buildEmbeddingText,
  getFrontmatterMetadata,
  getFrontmatterValue,
  hashSkillFiles,
  isMacJunkPath,
  isTextFile,
  parseFrontmatter,
  sanitizePath,
} from "./skills";
import { generateSoulChangelogForPublish } from "./soulChangelog";

const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

const MAX_SUMMARY_LENGTH = 160;

function deriveSoulSummary(readmeText: string) {
  const lines = readmeText.split(/\r?\n/);
  let inFrontmatter = false;
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!inFrontmatter && trimmed === "---") {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === "---") {
        inFrontmatter = false;
      }
      continue;
    }
    const cleaned = trimmed.replace(/^#+\s*/, "");
    if (!cleaned) continue;
    if (cleaned.length > MAX_SUMMARY_LENGTH) {
      return `${cleaned.slice(0, MAX_SUMMARY_LENGTH - 3).trimEnd()}...`;
    }
    return cleaned;
  }
  return undefined;
}

export type PublishResult = {
  soulId: Id<"souls">;
  versionId: Id<"soulVersions">;
  embeddingId: Id<"soulEmbeddings">;
};

export type PublishVersionArgs = {
  slug: string;
  displayName: string;
  version: string;
  changelog: string;
  tags?: string[];
  source?: {
    kind: "github";
    url: string;
    repo: string;
    ref: string;
    commit: string;
    path: string;
    importedAt: number;
  };
  files: Array<{
    path: string;
    size: number;
    storageId: Id<"_storage">;
    sha256: string;
    contentType?: string;
  }>;
};

export async function publishSoulVersionForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
  args: PublishVersionArgs,
): Promise<PublishResult> {
  const version = args.version.trim();
  const slug = args.slug.trim().toLowerCase();
  const displayName = args.displayName.trim();
  if (!slug || !displayName) throw new ConvexError("Slug and display name required");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new ConvexError("Slug must be lowercase and url-safe");
  }
  if (!semver.valid(version)) {
    throw new ConvexError("Version must be valid semver");
  }

  await requireGitHubAccountAge(ctx, userId);

  const suppliedChangelog = args.changelog.trim();
  const changelogSource = suppliedChangelog ? ("user" as const) : ("auto" as const);

  const sanitizedFiles = args.files.map((file) => {
    const path = sanitizePath(file.path);
    if (!path) throw new ConvexError("Invalid file paths");
    return { ...file, path };
  });
  const publishFiles = sanitizedFiles.filter((file) => !isMacJunkPath(file.path));
  if (publishFiles.some((file) => !isTextFile(file.path, file.contentType ?? undefined))) {
    throw new ConvexError("Only text-based files are allowed");
  }

  const totalBytes = publishFiles.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new ConvexError("Soul bundle exceeds 50MB limit");
  }

  const isSoulFile = (path: string) => path.toLowerCase() === "soul.md";
  const isReadmeFile = (path: string) => path.toLowerCase() === "readme.md";
  const soulFile = publishFiles.find((file) => isSoulFile(file.path));
  if (!soulFile) throw new ConvexError("SOUL.md is required");

  // Allow README.md and other text files alongside SOUL.md
  const readmeFile = publishFiles.find((file) => isReadmeFile(file.path));
  const nonSoulFiles = publishFiles.filter((file) => !isSoulFile(file.path));

  const readmeText = await fetchText(ctx, soulFile.storageId);
  const readmeMdText = readmeFile ? await fetchText(ctx, readmeFile.storageId) : null;

  // Extract metadata: prefer README.md frontmatter, fall back to SOUL.md
  const frontmatter = parseFrontmatter(readmeMdText ?? readmeText);
  const soulFrontmatter = parseFrontmatter(readmeText);
  const summary =
    getFrontmatterValue(frontmatter, "tagline") ??
    getFrontmatterValue(frontmatter, "description") ??
    (readmeMdText ? deriveSoulSummary(readmeMdText) : deriveSoulSummary(readmeText));
  const metadata = mergeSourceIntoMetadata(getFrontmatterMetadata(frontmatter), args.source);

  const otherFileTexts: Array<{ path: string; content: string }> = [];
  for (const file of nonSoulFiles.slice(0, 5)) {
    try {
      const content = await fetchText(ctx, file.storageId);
      otherFileTexts.push({ path: file.path, content });
    } catch {
      // ignore read errors for extra files
    }
  }

  const embeddingText = buildEmbeddingText({
    frontmatter: { ...soulFrontmatter, ...frontmatter },
    readme: readmeMdText ?? readmeText,
    otherFiles: otherFileTexts,
  });

  const fingerprint = await hashSkillFiles(
    publishFiles.map((file) => ({
      path: file.path,
      sha256: file.sha256,
    })),
  );

  const changelogPromise =
    changelogSource === "user"
      ? Promise.resolve(suppliedChangelog)
      : generateSoulChangelogForPublish(ctx, {
          slug,
          version,
          readmeText: readmeMdText ?? readmeText,
          files: publishFiles.map((file) => ({ path: file.path, sha256: file.sha256 })),
        });

  const embeddingPromise = generateEmbedding(embeddingText);

  const [changelogText, embedding] = await Promise.all([
    changelogPromise,
    embeddingPromise.catch((error) => {
      throw new ConvexError(formatEmbeddingError(error));
    }),
  ]);

  // Extract metadata fields from README.md frontmatter
  const bioVal = getFrontmatterValue(frontmatter, "bio");
  const taglineVal = getFrontmatterValue(frontmatter, "tagline") ?? getFrontmatterValue(frontmatter, "description");
  const personalityVal = getFrontmatterValue(soulFrontmatter, "personality") ?? getFrontmatterValue(soulFrontmatter, "description");
  const coreSkillsVal = getFrontmatterValue(frontmatter, "coreSkills");
  const skillTagsVal = getFrontmatterValue(frontmatter, "skillTags") ?? getFrontmatterValue(frontmatter, "tags");
  const categoriesVal = getFrontmatterValue(frontmatter, "categories");

  const publishResult = (await ctx.runMutation(internal.souls.insertVersion, {
    userId,
    slug,
    displayName,
    version,
    changelog: changelogText,
    changelogSource,
    tags: args.tags?.map((tag) => tag.trim()).filter(Boolean),
    fingerprint,
    files: publishFiles,
    parsed: {
      frontmatter: { ...soulFrontmatter, ...frontmatter },
      metadata,
    },
    summary,
    bio: typeof bioVal === "string" ? bioVal : undefined,
    tagline: typeof taglineVal === "string" ? taglineVal : undefined,
    personality: typeof personalityVal === "string" ? personalityVal : undefined,
    coreSkills: Array.isArray(coreSkillsVal) ? coreSkillsVal.map(String) : undefined,
    skillTags: Array.isArray(skillTagsVal) ? skillTagsVal.map(String) : undefined,
    categories: Array.isArray(categoriesVal) ? categoriesVal.map(String) : undefined,
    embedding,
  })) as PublishResult;

  const owner = (await ctx.runQuery(internal.users.getByIdInternal, {
    userId,
  })) as Doc<"users"> | null;
  const ownerHandle = owner?.handle ?? owner?.name ?? userId;

  void ctx.scheduler
    .runAfter(0, internal.githubSoulBackupsNode.backupSoulForPublishInternal, {
      slug,
      version,
      displayName,
      ownerHandle,
      files: publishFiles,
      publishedAt: Date.now(),
    })
    .catch((error) => {
      console.error("GitHub soul backup scheduling failed", error);
    });

  // Trigger security scan asynchronously
  void ctx.scheduler
    .runAfter(0, internal.securityScan.runSoulSecurityScan, {
      soulId: publishResult.soulId,
      soulMdContent: readmeText,
    })
    .catch((error) => {
      console.error("Security scan scheduling failed", error);
    });

  return publishResult;
}

function mergeSourceIntoMetadata(metadata: unknown, source: PublishVersionArgs["source"]) {
  if (!source) return metadata === undefined ? undefined : metadata;
  const sourceValue = {
    kind: source.kind,
    url: source.url,
    repo: source.repo,
    ref: source.ref,
    commit: source.commit,
    path: source.path,
    importedAt: source.importedAt,
  };

  if (!metadata) return { source: sourceValue };
  if (typeof metadata !== "object" || Array.isArray(metadata)) return { source: sourceValue };
  return { ...(metadata as Record<string, unknown>), source: sourceValue };
}

export async function fetchText(
  ctx: { storage: { get: (id: Id<"_storage">) => Promise<Blob | null> } },
  storageId: Id<"_storage">,
) {
  const blob = await ctx.storage.get(storageId);
  if (!blob) throw new Error("File missing in storage");
  return blob.text();
}

function formatEmbeddingError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("OPENAI_API_KEY")) {
      return "OPENAI_API_KEY is not configured.";
    }
    if (error.message.startsWith("Embedding failed")) {
      return error.message;
    }
  }
  return "Embedding failed. Please try again.";
}

export const __test = {
  getSummary: (frontmatter: Record<string, unknown>) =>
    getFrontmatterValue(frontmatter, "description"),
};
