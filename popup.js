// 弹窗视图（核心逻辑在 todo-core.js 的 TodoView）
TodoCore.createTodoView({
	listEl: document.getElementById("popup-list"),
	addForm: document.getElementById("popup-add-form"),
	inputEl: document.getElementById("popup-input"),
	countEl: document.getElementById("popup-count"),
	clearBtn: document.getElementById("popup-clear"),
});
