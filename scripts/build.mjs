// 打包脚本：产出 dist/minimal-newtab-{version}-chrome.zip
import { execSync } from "node:child_process";
import { cp, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(root);

const { version } = JSON.parse(await readFile("manifest.json", "utf8"));
const name = "minimal-newtab";

await rm("dist", { recursive: true, force: true });

// Chrome：纯 zip（只打包扩展文件）
const stage = "dist/chrome-stage";
await mkdir(stage, { recursive: true });
const files = [
	"manifest.json",
	"newtab.html",
	"newtab.js",
	"styles.css",
	"popup.html",
	"popup.js",
	"popup.css",
	"todo-core.js",
	"background.js",
	"i18n.js",
	"_locales",
	"icons",
];
for (const f of files) {
	await cp(f, `${stage}/${f}`, { recursive: true });
}
execSync(`cd ${stage} && zip -r ../${name}-${version}-chrome.zip .`, {
	stdio: "inherit",
});
await rm(stage, { recursive: true });

console.log(`\n构建完成: dist/${name}-${version}-chrome.zip`);
