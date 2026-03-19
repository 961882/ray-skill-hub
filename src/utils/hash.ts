import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

async function collectFiles(root: string): Promise<string[]> {
  const rootStat = await stat(root);
  if (rootStat.isFile()) {
    return [root];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function hashSkillDirectory(
  skillPath: string,
  options: {
    overrides?: Record<string, string>;
  } = {}
): Promise<string> {
  const files = await collectFiles(skillPath);
  const hasher = createHash("sha256");

  for (const filePath of files) {
    const relativePath = path.relative(skillPath, filePath);
    const override = options.overrides?.[relativePath];
    const content = override === undefined ? await readFile(filePath) : Buffer.from(override, "utf8");
    hasher.update(relativePath);
    hasher.update("\0");
    hasher.update(content);
    hasher.update("\0");
  }

  return hasher.digest("hex");
}
