const timeEl = document.getElementById("time");
const secondsEl = document.getElementById("seconds");
const dateEl = document.getElementById("date");

const dateFormatter = new Intl.DateTimeFormat(I18n.uiLanguage(), {
	year: "numeric",
	month: "long",
	day: "numeric",
	weekday: "long",
});

function pad(n) {
	return String(n).padStart(2, "0");
}

function updateClock() {
	const now = new Date();
	timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	secondsEl.textContent = pad(now.getSeconds());
	dateEl.textContent = dateFormatter.format(now);
}

updateClock();
setInterval(updateClock, 1000);

function doSearch(query) {
	// Firefox：用浏览器默认搜索引擎（省略 engine 即默认引擎）
	if (globalThis.browser && browser.search?.search) {
		return browser.tabs
			.getCurrent()
			.then((tab) => browser.search.search({ query, tabId: tab?.id }))
			.catch(() => browser.search.search({ query }));
	}
	// Chrome：用浏览器默认搜索引擎
	const chromeSearch = globalThis.chrome?.search;
	if (chromeSearch?.query) {
		return chromeSearch
			.query({ text: query, disposition: "CURRENT_TAB" })
			.catch(() => {
				window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
			});
	}
	// 兜底：仅在脱离扩展环境直接打开页面时触发
	window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

document.getElementById("search-form").addEventListener("submit", (event) => {
	event.preventDefault();
	const query = document.getElementById("search-input").value.trim();
	if (query) {
		doSearch(query);
	}
});

// ---- 待办清单（核心逻辑在 todo-core.js 的 TodoView） ----

TodoCore.createTodoView({
	listEl: document.getElementById("todo-list"),
	addForm: document.getElementById("todo-add-form"),
	inputEl: document.getElementById("todo-input"),
	toggleEl: document.getElementById("todo-toggle"),
	countEl: document.getElementById("todo-summary"),
	clearBtn: document.getElementById("todo-clear"),
});

document.getElementById("todo-toggle").addEventListener("click", () => {
	const panel = document.getElementById("todo-panel");
	panel.hidden = !panel.hidden;
	if (!panel.hidden) {
		document.getElementById("todo-input").focus();
	}
});

// ---- 版本检查（GitHub Releases，24h 缓存，静默失败） ----

const UPDATE_REPO = "aqua2k1/minimal-newtab";
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function maybeShowBanner(latest, dismissedVersion) {
	const current = chrome.runtime.getManifest().version;
	if (!latest || latest === current || latest === dismissedVersion) {
		return;
	}
	const banner = document.getElementById("update-banner");
	const link = document.getElementById("update-link");
	link.textContent = I18n.t("updateAvailable", latest);
	banner.hidden = false;
}

async function checkForUpdate() {
	try {
		const stored = await chrome.storage.local.get([
			"updateCheck",
			"dismissedVersion",
		]);
		const now = Date.now();
		if (
			stored.updateCheck &&
			now - stored.updateCheck.ts < UPDATE_INTERVAL_MS
		) {
			maybeShowBanner(stored.updateCheck.latest, stored.dismissedVersion);
			return;
		}
		const resp = await fetch(
			`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`,
		);
		if (!resp.ok) {
			return; // 仓库不存在/私有/限流：静默
		}
		const release = await resp.json();
		const latest = String(release.tag_name ?? "").replace(/^v/, "");
		await chrome.storage.local.set({ updateCheck: { ts: now, latest } });
		maybeShowBanner(latest, stored.dismissedVersion);
	} catch {
		// 离线等：静默
	}
}

document
	.getElementById("update-dismiss")
	.addEventListener("click", async () => {
		const stored = await chrome.storage.local.get("updateCheck");
		await chrome.storage.local.set({
			dismissedVersion: stored.updateCheck?.latest ?? "",
		});
		document.getElementById("update-banner").hidden = true;
	});

checkForUpdate();
