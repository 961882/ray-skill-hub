import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  console.log("[pre-release] build");
  await run("npm", ["run", "build"]);

  console.log("[pre-release] test");
  await run("npm", ["test"]);

  console.log("[pre-release] doctor");
  await run("node", ["dist/cli/index.js", "doctor"]);

  console.log("[pre-release] list");
  await run("node", ["dist/cli/index.js", "list"]);

  console.log("[pre-release] completed");
}

main().catch((error) => {
  console.error("[pre-release] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
