import path from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Uso: node scripts/run-next-demo.mjs <build|start> [...args]");
  process.exit(1);
}

const nextBin = path.resolve(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    FACTURAIA_DEMO_MODE: "1",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
