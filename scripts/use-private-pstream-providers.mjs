import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJsonPath = path.join(root, "package.json");
const providerDir = path.join(root, "private", "p-stream-providers");
const providerPackagePath = path.join(providerDir, "package.json");

if (!fs.existsSync(providerPackagePath)) {
  console.error(
    "Missing private/p-stream-providers/package.json. Place your authorized @p-stream/providers package there first.",
  );
  process.exit(1);
}

const providerPackage = JSON.parse(fs.readFileSync(providerPackagePath, "utf8"));
if (providerPackage.name !== "@p-stream/providers") {
  console.error(
    `Expected private provider package name @p-stream/providers, got ${providerPackage.name ?? "<missing>"}`,
  );
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
packageJson.dependencies ??= {};
packageJson.dependencies["@p-stream/providers"] = "file:./private/p-stream-providers";

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log("P-Stream now points @p-stream/providers at private/p-stream-providers.");
console.log("Run pnpm install to regenerate the lockfile against the private package.");
