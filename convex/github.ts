"use node";

/**
 * github.ts — Push AI talent personas to the guildex-ai-talent public repo.
 *
 * Uses the GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path})
 * to create or update files when a persona is approved and published.
 *
 * Environment variables required:
 *   GITHUB_TOKEN  — Personal access token with repo write access
 *   GITHUB_REPO   — e.g. "joe-qiao-ai/guildex-ai-talent"
 */

import { v } from "convex/values";
import { internalAction } from "./functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PersonaFiles {
  /** Persona slug — used as the folder name in the repo (e.g. "warren-buffett") */
  slug: string;
  /** Human-readable display name */
  displayName: string;
  /** Personality, voice, and core philosophy */
  soul: string;
  /** What they do, who they're for, quick start */
  readme: string;
  /** Detailed capabilities and workflows */
  skills: string;
  /** Real conversation examples */
  examples: string;
  /** Validation test cases */
  tests: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function base64Encode(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64");
}

async function githubPutFile(
  token: string,
  repo: string,
  path: string,
  content: string,
  message: string,
): Promise<void> {
  const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`;

  // Check if file already exists (need SHA to update)
  let sha: string | undefined;
  const getResp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (getResp.ok) {
    const existing = (await getResp.json()) as { sha?: string };
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message,
    content: base64Encode(content),
  };
  if (sha) body.sha = sha;

  const putResp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!putResp.ok) {
    const err = await putResp.text();
    throw new Error(`GitHub API error ${putResp.status} for ${path}: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Convex internal action
// ---------------------------------------------------------------------------

/**
 * Push a persona's files to the guildex-ai-talent GitHub repo.
 * Call this after a persona passes moderation review.
 */
export const pushPersonaToGitHub = internalAction({
  args: {
    slug: v.string(),
    displayName: v.string(),
    soul: v.string(),
    readme: v.string(),
    skills: v.string(),
    examples: v.string(),
    tests: v.string(),
  },
  handler: async (_ctx, args) => {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;

    if (!token || !repo) {
      console.error(
        "pushPersonaToGitHub: GITHUB_TOKEN or GITHUB_REPO not set — skipping",
      );
      return { ok: false, reason: "missing_env" };
    }

    const base = `personas/${args.slug}`;
    const commitMsg = `feat(persona): add ${args.displayName}`;

    const files: Array<{ path: string; content: string }> = [
      { path: `${base}/SOUL.md`, content: args.soul },
      { path: `${base}/README.md`, content: args.readme },
      { path: `${base}/SKILLS.md`, content: args.skills },
      { path: `${base}/EXAMPLES.md`, content: args.examples },
      { path: `${base}/TESTS.md`, content: args.tests },
    ];

    const errors: string[] = [];
    for (const file of files) {
      try {
        await githubPutFile(token, repo, file.path, file.content, commitMsg);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`pushPersonaToGitHub: failed to push ${file.path}: ${msg}`);
        errors.push(file.path);
      }
    }

    if (errors.length > 0) {
      return { ok: false, reason: "partial_failure", failedFiles: errors };
    }

    console.log(
      `pushPersonaToGitHub: ✓ pushed ${files.length} files for "${args.slug}" to ${repo}`,
    );
    return { ok: true, slug: args.slug, repo };
  },
});
