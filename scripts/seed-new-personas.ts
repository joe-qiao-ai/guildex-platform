#!/usr/bin/env bun
/**
 * seed-new-personas.ts
 * Scans local persona directories and seeds new ones into the Convex DB
 * via seedPersonaMutation.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PERSONA_BASE = path.join(
  process.env.HOME!,
  "Documents/公司知识库/项目/数字人平台/数字分身"
);

const ALREADY_SEEDED = new Set([
  "alan-watts",
  "andrew-huberman",
  "andy-grove",
  "barack-obama",
  "bill-gates",
  "brene-brown",
  "carl-sagan",
  "charlie-munger",
  "chris-voss",
  "dale-carnegie",
  "david-goggins",
  "david-ogilvy",
  "elon-musk",
  "friedrich-nietzsche",
  "gary-vaynerchuk",
  "george-soros",
  "gordon-ramsay",
  "grant-cardone",
  "indra-nooyi",
  "jack-welch",
  "james-clear",
  "jony-ive",
  "jordan-peterson",
  "mahatma-gandhi",
  "malcolm-gladwell",
  "marc-andreessen",
  "mark-zuckerberg",
  "martin-luther-king-jr",
  "masayoshi-son",
  "nassim-taleb",
  "naval-ravikant",
  "paul-graham",
  "peter-attia",
  "peter-lynch",
  "peter-thiel",
  "phil-jackson",
  "ray-dalio",
  "reed-hastings",
  "reid-hoffman",
  "richard-feynman",
  "ryan-holiday",
  "sam-altman",
  "seth-godin",
  "sheryl-sandberg",
  "stephen-king",
  "steve-jobs",
  "tim-ferriss",
  "warren-buffett",
  "winston-churchill",
  "yuval-noah-harari",
]);

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

function inferCategory(dirName: string, soulContent: string): string {
  const lower = dirName.toLowerCase() + " " + soulContent.toLowerCase();
  if (lower.includes("marketing") || lower.includes("content creator") || lower.includes("growth hacker") || lower.includes("seo") || lower.includes("linkedin") || lower.includes("reddit community")) {
    return "Marketing";
  }
  if (lower.includes("strategy") || lower.includes("business analyst") || lower.includes("competitive intel") || lower.includes("market research") || lower.includes("financial advisor") || lower.includes("legal advisor")) {
    return "Product & Strategy";
  }
  if (lower.includes("engineer") || lower.includes("developer") || lower.includes("programmer") || lower.includes("blockchain") || lower.includes("data scientist") || lower.includes("software")) {
    return "Engineering";
  }
  if (lower.includes("design") || lower.includes("designer") || lower.includes("ux") || lower.includes("ui ")) {
    return "Design";
  }
  if (lower.includes("sales") || lower.includes("support") || lower.includes("customer success")) {
    return "Sales & Support";
  }
  if (lower.includes("game") || lower.includes("unity") || lower.includes("unreal")) {
    return "Game Development";
  }
  if (lower.includes("geograph") || lower.includes("narratolog") || lower.includes("psycholog") || lower.includes("academic") || lower.includes("research") || lower.includes("professor")) {
    return "Academic & Specialized";
  }
  return "Professional/Career";
}

function extractNameFromSoul(soulContent: string, dirName: string): string {
  // Try frontmatter name field
  const fmName = soulContent.match(/^name:\s*(.+)$/m);
  if (fmName) return fmName[1].trim();
  
  // Try first heading
  const heading = soulContent.match(/^#\s+(.+?)(?:\s+—.+)?$/m);
  if (heading) {
    return heading[1].replace(/^\*\*|\*\*$/g, "").trim();
  }
  
  // Fallback: use directory name, clean up
  return dirName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function extractTagline(soulContent: string): string {
  // Try to find a short tagline/summary from the content
  // Look for lines like "I am a..." or "I'm a..." near the start
  const lines = soulContent.split("\n").filter(l => l.trim());
  
  // Find first substantive paragraph after headings
  let foundHeading = false;
  for (const line of lines) {
    if (line.startsWith("#")) { foundHeading = true; continue; }
    if (!foundHeading) continue;
    const trimmed = line.trim();
    if (trimmed.length > 30 && trimmed.length < 200 && !trimmed.startsWith("-") && !trimmed.startsWith("*")) {
      return trimmed.replace(/\*\*/g, "").slice(0, 180);
    }
  }
  
  // Fallback: first paragraph after stripping frontmatter
  const noFm = soulContent.replace(/^---[\s\S]*?---\n/, "");
  const paras = noFm.split(/\n\n+/);
  for (const p of paras) {
    const trimmed = p.replace(/^#+.+\n/, "").trim();
    if (trimmed.length > 30 && trimmed.length < 200) {
      return trimmed.replace(/\*\*/g, "").replace(/\n/g, " ").slice(0, 180);
    }
  }
  return "AI persona with deep expertise and a distinct personality.";
}

