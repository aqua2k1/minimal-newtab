// 打包脚本：产出 dist/minimal-newtab-{version}-chrome.zip + -fx.zip
import { execSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, rename, rm } from "node:fs/promises";
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
	"icons",
];
for (const f of files) {
	await cp(f, `${stage}/${f}`, { recursive: true });
}
execSync(`cd ${stage} && zip -r ../${name}-${version}-chrome.zip .`, {
	stdio: "inherit",
});
await rm(stage, { recursive: true });

// Firefox：web-ext build（自动处理清单；--ignore-files 排除非扩展文件）
execSync(
	"npx web-ext build --source-dir . --artifacts-dir dist --overwrite-dest" +
		' --ignore-files "scripts/**" "package.json" "package-lock.json" "biome.jsonc" "README.md" "*.log"',
	{
		stdio: "inherit",
	},
);
const built = (await readdir("dist")).find(
	(f) => f.endsWith(".zip") && !f.includes("-chrome"),
);
if (built) {
	await rename(`dist/${built}`, `dist/${name}-${version}-fx.zip`);
}

console.log(
	`\n构建完成:\n  dist/${name}-${version}-chrome.zip\n  dist/${name}-${version}-fx.zip`,
);
