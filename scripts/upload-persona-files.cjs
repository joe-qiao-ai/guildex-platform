#!/usr/bin/env node
/**
 * Upload persona file contents to Convex DB
 * Reads local persona directories and stores file content in DB for reliable download.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PERSONAS_DIR = path.join(process.env.HOME, 'Documents/公司知识库/项目/数字人平台/数字分身');
const FILE_MAP = {
  'SOUL.md': 'soulContent',
  'README.md': 'readmeContent',
  'SKILLS.md': 'skillsContent',
  'EXAMPLES.md': 'examplesContent',
  'TESTS.md': 'testsContent',
};

// Map from directory name → slug (matches seedPersonas.ts logic)
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function runConvex(args) {
  const argsStr = JSON.stringify(args);
  const tmpFile = `/tmp/convex-args-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  fs.writeFileSync(tmpFile, argsStr);
  
  try {
    const result = spawnSync('bunx', [
      'convex', 'run', '--prod',
      'admin:updatePersonaFiles',
      argsStr,
    ], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, CONVEX_DEPLOYMENT: 'prod:cool-basilisk-723' },
      encoding: 'utf8',
      timeout: 30000,
    });
    
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || 'Unknown error');
    }
    
    return JSON.parse(result.stdout.trim());
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  const dirs = fs.readdirSync(PERSONAS_DIR).filter(d => {
    const fullPath = path.join(PERSONAS_DIR, d);
    return fs.statSync(fullPath).isDirectory() && d !== '.git';
  });

  console.log(`Found ${dirs.length} persona directories`);
  console.log(`Uploading file contents to Convex production...\n`);
  
  let success = 0, failed = 0, skipped = 0;
  const errors = [];

  for (const dir of dirs) {
    const dirPath = path.join(PERSONAS_DIR, dir);
    const slug = slugify(dir);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    
    if (files.length === 0) {
      console.log(`  SKIP  ${dir} (empty directory)`);
      skipped++;
      continue;
    }

    const args = { slug };
    for (const [filename, field] of Object.entries(FILE_MAP)) {
      if (files.includes(filename)) {
        const content = fs.readFileSync(path.join(dirPath, filename), 'utf8');
        args[field] = content;
      }
    }

    try {
      const result = await runConvex(args);
      
      if (result.ok) {
        console.log(`  OK    ${dir} → ${slug} (${files.join(', ')})`);
        success++;
      } else {
        const msg = `not found in DB (slug: ${slug})`;
        console.log(`  MISS  ${dir} → ${slug}: ${result.error}`);
        errors.push({ dir, slug, error: result.error });
        failed++;
      }
    } catch (e) {
      const msg = e.message?.split('\n')[0] || String(e);
      console.log(`  ERR   ${dir} → ${slug}: ${msg}`);
      errors.push({ dir, slug, error: msg });
      failed++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done: ${success} uploaded, ${failed} failed, ${skipped} skipped`);
  
  if (errors.length > 0) {
    console.log('\nFailed entries:');
    for (const e of errors) {
      console.log(`  ${e.dir} (${e.slug}): ${e.error}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
