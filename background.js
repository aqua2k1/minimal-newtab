// 后台 Service Worker：维护工具栏角标（未完成待办数）
const TODO_KEY = "todos";
const BADGE_COLOR = "#d93025";

const actionApi = globalThis.chrome?.action;

function updateBadge(todos) {
	if (!actionApi) {
		return;
	}
	const active = Array.isArray(todos)
		? todos.filter((todo) => !todo.done).length
		: 0;
	actionApi.setBadgeBackgroundColor({ color: BADGE_COLOR });
	actionApi.setBadgeText({ text: active > 0 ? String(active) : "" });
}

const storageApi = globalThis.chrome?.storage;
if (storageApi) {
	storageApi.sync.get(TODO_KEY).then((data) => {
		updateBadge(data[TODO_KEY]);
	});
	storageApi.onChanged.addListener((changes, area) => {
		if (area === "sync" && changes[TODO_KEY]) {
			updateBadge(changes[TODO_KEY].newValue);
		}
	});
}
