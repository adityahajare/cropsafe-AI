const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");

const SCRIPT_PATH = path.join(__dirname, "..", "python", "disease_analyzer.py");

function runPython(args, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const child = spawn("python", args, {
      cwd: path.join(__dirname, ".."),
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Python disease analyzer timed out"));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python disease analyzer failed with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout.trim() || "{}"));
      } catch (error) {
        reject(new Error(`Python disease analyzer returned invalid JSON: ${stdout.slice(0, 300)}`));
      }
    });
  });
}

async function runPythonDiseaseDiagnosis({ file, cropType, locationLabel }) {
  if (!file?.buffer?.length) return null;

  const ext = file.mimetype === "image/png" ? ".png" : ".jpg";
  const tempFile = path.join(os.tmpdir(), `cropsafe-disease-${crypto.randomUUID()}${ext}`);

  try {
    await fs.writeFile(tempFile, file.buffer);

    const result = await runPython([
      SCRIPT_PATH,
      tempFile,
      JSON.stringify({
        cropType: cropType || "",
        locationLabel: locationLabel || "",
      }),
    ]);

    return result && typeof result === "object" ? result : null;
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}

module.exports = {
  runPythonDiseaseDiagnosis,
};
