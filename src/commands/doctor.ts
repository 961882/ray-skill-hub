import { runDoctorReport } from "../core/doctor.js";
import type { WorkspacePaths } from "../core/paths.js";
import type { CommandResult } from "../types/commands.js";
import type { DoctorReport } from "../types/doctor.js";
import { ensureRegistryFresh } from "../core/registry-refresh.js";
import { createCommandResult } from "../utils/command-result.js";
import { EXIT_ERROR, EXIT_SUCCESS, EXIT_WARNING } from "../utils/exit-codes.js";
import { formatDoctorOutput } from "../utils/logger.js";

export async function runDoctorCommand(paths: WorkspacePaths): Promise<CommandResult<DoctorReport>> {
  await ensureRegistryFresh(paths);
  const report = await runDoctorReport(paths);
  const hasErrors = report.results.some((result) => result.severity === "error");
  const hasWarnings = report.results.some((result) => result.severity === "warning");

  return createCommandResult(
    formatDoctorOutput(report),
    hasErrors ? EXIT_ERROR : hasWarnings ? EXIT_WARNING : EXIT_SUCCESS,
    report,
    { operation: "read", writeIntent: "none" }
  );
}
