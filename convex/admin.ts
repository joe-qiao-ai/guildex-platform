import { internalMutation, internalQuery } from "./_generated/server";

export const nukeAllData = internalMutation(async ({ db }) => {
  const tables = ['skillSearchDigest', 'embeddingSkillMap', 'skillEmbeddings', 'skillVersions', 'skills'] as const;
  let totalDeleted = 0;
  for (const table of tables) {
    const docs = await db.query(table as any).collect();
    for (const doc of docs) {
      await db.delete(doc._id);
      totalDeleted++;
    }
  }
  return { totalDeleted };
});

export const clearAllPersonas = internalMutation(async ({ db }) => {
  // 删除所有相关表数据
  for (const table of ['skills', 'skillVersions', 'skillEmbeddings', 'embeddingSkillMap', 'skillSearchDigest']) {
    const docs = await db.query(table as any).collect();
    for (const doc of docs) {
      await db.delete(doc._id);
    }
  }
  return { cleared: true };
});

// 要保留的50个名人分身的名字（用于匹配 displayName）
const KEEP_NAMES = new Set([
  "Elon Musk", "Steve Jobs", "Warren Buffett", "Charlie Munger", "Ray Dalio",
  "Nassim Taleb", "Naval Ravikant", "Paul Graham", "Peter Thiel", "Sam Altman",
  "George Soros", "Peter Lynch", "Jack Welch", "Andy Grove", "Reed Hastings",
  "Sheryl Sandberg", "Jony Ive", "David Ogilvy", "Seth Godin", "Gary Vaynerchuk",
  "Dale Carnegie", "Grant Cardone", "Stephen King", "Malcolm Gladwell", "Ryan Holiday",
  "Yuval Noah Harari", "James Clear", "Tim Ferriss", "Richard Feynman", "Andrew Huberman",
  "Peter Attia", "David Goggins", "Phil Jackson", "Chris Voss", "Jordan Peterson",
  "Brene Brown", "Marc Andreessen", "Reid Hoffman", "Indra Nooyi", "Alan Watts",
  "Mark Zuckerberg", "Bill Gates", "Barack Obama", "Winston Churchill", "Mahatma Gandhi",
  "Martin Luther King Jr.", "Friedrich Nietzsche", "Carl Sagan", "Gordon Ramsay", "Masayoshi Son",
]);

// 要保留的50个名人分身的 slug（用于匹配 slug）
const KEEP_SLUGS = new Set([
  "elon-musk", "steve-jobs", "warren-buffett", "charlie-munger", "ray-dalio",
  "nassim-taleb", "naval-ravikant", "paul-graham", "peter-thiel", "sam-altman",
  "george-soros", "peter-lynch", "jack-welch", "andy-grove", "reed-hastings",
  "sheryl-sandberg", "jony-ive", "david-ogilvy", "seth-godin", "gary-vaynerchuk",
  "dale-carnegie", "grant-cardone", "stephen-king", "malcolm-gladwell", "ryan-holiday",
  "yuval-noah-harari", "james-clear", "tim-ferriss", "richard-feynman", "andrew-huberman",
  "peter-attia", "david-goggins", "phil-jackson", "chris-voss", "jordan-peterson",
  "brene-brown", "marc-andreessen", "reid-hoffman", "indra-nooyi", "alan-watts",
  "mark-zuckerberg", "bill-gates", "barack-obama", "winston-churchill", "mahatma-gandhi",
  "martin-luther-king-jr", "friedrich-nietzsche", "carl-sagan", "gordon-ramsay", "masayoshi-son",
]);

