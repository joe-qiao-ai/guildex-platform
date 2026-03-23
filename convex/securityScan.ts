"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Keyword blacklists for rule-based security scanning (no AI API calls)
const PROMPT_INJECTION_KEYWORDS = [
  "ignore previous instructions",
  "ignore all instructions",
  "disregard",
  "you are now",
  "forget you are",
  "act as if",
  "override",
  "jailbreak",
  "DAN",
  "do anything now",
];

const IDENTITY_FRAUD_KEYWORDS = [
  "I am the real",
  "I am actually",
  "I am the actual",
];

const HARMFUL_CONTENT_KEYWORDS = [
  "I guarantee",
  "100% effective",
  "cure",
  "I can diagnose",
  "ignore all warnings",
  "without consulting",
];

type ScanResult = {
  verdict: "safe" | "warning";
  reason: string | null;
  risks: string[];
};

function runRuleScan(content: string): ScanResult {
  const lower = content.toLowerCase();
  const risks: string[] = [];
  const matched: string[] = [];

  // Check prompt injection
  for (const kw of PROMPT_INJECTION_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      if (!risks.includes("PROMPT_INJECTION")) risks.push("PROMPT_INJECTION");
      matched.push(kw);
    }
  }

  // Check identity fraud
  for (const kw of IDENTITY_FRAUD_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      if (!risks.includes("IDENTITY_FRAUD")) risks.push("IDENTITY_FRAUD");
      matched.push(kw);
    }
  }

  // Check harmful content
  for (const kw of HARMFUL_CONTENT_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      if (!risks.includes("HARMFUL_ADVICE")) risks.push("HARMFUL_ADVICE");
      matched.push(kw);
    }
  }

  if (risks.length > 0) {
    return {
      verdict: "warning",
      reason: `Flagged keywords: ${matched.join(", ")}`,
      risks,
    };
  }

  return { verdict: "safe", reason: null, risks: [] };
}

export const runSecurityScan = internalAction({
  args: {
    skillId: v.id("skills"),
    soulMdContent: v.string(),
  },
  handler: async (ctx, { skillId, soulMdContent }) => {
    const result = runRuleScan(soulMdContent);

    await ctx.runMutation(internal.skills.updateSecurityScan, {
      skillId,
      securityScan: result.verdict,
      securityScanReason: result.reason ?? undefined,
    });
  },
});

export const runSoulSecurityScan = internalAction({
  args: {
    soulId: v.id("souls"),
    soulMdContent: v.string(),
  },
  handler: async (ctx, { soulId, soulMdContent }) => {
    const result = runRuleScan(soulMdContent);

    await ctx.runMutation(internal.souls.updateSecurityScan, {
      soulId,
      securityScan: result.verdict,
      securityScanReason: result.reason ?? undefined,
    });
  },
});
