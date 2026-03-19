import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface InstallRecord {
  skillName: string;
  agentName: string;
  sourcePath: string;
  targetPath: string;
  version: string;
  sourceHash: string;
  installedAt: string;
  lastSyncedAt: string;
  status: "installed" | "failed" | "skipped";
  syncMode: "copy" | "symlink" | "transform";
}

export interface SyncHistoryRecord {
  id: string;
  skillName: string;
  agentName: string;
  startedAt: string;
  finishedAt: string;
  result: "success" | "failed" | "skipped";
  changedFiles: string[];
  errorMessage?: string;
}

export async function loadInstallState(stateDir: string): Promise<InstallRecord[]> {
  const inputPath = path.join(stateDir, "installs.json");
  try {
    const raw = await readFile(inputPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isInstallRecord) : [];
  } catch {
    return [];
  }
}

export async function saveInstallState(stateDir: string, records: InstallRecord[]): Promise<string> {
  await mkdir(stateDir, { recursive: true });
  const outputPath = path.join(stateDir, "installs.json");
  await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  return outputPath;
}

export async function upsertInstallRecord(stateDir: string, record: InstallRecord): Promise<InstallRecord[]> {
  const records = await loadInstallState(stateDir);
  const nextRecords = records.filter(
    (existing) => !(existing.skillName === record.skillName && existing.agentName === record.agentName)
  );
  nextRecords.push(record);
  nextRecords.sort((left, right) => `${left.skillName}:${left.agentName}`.localeCompare(`${right.skillName}:${right.agentName}`));
  await saveInstallState(stateDir, nextRecords);
  return nextRecords;
}

export async function removeInstallRecords(
  stateDir: string,
  predicate: (record: InstallRecord) => boolean
): Promise<InstallRecord[]> {
  const records = await loadInstallState(stateDir);
  const nextRecords = records.filter((record) => !predicate(record));
  await saveInstallState(stateDir, nextRecords);
  return nextRecords;
}

export async function loadSyncHistory(stateDir: string): Promise<SyncHistoryRecord[]> {
  const inputPath = path.join(stateDir, "sync-history.json");
  try {
    const raw = await readFile(inputPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isSyncHistoryRecord) : [];
  } catch {
    return [];
  }
}

export async function appendSyncHistory(stateDir: string, record: SyncHistoryRecord): Promise<SyncHistoryRecord[]> {
  const records = await loadSyncHistory(stateDir);
  records.push(record);
  await mkdir(stateDir, { recursive: true });
  const outputPath = path.join(stateDir, "sync-history.json");
  await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  return records;
}

function isInstallRecord(value: unknown): value is InstallRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.skillName === "string" &&
    typeof record.agentName === "string" &&
    typeof record.sourcePath === "string" &&
    typeof record.targetPath === "string" &&
    typeof record.version === "string" &&
    typeof record.sourceHash === "string" &&
    typeof record.installedAt === "string" &&
    typeof record.lastSyncedAt === "string" &&
    (record.status === "installed" || record.status === "failed" || record.status === "skipped") &&
    (record.syncMode === "copy" || record.syncMode === "symlink" || record.syncMode === "transform")
  );
}

function isSyncHistoryRecord(value: unknown): value is SyncHistoryRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.skillName === "string" &&
    typeof record.agentName === "string" &&
    typeof record.startedAt === "string" &&
    typeof record.finishedAt === "string" &&
    (record.result === "success" || record.result === "failed" || record.result === "skipped") &&
    Array.isArray(record.changedFiles) &&
    record.changedFiles.every((item) => typeof item === "string") &&
    (record.errorMessage === undefined || typeof record.errorMessage === "string")
  );
}
