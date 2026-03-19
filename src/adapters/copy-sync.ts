import { mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

async function copyRecursive(sourcePath: string, targetPath: string, changedFiles: string[], rootTarget: string): Promise<void> {
  const entries = await readdir(sourcePath, { withFileTypes: true });
  await mkdir(targetPath, { recursive: true });

  for (const entry of entries) {
    const nextSource = path.join(sourcePath, entry.name);
    const nextTarget = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(nextSource, nextTarget, changedFiles, rootTarget);
      continue;
    }
    if (entry.isFile()) {
      const content = await readFile(nextSource);
      await mkdir(path.dirname(nextTarget), { recursive: true });
      await writeFile(nextTarget, content);
      changedFiles.push(path.relative(rootTarget, nextTarget));
    }
  }
}

export async function syncByCopy(sourcePath: string, targetPath: string): Promise<string[]> {
  await rm(targetPath, { recursive: true, force: true });
  const changedFiles: string[] = [];
  await copyRecursive(sourcePath, targetPath, changedFiles, targetPath);
  return changedFiles.sort((a, b) => a.localeCompare(b));
}

export async function syncBySymlink(sourcePath: string, targetPath: string): Promise<string[]> {
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await symlink(sourcePath, targetPath, "dir");
  return [path.basename(targetPath)];
}
