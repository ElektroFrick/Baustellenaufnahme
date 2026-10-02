// Baut aus index.html eine offlinefähige Fassung in www/ für die Android-App:
// JSX wird vorab übersetzt, React liegt lokal bei, Tailwind wird als feste
// CSS-Datei erzeugt. index.html selbst bleibt unverändert (GitHub Pages).
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { transform } from "esbuild";

const require = createRequire(import.meta.url);
const paket = (name, datei) => join(dirname(require.resolve(name + "/package.json")), datei);
const html = readFileSync("index.html", "utf8");

const babelBlock = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!babelBlock) throw new Error("Kein <script type=\"text/babel\"> in index.html gefunden");

const { code } = await transform(babelBlock[1], {
  loader: "jsx",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  target: "chrome90",
  minify: true,
});

rmSync("www", { recursive: true, force: true });
mkdirSync("www/vendor", { recursive: true });
writeFileSync("www/app.js", code);
copyFileSync(paket("react", "umd/react.production.min.js"), "www/vendor/react.js");
copyFileSync(paket("react-dom", "umd/react-dom.production.min.js"), "www/vendor/react-dom.js");
copyFileSync("manifest.json", "www/manifest.json");
cpSync("icons", "www/icons", { recursive: true });

writeFileSync("www/tailwind.in.css", "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n");
execFileSync(
  process.execPath,
  [paket("tailwindcss", "lib/cli.js"), "-i", "www/tailwind.in.css", "-o", "www/app.css", "--content", "www/app.js", "--minify"],
  { stdio: "inherit" }
);
rmSync("www/tailwind.in.css");

const out = html
  .replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\s*/, '<link rel="stylesheet" href="app.css" />\n')
  .replace(/<script[^>]*src="https:\/\/unpkg\.com\/react@[^"]*"><\/script>/, '<script src="vendor/react.js"></script>')
  .replace(/<script[^>]*src="https:\/\/unpkg\.com\/react-dom@[^"]*"><\/script>/, '<script src="vendor/react-dom.js"></script>')
  .replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"><\/script>\s*/, "")
  .replace(babelBlock[0], '<script src="app.js"></script>');

if (/unpkg\.com|cdn\.tailwindcss\.com|text\/babel/.test(out)) {
  throw new Error("www/index.html verweist noch auf externe Bibliotheken oder Babel");
}
writeFileSync("www/index.html", out);
console.log("www/ gebaut");
