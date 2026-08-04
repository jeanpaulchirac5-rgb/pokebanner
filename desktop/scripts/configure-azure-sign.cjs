// Conditional Azure Trusted Signing setup for electron-builder.
//
// When ALL of the Azure Trusted Signing secrets below are present in the CI
// environment, this script injects `build.win.sign` (type "azure") into
// desktop/package.json so electron-builder signs the installer + portable exe
// (eliminating the Windows SmartScreen "unknown publisher" warning).
//
// When any secret is missing, the script exits without changing anything and
// the build stays unsigned — exactly the pre-signing behavior. This keeps
// `git tag v1.0.0` releases working even before signing credentials exist.
//
// Secrets (set in the repo's GitHub Actions secrets):
//   AZURE_TENANT_ID        — Azure tenant id
//   AZURE_CLIENT_ID        — service principal (app) id
//   AZURE_CLIENT_SECRET    — service principal client secret
//   AZURE_ENDPOINT         — Trusted Signing endpoint, e.g. https://weu.codesigning.azure.net
//   AZURE_ACCOUNT_NAME     — Trusted Signing account name (codeSigningAccountName)
//   AZURE_PROFILE_NAME     — certificate profile name (certificateProfileName)
//   AZURE_PUBLISHER_NAME   — publisher identity, e.g. "CN=Poke-Banner"
//
// Note: the service principal must have the "Trusted Signing Certificate
// Profile Signer" role on the account/profile (see desktop/README.md).

const fs = require("fs");
const path = require("path");

const REQUIRED = [
  "AZURE_TENANT_ID",
  "AZURE_CLIENT_ID",
  "AZURE_CLIENT_SECRET",
  "AZURE_ENDPOINT",
  "AZURE_ACCOUNT_NAME",
  "AZURE_PROFILE_NAME",
  "AZURE_PUBLISHER_NAME",
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.log(
    "[sign] Azure Trusted Signing secrets not set (%s) — building UNSIGNED (SmartScreen will warn).",
    missing.join(", ")
  );
  process.exit(0);
}

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

pkg.build = pkg.build || {};
pkg.build.win = pkg.build.win || {};
pkg.build.win.sign = {
  type: "azure",
  endpoint: process.env.AZURE_ENDPOINT,
  codeSigningAccountName: process.env.AZURE_ACCOUNT_NAME,
  certificateProfileName: process.env.AZURE_PROFILE_NAME,
  publisherName: process.env.AZURE_PUBLISHER_NAME,
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("[sign] Azure Trusted Signing enabled — artifacts will be signed.");