function extractDescription(soulContent: string): string {
  const noFm = soulContent.replace(/^---[\s\S]*?---\n/, "");
  // Get first 500 chars of meaningful content
  const paras = noFm.split(/\n\n+/).filter(p => {
    const t = p.trim();
    return t.length > 50 && !t.startsWith("#");
  });
  if (paras.length > 0) {
    return paras.slice(0, 2).join("\n\n").replace(/\*\*/g, "").slice(0, 600);
  }
  return soulContent.slice(0, 500);
}

function extractRole(soulContent: string): string | undefined {
  const role = soulContent.match(/^role:\s*(.+)$/m);
  return role ? role[1].trim() : undefined;
}

function randomRating(): number {
  return Math.round((4.5 + Math.random() * 0.4) * 10) / 10;
}

function randomDownloads(): number {
  return Math.floor(300 + Math.random() * 1200);
}

interface PersonaData {
  dirName: string;
  slug: string;
  displayName: string;
  tagline: string;
  description: string;
  category: string;
  soulMd: string;
  role?: string;
  rating: number;
  downloads: number;
}

async function main() {
  const dirs = fs.readdirSync(PERSONA_BASE);
  const newPersonas: PersonaData[] = [];
  const seenSlugs = new Set<string>(ALREADY_SEEDED);
  const skippedEmpty: string[] = [];
  const skippedDuplicate: string[] = [];
  const skippedAlready: string[] = [];

  for (const dirName of dirs) {
    const dirPath = path.join(PERSONA_BASE, dirName);
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) continue;

    const slug = toSlug(dirName);
    
    // Skip already seeded
    if (ALREADY_SEEDED.has(slug)) {
      skippedAlready.push(dirName);
      continue;
    }

    // Check for content
    const soulPath = path.join(dirPath, "SOUL.md");
    const readmePath = path.join(dirPath, "README.md");
    
    const hasSoul = fs.existsSync(soulPath);
    const hasReadme = fs.existsSync(readmePath);
    
    if (!hasSoul && !hasReadme) {
      skippedEmpty.push(dirName);
      continue;
    }

    // Skip duplicate slugs (keep first occurrence)
    if (seenSlugs.has(slug)) {
      skippedDuplicate.push(`${dirName} (slug: ${slug})`);
      continue;
    }
    seenSlugs.add(slug);

    // Read content
    const soulContent = hasSoul ? fs.readFileSync(soulPath, "utf-8") : "";
    const readmeContent = hasReadme ? fs.readFileSync(readmePath, "utf-8") : "";
    const combinedContent = soulContent || readmeContent;

    const displayName = extractNameFromSoul(combinedContent, dirName);
    const tagline = extractTagline(combinedContent);
    const description = extractDescription(combinedContent);
    const category = inferCategory(dirName, combinedContent);
    const role = extractRole(soulContent);
    const soulMd = combinedContent;

    newPersonas.push({
      dirName,
      slug,
      displayName,
      tagline,
      description,
      category,
      soulMd,
      role,
      rating: randomRating(),
      downloads: randomDownloads(),
    });
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Already seeded (skipped): ${skippedAlready.length}`);
  console.log(`  Empty dirs (skipped): ${skippedEmpty.length} — ${skippedEmpty.join(", ")}`);
  console.log(`  Duplicate slugs (skipped): ${skippedDuplicate.length} — ${skippedDuplicate.join(", ")}`);
  console.log(`  New personas to seed: ${newPersonas.length}`);
  console.log("");

  let successCount = 0;
  let failCount = 0;
  const results: Array<{slug: string; name: string; ok: boolean; error?: string}> = [];

  for (const persona of newPersonas) {
    console.log(`⏳ Seeding: ${persona.displayName} (${persona.slug})...`);
    
    const args = JSON.stringify({
      slug: persona.slug,
      displayName: persona.displayName,
      summary: persona.tagline,
      description: persona.description,
      category: mapCategory(persona.category),
      coreExpertise: extractExpertise(persona.soulMd),
      creator: "msitarzewski",
      skillMd: persona.soulMd,
      title: persona.role,
      rating: persona.rating,
      statsDownloads: persona.downloads,
      statsStars: Math.floor(persona.downloads * 0.1),
    });

    try {
      const cmd = `cd ~/Documents/公司知识库/项目/数字人平台/guildex && export PATH="$HOME/.bun/bin:$PATH" && bunx convex run --no-push seedPersonas:seedPersonaMutation '${args.replace(/'/g, "'\\''")}'`;
      const out = execSync(cmd, { shell: "/bin/zsh", timeout: 30000, encoding: "utf-8" });
      console.log(`  ✅ ${persona.displayName}`);
      successCount++;
      results.push({ slug: persona.slug, name: persona.displayName, ok: true });
    } catch (e: any) {
      const errMsg = e.stderr || e.message || "unknown";
      console.error(`  ❌ ${persona.displayName}: ${errMsg.slice(0, 200)}`);
      failCount++;
      results.push({ slug: persona.slug, name: persona.displayName, ok: false, error: errMsg.slice(0, 200) });
    }
  }

  console.log(`\n✅ Seeded: ${successCount} | ❌ Failed: ${failCount}`);
  
  // Write results for report
  fs.writeFileSync("/tmp/seed-results.json", JSON.stringify({ 
    newPersonas: newPersonas.length,
    successCount, 
    failCount, 
    results,
    skippedAlready: skippedAlready.length,
    skippedEmpty,
    skippedDuplicate
  }, null, 2));
  
  return { successCount, failCount };
}

