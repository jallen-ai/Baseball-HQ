// Bundles index.html + styles.css + data.js + app.js into one file.
// node build.cjs            -> dist/index.html (full standalone document)
// node build.cjs --artifact -> writes the artifact fragment (no doctype/html/head/body) to the path given
const fs = require("fs");
const path = require("path");
const here = __dirname;
const read = (f) => fs.readFileSync(path.join(here, f), "utf8");
const css = read("styles.css");
const data = read("data.js");
const app = read("app.js");
const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600&display=swap">';
const body = `<div id="app"></div>\n<script>\n${data}\n</script>\n<script>\n${app}\n</script>`;
const args = process.argv.slice(2);
if (args[0] === "--artifact") {
  const out = args[1];
  const frag = `<title>Coach HQ</title>\n${fonts}\n<style>\n${css}\n</style>\n${body}\n`;
  fs.writeFileSync(out, frag);
  console.log("artifact fragment ->", out, (frag.length / 1024).toFixed(0) + " KB");
} else {
  fs.mkdirSync(path.join(here, "dist"), { recursive: true });
  const doc = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Coach HQ</title>\n${fonts}\n<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
  fs.writeFileSync(path.join(here, "dist", "index.html"), doc);
  console.log("dist/index.html", (doc.length / 1024).toFixed(0) + " KB");
}
