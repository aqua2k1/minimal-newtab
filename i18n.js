// 国际化助手：扩展环境走 chrome/browser i18n API（_locales/messages.json）；
// 脱离扩展直接打开页面（无 i18n API）时回退到内置中文表，保持与 _locales/zh_CN/messages.json 同步。
globalThis.I18n = (() => {
	const api = globalThis.browser?.i18n ?? globalThis.chrome?.i18n;

	const FALLBACK = {
		newTabTitle: "新标签页",
		searchPlaceholder: "搜索",
		todo: "待办",
		todoWithCount: "待办 $1$",
		addTodoPlaceholder: "添加待办…",
		todoHint:
			"支持 **粗体** *斜体* `代码` ~~删除线~~ [链接](url) · 直接输入网址自动识别",
		clearDone: "清空已完成",
		todoEmpty: "暂无待办",
		doneCount: "完成 $1$/$2$",
		markDone: "标记为完成",
		markUndone: "标记为未完成",
		moveUp: "上移",
		moveDown: "下移",
		edit: "编辑",
		delete: "删除",
		updateAvailable: "发现新版本 v$1$ · 下载更新",
		downloadUpdate: "下载更新",
		dismissUpdate: "忽略此版本",
	};

	// key: messages.json 键名；subs: 依次对应 $1$、$2$…（也可传单个数组）
	function t(key, ...subs) {
		const args = subs.length === 1 && Array.isArray(subs[0]) ? subs[0] : subs;
		const msg =
			args.length > 0 ? api?.getMessage(key, args) : api?.getMessage(key);
		if (msg) {
			return msg;
		}
		return (FALLBACK[key] ?? key).replace(
			/\$(\d+)\$/g,
			(_, n) => args[Number(n) - 1] ?? "",
		);
	}

	function uiLanguage() {
		return (api?.getUILanguage() ?? navigator.language ?? "zh-CN").replace(
			"_",
			"-",
		);
	}

	// 替换 HTML 中残留的 __MSG_xxx__ 占位符（i18n API 缺失或某文案缺失时兜底）
	function applyStaticText() {
		const replaceIn = (value) =>
			value.replace(/__MSG_([A-Za-z0-9_]+)__/g, (_, key) => t(key));
		const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
		const textNodes = [];
		while (walker.nextNode()) {
			textNodes.push(walker.currentNode);
		}
		for (const node of textNodes) {
			node.data = replaceIn(node.data);
		}
		for (const el of document.querySelectorAll(
			"[placeholder], [title], [aria-label]",
		)) {
			for (const attr of ["placeholder", "title", "aria-label"]) {
				if (el.hasAttribute(attr)) {
					el.setAttribute(attr, replaceIn(el.getAttribute(attr)));
				}
			}
		}
	}

	document.documentElement.lang = uiLanguage();
	applyStaticText();

	return { t, uiLanguage };
})();