function mapCategory(cat: string): string {
  const MAP: Record<string, string> = {
    "Marketing": "Professional/Career",
    "Engineering": "Professional/Career", 
    "Design": "Professional/Career",
    "Product & Strategy": "Professional/Career",
    "Sales & Support": "Professional/Career",
    "Game Development": "Professional/Career",
    "Academic & Specialized": "Education/Learning",
  };
  return MAP[cat] || "Professional/Career";
}

function extractExpertise(content: string): string[] {
  // Look for Core Expertise / Skills sections
  const expertiseMatch = content.match(/##\s+(?:Core\s+)?(?:Expertise|Skills|Capabilities|Specialties)[\s\S]*?\n((?:[-*]\s+.+\n?)+)/i);
  if (expertiseMatch) {
    return expertiseMatch[1]
      .split("\n")
      .filter(l => l.trim().startsWith("-") || l.trim().startsWith("*"))
      .map(l => l.replace(/^[-*]\s+/, "").split("—")[0].split(":")[0].trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(l => l.length > 2)
      .slice(0, 10);
  }
  
  // Look for tools line
  const toolsMatch = content.match(/^tools:\s*(.+)$/m);
  if (toolsMatch) {
    return toolsMatch[1].split(",").map(t => t.trim());
  }
  
  return ["professional", "expertise", "ai-persona"];
}

main().catch(console.error);
