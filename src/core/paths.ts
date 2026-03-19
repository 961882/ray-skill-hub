import path from "node:path";

export interface WorkspacePaths {
  root: string;
  srcDir: string;
  skillsDir: string;
  registryDir: string;
  stateDir: string;
  templatesDir: string;
  docsDir: string;
}

export function resolveWorkspacePaths(root: string = process.cwd()): WorkspacePaths {
  const normalizedRoot = path.resolve(root);

  return {
    root: normalizedRoot,
    srcDir: path.join(normalizedRoot, "src"),
    skillsDir: path.join(normalizedRoot, "skills"),
    registryDir: path.join(normalizedRoot, "registry"),
    stateDir: path.join(normalizedRoot, "state"),
    templatesDir: path.join(normalizedRoot, "templates"),
    docsDir: path.join(normalizedRoot, "docs")
  };
}

export function expandHome(inputPath: string): string {
  if (!inputPath.startsWith("~/")) {
    return inputPath;
  }

  const home = process.env.HOME ?? "~";
  return path.join(home, inputPath.slice(2));
}