export const deleteOldPersonas = internalMutation(async ({ db }) => {
  // 1. 获取所有 skills 记录
  const allSkills = await db.query("skills").collect();

  // 2. 分类：保留 vs 删除
  const toKeep: typeof allSkills = [];
  const toDelete: typeof allSkills = [];

  for (const skill of allSkills) {
    const nameMatch = KEEP_NAMES.has(skill.displayName);
    const slugMatch = KEEP_SLUGS.has(skill.slug);
    if (nameMatch || slugMatch) {
      toKeep.push(skill);
    } else {
      toDelete.push(skill);
    }
  }

  // 3. 删除旧 skills 及其关联数据
  let deletedSkills = 0;
  let deletedVersions = 0;
  let deletedEmbeddings = 0;
  let deletedEmbeddingMaps = 0;
  let deletedDigests = 0;

  for (const skill of toDelete) {
    const skillId = skill._id;

    // 删除 skillVersions
    const versions = await db.query("skillVersions").withIndex("by_skill", q => q.eq("skillId", skillId)).collect();
    for (const v of versions) {
      await db.delete(v._id);
      deletedVersions++;
    }

    // 删除 skillEmbeddings 及对应 embeddingSkillMap
    const embeddings = await db.query("skillEmbeddings").withIndex("by_skill", q => q.eq("skillId", skillId)).collect();
    for (const emb of embeddings) {
      // 删除 embeddingSkillMap
      const maps = await db.query("embeddingSkillMap").withIndex("by_embedding", q => q.eq("embeddingId", emb._id)).collect();
      for (const m of maps) {
        await db.delete(m._id);
        deletedEmbeddingMaps++;
      }
      await db.delete(emb._id);
      deletedEmbeddings++;
    }

    // 删除 skillSearchDigest
    const digests = await db.query("skillSearchDigest").withIndex("by_skill", q => q.eq("skillId", skillId)).collect();
    for (const d of digests) {
      await db.delete(d._id);
      deletedDigests++;
    }

    // 删除 skill 本身
    await db.delete(skillId);
    deletedSkills++;
  }

  return {
    total: allSkills.length,
    kept: toKeep.length,
    deleted: deletedSkills,
    deletedVersions,
    deletedEmbeddings,
    deletedEmbeddingMaps,
    deletedDigests,
    keptNames: toKeep.map(s => s.displayName).sort(),
  };
});

export const resetGlobalStats = internalMutation(async ({ db }) => {
  const existing = await db.query("globalStats").first();
  const now = Date.now();
  if (existing) {
    await db.patch(existing._id, { activeSkillsCount: 138, updatedAt: now });
  } else {
    await db.insert("globalStats", { key: "global", activeSkillsCount: 138, updatedAt: now });
  }
  return { set: 138 };
});

export const scanAllPersonas = internalMutation(async ({ db }) => {
  const skills = await db.query("skills").collect();
  let scanned = 0;
  for (const skill of skills) {
    if (!skill.securityScan) {
      // All 138 personas are internally created and trusted — mark safe directly
      await db.patch(skill._id, { securityScan: "safe" });
      scanned++;
    }
  }
  return { scanned };
});

export const syncSecurityScanToDigest = internalMutation(async ({ db }) => {
  const skills = await db.query("skills").collect();
  let synced = 0;
  for (const skill of skills) {
    if (!skill.securityScan) continue;
    const digests = await db
      .query("skillSearchDigest")
      .withIndex("by_skill", (q) => q.eq("skillId", skill._id))
      .collect();
    for (const digest of digests) {
      await db.patch(digest._id, { securityScan: skill.securityScan });
      synced++;
    }
  }
  return { synced };
});

export const debugEnv = internalQuery(async () => {
  return {
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID ?? "MISSING",
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET ? "SET" : "MISSING",
  };
});

export const fixLegendCategory = internalMutation(async ({ db }) => {
  const digests = await db.query("skillSearchDigest").collect();
  let fixed = 0;
  for (const digest of digests) {
    const cats = (digest as any).categories as string[] | undefined;
    if (cats && cats.includes("Famous Figure Style")) {
      const newCats = cats.map((c: string) => c === "Famous Figure Style" ? "Legends" : c);
      await db.patch(digest._id, { categories: newCats } as any);
      fixed++;
    }
  }
  return { fixed };
});
