// 待办共享核心：数据层 + Markdown 渲染 + 视图工厂（NTP 与弹窗共用）
globalThis.TodoCore = (() => {
	const TODO_KEY = "todos";
	const MAX_TODOS = 300;
	const QUOTA_SAFE_BYTES = 7500; // sync 单键限额 8KB，留余量

	// Markdown 子集：**粗体** *斜体* `代码` ~~删除线~~ [文字](链接) + 自动识别 URL
	const INLINE_SOURCE =
		"(`[^`]+`)|(\\*\\*\\*[^*\\n]+\\*\\*\\*)|(\\*\\*[^*\\n]+\\*\\*)|(\\*[^*\\n]+\\*)|(~~[^~\\n]+~~)|(\\[([^\\]\\n]+)\\]\\(([^)\\s]+\\)))|(https?://[^\\s<>\"']+|www\\.[^\\s<>\"']+)";

	const store =
		globalThis.browser?.storage?.sync ?? globalThis.chrome?.storage?.sync;
	const storageEvents =
		globalThis.browser?.storage ?? globalThis.chrome?.storage;

	function sanitizeUrl(url) {
		return /^(https?:|mailto:)/i.test(url) ? url : "";
	}

	// 白名单渲染：文本节点/属性自动转义，无注入风险；每次调用新建正则避免递归串扰
	function appendInline(parent, text) {
		const re = new RegExp(INLINE_SOURCE, "g");
		const pushText = (segment) => {
			if (segment) {
				parent.appendChild(document.createTextNode(segment));
			}
		};
		let last = 0;
		for (let match = re.exec(text); match !== null; match = re.exec(text)) {
			pushText(text.slice(last, match.index));
			if (match[1]) {
				// 代码：内容不再解析
				const code = document.createElement("code");
				code.textContent = match[1].slice(1, -1);
				parent.appendChild(code);
			} else if (match[2]) {
				// ***粗斜体***：strong 包 em
				const strong = document.createElement("strong");
				const em = document.createElement("em");
				appendInline(em, match[2].slice(3, -3));
				strong.appendChild(em);
				parent.appendChild(strong);
			} else if (match[3]) {
				const strong = document.createElement("strong");
				appendInline(strong, match[3].slice(2, -2));
				parent.appendChild(strong);
			} else if (match[4]) {
				const em = document.createElement("em");
				appendInline(em, match[4].slice(1, -1));
				parent.appendChild(em);
			} else if (match[5]) {
				const s = document.createElement("s");
				appendInline(s, match[5].slice(2, -2));
				parent.appendChild(s);
			} else if (match[6]) {
				const url = sanitizeUrl(match[8]);
				if (url) {
					const a = document.createElement("a");
					a.href = url;
					a.target = "_blank";
					a.rel = "noopener noreferrer";
					appendInline(a, match[7]);
					parent.appendChild(a);
				} else {
					pushText(match[0]);
				}
			} else if (match[9]) {
				// 自动识别 URL：去掉结尾中英文标点，www 补 http://
				const cleaned = match[9].replace(/[.,;:!?。，；：！？)\]}$]+$/, "");
				if (cleaned) {
					const href = /^https?:/i.test(cleaned)
						? cleaned
						: `http://${cleaned}`;
					const a = document.createElement("a");
					a.href = href;
					a.target = "_blank";
					a.rel = "noopener noreferrer";
					a.textContent = cleaned;
					parent.appendChild(a);
				} else {
					pushText(match[0]);
				}
			}
			last = match.index + match[0].length;
		}
		pushText(text.slice(last));
	}

	function loadTodos(callback) {
		if (!store) {
			callback([]);
			return;
		}
		store
			.get(TODO_KEY)
			.then((data) => {
				callback(Array.isArray(data[TODO_KEY]) ? data[TODO_KEY] : []);
			})
			.catch(() => callback([]));
	}

	// 超出同步配额：先清已完成，再删最旧（原地修改调用方数组）
	function shrinkToFit(todos) {
		let size = new Blob([JSON.stringify(todos)]).size;
		if (size <= QUOTA_SAFE_BYTES) {
			return;
		}
		const kept = todos.filter((todo) => !todo.done);
		todos.splice(0, todos.length, ...kept);
		size = new Blob([JSON.stringify(todos)]).size;
		while (size > QUOTA_SAFE_BYTES && todos.length > 0) {
			todos.shift();
			size = new Blob([JSON.stringify(todos)]).size;
		}
	}

	function saveTodos(todos) {
		if (!store) {
			return;
		}
		shrinkToFit(todos);
		store.set({ [TODO_KEY]: todos }).catch(() => {});
	}

	function moveTodo(todos, index, delta) {
		const target = index + delta;
		if (target < 0 || target >= todos.length) {
			return false;
		}
		const [item] = todos.splice(index, 1);
		todos.splice(target, 0, item);
		return true;
	}

	function onChanged(callback) {
		if (storageEvents?.onChanged) {
			storageEvents.onChanged.addListener((changes, area) => {
				if (area === "sync" && changes[TODO_KEY]) {
					const value = changes[TODO_KEY].newValue;
					callback(Array.isArray(value) ? value : []);
				}
			});
		}
	}

	// ---- 视图工厂：列表渲染 + 全部交互，NTP 与弹窗共用 ----
	// elements: { listEl, addForm, inputEl, toggleEl?, countEl?, clearBtn? }
	function createTodoView(elements) {
		const { listEl, addForm, inputEl, toggleEl, countEl, clearBtn } = elements;
		let todos = [];
		let editingId = null;

		function save() {
			saveTodos(todos);
		}

		function moveTodoBy(index, delta) {
			if (moveTodo(todos, index, delta)) {
				save();
				render();
			}
		}

		function render() {
			const activeCount = todos.filter((todo) => !todo.done).length;
			const doneCount = todos.length - activeCount;

			if (toggleEl) {
				toggleEl.textContent = activeCount > 0 ? `待办 ${activeCount}` : "待办";
			}
			if (countEl) {
				countEl.textContent =
					doneCount > 0 ? `完成 ${doneCount}/${todos.length}` : "";
			}
			if (clearBtn) {
				clearBtn.hidden = doneCount === 0;
			}

			listEl.textContent = "";
			if (todos.length === 0) {
				const empty = document.createElement("li");
				empty.className = "todo-empty";
				empty.textContent = "暂无待办";
				listEl.appendChild(empty);
				return;
			}

			const frag = document.createDocumentFragment();
			todos.forEach((todo, index) => {
				const li = document.createElement("li");
				li.className = `todo-item${todo.done ? " done" : ""}`;
				li.dataset.id = todo.id;

				const checkbox = document.createElement("input");
				checkbox.type = "checkbox";
				checkbox.checked = todo.done;
				checkbox.title = todo.done ? "标记为未完成" : "标记为完成";
				checkbox.addEventListener("change", () => {
					todo.done = checkbox.checked;
					todos.sort((a, b) => Number(a.done) - Number(b.done));
					save();
					render();
				});
				li.appendChild(checkbox);

				if (editingId === todo.id) {
					const editInput = document.createElement("input");
					editInput.className = "todo-edit";
					editInput.value = todo.text;
					editInput.maxLength = 100;
					const commit = () => {
						if (editingId !== todo.id) {
							return;
						}
						const value = editInput.value.trim();
						if (value) {
							todo.text = value;
						} else {
							todos = todos.filter((t) => t.id !== todo.id);
						}
						editingId = null;
						save();
						render();
					};
					editInput.addEventListener("keydown", (event) => {
						if (event.key === "Enter") {
							commit();
						} else if (event.key === "Escape") {
							editingId = null;
							render();
						}
					});
					editInput.addEventListener("blur", commit);
					li.appendChild(editInput);
					editInput.focus();
				} else {
					const text = document.createElement("span");
					text.className = "todo-text";
					appendInline(text, todo.text);
					li.appendChild(text);

					const actions = document.createElement("span");
					actions.className = "todo-actions";
					const makeBtn = (label, title, disabled, action) => {
						const btn = document.createElement("button");
						btn.type = "button";
						btn.textContent = label;
						btn.title = title;
						btn.disabled = disabled;
						btn.addEventListener("click", action);
						return btn;
					};
					actions.appendChild(
						makeBtn("↑", "上移", index === 0, () => moveTodoBy(index, -1)),
					);
					actions.appendChild(
						makeBtn("↓", "下移", index === todos.length - 1, () =>
							moveTodoBy(index, 1),
						),
					);
					actions.appendChild(
						makeBtn("✎", "编辑", false, () => {
							editingId = todo.id;
							render();
						}),
					);
					actions.appendChild(
						makeBtn("✕", "删除", false, () => {
							todos = todos.filter((t) => t.id !== todo.id);
							save();
							render();
						}),
					);
					li.appendChild(actions);
				}

				frag.appendChild(li);
			});
			listEl.appendChild(frag);
		}

		addForm.addEventListener("submit", (event) => {
			event.preventDefault();
			const text = inputEl.value.trim();
			if (!text || todos.length >= MAX_TODOS) {
				return;
			}
			todos.push({
				id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
				text,
				done: false,
			});
			inputEl.value = "";
			save();
			render();
		});

		if (clearBtn) {
			clearBtn.addEventListener("click", () => {
				todos = todos.filter((todo) => !todo.done);
				save();
				render();
			});
		}

		// 其他标签页/设备写入时实时刷新
		onChanged((data) => {
			todos = data;
			render();
		});

		loadTodos((data) => {
			todos = data;
			render();
		});

		return { render };
	}

	return {
		TODO_KEY,
		MAX_TODOS,
		appendInline,
		loadTodos,
		saveTodos,
		moveTodo,
		onChanged,
		createTodoView,
	};
})();
