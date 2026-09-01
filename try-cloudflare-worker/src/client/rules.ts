// src/client/rules.ts
interface Group {
  id: number;
  name: string;
  color: string;
}

interface RuleTask {
  id: number;
  title: string;
  groupId: number | null;
  group?: Group | null;
  interval: string;
  periodStyle: string | null;
  startAt: string | null;
  endAt: string | null;
  resetTime: string;
  missedBehavior: string;
  notes: string | null;
}

document.addEventListener('DOMContentLoaded', () => {
  const taskBtn = document.getElementById('add-task-button') as HTMLButtonElement | null;
  const cancelEditBtn = document.getElementById('cancel-edit-button') as HTMLButtonElement | null;
  const taskList = document.getElementById('task-list');
  const scheduleTypeSelect = document.getElementById('task-schedule-type') as HTMLSelectElement | null;
  const categorySelect = document.getElementById('task-category') as HTMLSelectElement | null;

  const scopeModal = document.getElementById('scope-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalTaskName = document.getElementById('modal-task-name');
  const modalDesc = document.getElementById('modal-desc');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  if (!taskBtn || !cancelEditBtn || !taskList || !scheduleTypeSelect || !categorySelect) {
    console.error('Required DOM elements for rules page missing');
    return;
  }

  let currentTasks: RuleTask[] = [];
  let editTaskId: number | null = null;
  let pendingOperation: ((scope: string) => void) | null = null;

  function formatSchedule(task: RuleTask): string {
    if (task.interval === 'daily') {
      return '🔄 毎日自動発生';
    } else if (task.interval === 'period') {
      const style = task.periodStyle === 'routine' ? '期間中毎日' : '期間中1回のみ';
      return `📅 期間指定 (${style})<br><small>${task.startAt || '-'} ～ ${task.endAt || '-'}</small>`;
    }
    return '📑 手動発生のみ';
  }

  async function loadTasks() {
    try {
      const resp = await fetch('/api/rules');
      if (!resp.ok) throw new Error('マスタ一覧の取得に失敗しました');
      const tasks: RuleTask[] = await resp.json();
      currentTasks = tasks;
      taskList!.innerHTML = '';
      tasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <strong>${escapeHtml(task.title)}</strong>
            ${task.notes ? `<br><small style="color:#777;">📝 ${escapeHtml(task.notes)}</small>` : ''}
          </td>
          <td>${task.group ? `<span style="color: ${escapeHtml(task.group.color)}">${escapeHtml(task.group.name)}</span>` : '-'}</td>
          <td>⏱️ ${escapeHtml(task.resetTime)}</td>
          <td>${formatSchedule(task)}</td>
          <td>
            ${task.missedBehavior === 'slide'
            ? '<span class="status-badge" style="background-color:#f39c12;">↩️ 翌日繰越</span>'
            : '<span class="status-badge" style="background-color:#95a5a6;">❌ 強制リセット</span>'}
          </td>
          <td>
            <div class="action-buttons">
              <button class="edit-btn action-edit" data-id="${task.id}">編集</button>
              <button class="delete-btn action-delete" data-id="${task.id}">削除</button>
            </div>
          </td>
        `;
        taskList!.appendChild(tr);
      });

      // イベントリスナーの登録
      taskList!.querySelectorAll('.action-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = Number((e.currentTarget as HTMLButtonElement).getAttribute('data-id'));
          editTask(id);
        });
      });

      taskList!.querySelectorAll('.action-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = Number((e.currentTarget as HTMLButtonElement).getAttribute('data-id'));
          triggerDelete(id);
        });
      });
    } catch (err) { console.error(err); }
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadCategories() {
    try {
      const resp = await fetch('/api/groups');
      if (!resp.ok) throw new Error('カテゴリ一覧の取得に失敗しました');
      const categories: Group[] = await resp.json();
      categorySelect!.innerHTML = '<option value="">未選択</option>';
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = String(category.id);
        option.textContent = category.name;
        option.style.color = category.color;
        categorySelect!.appendChild(option);
      });
    } catch (err) { console.error(err); }
  }

  function renderScheduleDetails() {
    const container = document.getElementById('schedule-details');
    if (!container) return;
    const scheduleType = scheduleTypeSelect!.value;
    const htmlParts: string[] = [];

    if (scheduleType === 'period') {
      htmlParts.push(`
        <div class="schedule-period-box">
          <div class="form-group">
            <label for="task-period-style">期間内の消化スタイル</label>
            <select id="task-period-style">
              <option value="routine">期間中、毎日リセットして発生 (限定日課)</option>
              <option value="single">期間中に合計1回クリアすればOK (単発任務)</option>
            </select>
          </div>
          <div class="schedule-dates-row">
            <div>
              <label for="task-start">開始日</label>
              <input type="date" id="task-start">
            </div>
            <div>
              <label for="task-end">終了日</label>
              <input type="date" id="task-end">
            </div>
          </div>
        </div>
      `);
    }
    container.innerHTML = htmlParts.join('');
  }

  function resetForm() {
    editTaskId = null;
    taskBtn!.textContent = 'ルールを追加する';
    cancelEditBtn!.style.display = 'none';
    (document.getElementById('task-title') as HTMLInputElement).value = '';
    (document.getElementById('task-notes') as HTMLTextAreaElement).value = '';
    (document.getElementById('task-reset-time') as HTMLInputElement).value = '02:00';
    (document.getElementById('task-missed-behavior') as HTMLSelectElement).value = 'delete';
    categorySelect!.value = '';
    scheduleTypeSelect!.value = 'none';
    renderScheduleDetails();
  }

  function openScopeModal(taskTitle: string, title: string, desc: string, onConfirm: (scope: string) => void) {
    if (modalTitle) modalTitle.textContent = title;
    if (modalTaskName) modalTaskName.textContent = taskTitle;
    if (modalDesc) modalDesc.textContent = desc;
    pendingOperation = onConfirm;
    const futureRadio = document.querySelector('input[name="operation-scope"][value="future"]') as HTMLInputElement | null;
    if (futureRadio) futureRadio.checked = true;
    if (scopeModal) scopeModal.style.display = 'block';
  }

  if (modalCancelBtn) {
    modalCancelBtn.addEventListener('click', () => {
      if (scopeModal) scopeModal.style.display = 'none';
      pendingOperation = null;
    });
  }

  if (modalConfirmBtn) {
    modalConfirmBtn.addEventListener('click', () => {
      const selectedScope = document.querySelector('input[name="operation-scope"]:checked') as HTMLInputElement | null;
      const scope = selectedScope ? selectedScope.value : 'future';
      if (pendingOperation) pendingOperation(scope);
      if (scopeModal) scopeModal.style.display = 'none';
      pendingOperation = null;
    });
  }

  taskBtn.addEventListener('click', async () => {
    const titleInput = document.getElementById('task-title') as HTMLInputElement;
    const title = titleInput ? titleInput.value : '';
    if (!title) { alert('タスク名を入力してください'); return; }

    const scheduleType = scheduleTypeSelect.value;
    let startAt: string | null = null;
    let endAt: string | null = null;
    let periodStyle: string | null = null;

    if (scheduleType === 'period') {
      const startEl = document.getElementById('task-start') as HTMLInputElement | null;
      const endEl = document.getElementById('task-end') as HTMLInputElement | null;
      const periodStyleEl = document.getElementById('task-period-style') as HTMLSelectElement | null;
      startAt = startEl && startEl.value ? startEl.value : null;
      endAt = endEl && endEl.value ? endEl.value : null;
      periodStyle = periodStyleEl ? periodStyleEl.value : null;
    }

    const resetTimeEl = document.getElementById('task-reset-time') as HTMLInputElement;
    const missedBehaviorEl = document.getElementById('task-missed-behavior') as HTMLSelectElement;
    const notesEl = document.getElementById('task-notes') as HTMLTextAreaElement;

    const payload = {
      title,
      groupId: categorySelect.value ? Number(categorySelect.value) : null,
      interval: scheduleType,
      periodStyle,
      startAt,
      endAt,
      resetTime: resetTimeEl ? resetTimeEl.value : '02:00',
      missedBehavior: missedBehaviorEl ? missedBehaviorEl.value : 'delete',
      notes: notesEl && notesEl.value ? notesEl.value : null,
    };

    if (editTaskId) {
      openScopeModal(title, 'ルール更新の反映範囲', 'このルールの変更に伴い、連動するGoogleカレンダーの予定をどう処理しますか？', async (scope) => {
        try {
          const resp = await fetch(`/api/rules/${editTaskId}?target=${scope}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (resp.ok) { resetForm(); await loadTasks(); }
          else { alert('更新に失敗しました: ' + await resp.text()); }
        } catch (err) { console.error(err); }
      });
    } else {
      try {
        const resp = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (resp.ok) { resetForm(); await loadTasks(); }
        else { alert('追加に失敗しました: ' + await resp.text()); }
      } catch (err) { console.error(err); }
    }
  });

  scheduleTypeSelect.addEventListener('change', renderScheduleDetails);
  cancelEditBtn.addEventListener('click', resetForm);

  function editTask(id: number) {
    const task = currentTasks.find((t) => t.id === id);
    if (!task) return;
    editTaskId = task.id;
    taskBtn!.textContent = 'ルールを更新する';
    cancelEditBtn!.style.display = 'inline-block';

    (document.getElementById('task-title') as HTMLInputElement).value = task.title || '';
    (document.getElementById('task-notes') as HTMLTextAreaElement).value = task.notes || '';
    (document.getElementById('task-reset-time') as HTMLInputElement).value = task.resetTime || '02:00';
    (document.getElementById('task-missed-behavior') as HTMLSelectElement).value = task.missedBehavior || 'delete';
    categorySelect!.value = task.groupId ? String(task.groupId) : '';
    scheduleTypeSelect!.value = task.interval || 'none';

    renderScheduleDetails();

    if (task.interval === 'period') {
      const periodStyleEl = document.getElementById('task-period-style') as HTMLSelectElement | null;
      const startEl = document.getElementById('task-start') as HTMLInputElement | null;
      const endEl = document.getElementById('task-end') as HTMLInputElement | null;
      if (periodStyleEl) periodStyleEl.value = task.periodStyle || 'routine';
      if (startEl) startEl.value = task.startAt || '';
      if (endEl) endEl.value = task.endAt || '';
    }
  }

  function triggerDelete(id: number) {
    const task = currentTasks.find((t) => t.id === id);
    if (!task) return;

    openScopeModal(task.title, 'ルールの削除確認', 'ルールを削除すると、紐づく日々の未完了TODOも削除されます。カレンダー連携の処理範囲を選択してください：', async (scope) => {
      try {
        const resp = await fetch(`/api/rules/${id}?target=${scope}`, { method: 'DELETE' });
        if (resp.ok) { await loadTasks(); }
        else { alert('削除に失敗しました'); }
      } catch (err) { console.error(err); }
    });
  }

  // 初期化
  renderScheduleDetails();
  loadTasks();
  loadCategories();
});
