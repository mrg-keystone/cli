#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const platform = os.platform();
const arch = os.arch();

let binary;
if (platform === "linux" && arch === "x64") binary = "planner-linux-x64";
else if (platform === "linux" && arch === "arm64") binary = "planner-linux-arm64";
else if (platform === "darwin" && arch === "x64") binary = "planner-darwin-x64";
else if (platform === "darwin" && arch === "arm64") binary = "planner-darwin-arm64";
else if (platform === "win32" && arch === "x64") binary = "planner-win-x64.exe";
else {
  console.error(`Unsupported platform: ${platform}-${arch}`);
  process.exit(1);
}

const binPath = path.join(__dirname, binary);
const child = spawn(binPath, process.argv.slice(2), { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
