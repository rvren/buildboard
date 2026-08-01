// electron-builder afterPack hook.
//
// We ship UN-NOTARIZED builds (no paid Apple Developer account). On Apple
// Silicon (M1/M2/M3) macOS will not launch an arm64 app that lacks a valid
// code signature — it reports "app is damaged and can't be opened", and no
// amount of `xattr` clears that because the problem is a MISSING signature,
// not just the download-quarantine flag. electron-builder without a signing
// identity does not reliably ad-hoc sign, so we do it ourselves here: a
// deterministic ad-hoc signature (`--sign -`) over the whole bundle makes the
// arm64 build launchable once the user clears quarantine (`xattr -cr`).
//
// x64 tolerates being unsigned, but ad-hoc signing it too is harmless and keeps
// both arches consistent.

const path = require("node:path");
const { execFileSync } = require("node:child_process");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename; // "BuildBoard"
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[afterPack] ad-hoc signing ${appPath} (${context.arch})`);
  try {
    execFileSync(
      "codesign",
      ["--force", "--deep", "--sign", "-", "--timestamp=none", appPath],
      { stdio: "inherit" }
    );
    // Sanity check: verify the signature took.
    execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], {
      stdio: "inherit",
    });
    console.log("[afterPack] ad-hoc signature applied + verified");
  } catch (err) {
    console.error("[afterPack] ad-hoc signing failed:", err.message);
    throw err;
  }
};
