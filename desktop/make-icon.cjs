// ---------------------------------------------------------------------------
// Generates desktop/build/icon.png (512×512 pixel-art poké ball) for
// electron-builder, which turns it into the .ico / icons for the installer,
// the portable exe and the taskbar app icon. Runs automatically via the
// "predist" hook before `npm run dist`, or manually with `npm run icon`.
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const { makePokeballPng } = require("./icon.cjs");

const dir = path.join(__dirname, "build");
fs.mkdirSync(dir, { recursive: true });

const png = makePokeballPng(512); // electron-builder requires ≥ 256px
fs.writeFileSync(path.join(dir, "icon.png"), png);
console.log(`Wrote desktop/build/icon.png (${png.length} bytes)`);
