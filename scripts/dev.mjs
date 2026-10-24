import { spawn } from "node:child_process";
const children = ["dev:server", "dev:client"].map((task) =>
  spawn(process.execPath, [process.env.npm_execpath, "run", task], {
    stdio: "inherit",
  }),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    for (const child of children) child.kill();
  });
for (const child of children)
  child.on("exit", (code) => {
    if (code) {
      for (const other of children) other.kill();
      process.exitCode = code;
    }
  });
