import { toast } from './toast';

interface LogItem {
  logId: number;
  status: string;
  targetDate?: string;
  calendarEventId?: string | null;
  isCarriedOver?: boolean;
  group?: {
    id?: number;
    name?: string;
    color?: string;
  };
  rule: {
    id: number;
    title: string;
    notes?: string;
  };
}

interface GroupItem {
  id: number;
  slug: string;
  name: string;
  color?: string;
}

let allLogs: LogItem[] = [];
let availableGroups: GroupItem[] = [];
let selectedGroupId: number | 'all' = 'all';

async function fetchGroups(): Promise<GroupItem[]> {
  try {
    const res = await fetch('/api/groups');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch groups:', err);
  }
  return [];
}

async function loadLogs(): Promise<void> {
  try {
    const [logsRes, groupsData] = await Promise.all([
      fetch('/api/logs/today'),
      fetchGroups()
    ]);

    if (!logsRes.ok) {
      console.error('Failed to load logs');
      return;
    }

    allLogs = await logsRes.json();
    availableGroups = groupsData;

    renderGroupTabs();
    renderLogs();
  } catch (error) {
    console.error('Error loading logs:', error);
  }
}

function renderGroupTabs(): void {
  const tabsContainer = document.getElementById('group-filter-tabs');
  if (!tabsContainer) return;

  tabsContainer.innerHTML = '';

  // "すべて" タブ
  const allTab = document.createElement('button');
  allTab.className = `filter-tab ${selectedGroupId === 'all' ? 'active' : ''}`;
  allTab.textContent = `すべて (${allLogs.length})`;
  allTab.addEventListener('click', () => {
    selectedGroupId = 'all';
    renderGroupTabs();
    renderLogs();
  });
  tabsContainer.appendChild(allTab);

  // 各グループのタブ
  // ログに存在するグループ、または全登録グループを表示
  const groupsToDisplay = availableGroups.length > 0
    ? availableGroups
    : Array.from(new Set(allLogs.map(l => l.group?.id).filter(Boolean))).map(id => {
        const sample = allLogs.find(l => l.group?.id === id);
        return { id: id as number, slug: '', name: sample?.group?.name || 'グループ', color: sample?.group?.color };
      });

  groupsToDisplay.forEach(group => {
    const count = allLogs.filter(l => l.group?.id === group.id).length;
    const tab = document.createElement('button');
    tab.className = `filter-tab ${selectedGroupId === group.id ? 'active' : ''}`;
    
    if (group.color) {
      tab.style.setProperty('--group-color', group.color);
    }
    
    tab.innerHTML = `<span class="tab-color-dot" style="background-color: ${group.color || '#888'}"></span> ${group.name} (${count})`;
    tab.addEventListener('click', () => {
      selectedGroupId = group.id;
      renderGroupTabs();
      renderLogs();
    });
    tabsContainer.appendChild(tab);
  });
}

function renderLogs(): void {
  const list = document.getElementById('log-list');
  if (!list) return;

  // フィルタリング
  const filteredLogs = selectedGroupId === 'all'
    ? allLogs
    : allLogs.filter(item => item.group?.id === selectedGroupId);

  // 進捗バーの更新（表示中のリストに基づく進捗）
  updateProgressBar(filteredLogs);

  list.innerHTML = '';

  if (filteredLogs.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-message';
    emptyDiv.textContent = '対象のタスクはありません。';
    list.appendChild(emptyDiv);
    return;
  }

  filteredLogs.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = `log-item ${item.status === 'completed' ? 'completed' : ''}`;
    
    const colorBar = item.group?.color || '#3b82f6';
    itemDiv.style.borderLeftColor = colorBar;

    // チェックボックス
    const checkboxWrapper = document.createElement('label');
    checkboxWrapper.className = 'checkbox-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.status === 'completed';
    checkbox.addEventListener('change', async () => {
      const newStatus = checkbox.checked ? 'completed' : 'pending';
      item.status = newStatus; // 即時UI反映
      itemDiv.classList.toggle('completed', checkbox.checked);
      updateProgressBar(filteredLogs);
      await toggleStatus(item.logId, checkbox.checked);
    });

    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';

    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(checkmark);

    // 詳細コンテンツ
    const contentDiv = document.createElement('div');
    contentDiv.className = 'task-content';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'task-header';

    // グループバッジ
    if (item.group?.name) {
      const groupBadge = document.createElement('span');
      groupBadge.className = 'group-badge';
      groupBadge.textContent = item.group.name;
      if (item.group.color) {
        groupBadge.style.backgroundColor = item.group.color + '22'; // 透過カラー
        groupBadge.style.color = item.group.color;
        groupBadge.style.borderColor = item.group.color + '66';
      }
      headerDiv.appendChild(groupBadge);
    }

    // 繰越バッジ
    if (item.isCarriedOver) {
      const slideBadge = document.createElement('span');
      slideBadge.className = 'slide-badge';
      slideBadge.textContent = '繰越';
      headerDiv.appendChild(slideBadge);
    }

    // Google Calendar連携バッジ / 再同期ボタン
    const calBadge = document.createElement('span');
    if (item.calendarEventId) {
      calBadge.className = 'calendar-badge synced';
      calBadge.title = 'Google Calendar 同期完了';
      calBadge.innerHTML = '📅 <span class="badge-text">Calendar同期済</span>';
    } else {
      calBadge.className = 'calendar-badge unsynced';
      calBadge.title = 'クリックしてGoogle Calendarへ手動同期';
      calBadge.innerHTML = '⚠️ <span class="badge-text">カレンダー未同期 (クリックで同期)</span>';
      calBadge.style.cursor = 'pointer';
      calBadge.addEventListener('click', async (e) => {
        e.stopPropagation();
        calBadge.classList.add('syncing');
        calBadge.innerHTML = '⏳ <span class="badge-text">同期処理中...</span>';
        try {
          const syncRes = await fetch(`/api/logs/${item.logId}/sync-calendar`, { method: 'POST' });
          if (syncRes.ok) {
            const result = await syncRes.json();
            item.calendarEventId = result.calendarEventId;
            calBadge.className = 'calendar-badge synced';
            calBadge.style.cursor = 'default';
            calBadge.title = 'Google Calendar 同期完了';
            calBadge.innerHTML = '📅 <span class="badge-text">Calendar同期済</span>';
            toast.success('Google Calendar との同期に成功しました！');
          } else {
            const errJson = await syncRes.json().catch(() => ({}));
            toast.error(`カレンダー同期に失敗しました: ${errJson.error || '通信エラー'}`);
            calBadge.className = 'calendar-badge unsynced';
            calBadge.innerHTML = '⚠️ <span class="badge-text">カレンダー未同期 (クリックで同期)</span>';
          }
        } catch (err) {
          console.error('Calendar sync error:', err);
          toast.error('カレンダー同期処理中にエラーが発生しました');
          calBadge.className = 'calendar-badge unsynced';
          calBadge.innerHTML = '⚠️ <span class="badge-text">カレンダー未同期 (クリックで同期)</span>';
        }
      });
    }
    headerDiv.appendChild(calBadge);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = item.rule.title;
    headerDiv.appendChild(titleSpan);

    contentDiv.appendChild(headerDiv);

    if (item.rule.notes) {
      const notesDiv = document.createElement('div');
      notesDiv.className = 'task-notes';
      notesDiv.textContent = item.rule.notes;
      contentDiv.appendChild(notesDiv);
    }

    itemDiv.appendChild(checkboxWrapper);
    itemDiv.appendChild(contentDiv);
    list.appendChild(itemDiv);
  });
}

function updateProgressBar(logsToCalculate: LogItem[]): void {
  const total = logsToCalculate.length;
  const completed = logsToCalculate.filter(l => l.status === 'completed').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');

  if (progressText) {
    progressText.textContent = `${completed} / ${total} (${percent}%)`;
  }
  if (progressBarFill) {
    progressBarFill.style.width = `${percent}%`;
  }
}

async function toggleStatus(logId: number, isChecked: boolean): Promise<void> {
  try {
    await fetch(`/api/logs/${logId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isChecked ? 'completed' : 'pending' })
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    await loadLogs(); // エラー時は再読込して復元
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLogs();
  setupQuickAddModal();
});

function setupQuickAddModal(): void {
  const modal = document.getElementById('quick-add-modal');
  const openBtn = document.getElementById('open-quick-add-btn');
  const closeBtn = document.getElementById('close-quick-add-btn');
  const cancelBtn = document.getElementById('cancel-quick-add-btn');
  const form = document.getElementById('quick-add-form') as HTMLFormElement;
  const groupSelect = document.getElementById('quick-group') as HTMLSelectElement;

  if (!modal || !openBtn || !closeBtn || !cancelBtn || !form || !groupSelect) return;

  const openModal = async () => {
    // グループ選択肢の設定
    groupSelect.innerHTML = '<option value="">なし (グループなし)</option>';
    const groups = availableGroups.length > 0 ? availableGroups : await fetchGroups();
    groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.id.toString();
      opt.textContent = g.name;
      groupSelect.appendChild(opt);
    });
    modal.style.display = 'flex';
  };

  const closeModal = () => {
    modal.style.display = 'none';
    form.reset();
  };

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('quick-title') as HTMLInputElement;
    const notesInput = document.getElementById('quick-notes') as HTMLInputElement;
    const modeSelect = document.getElementById('quick-uncompleted-mode') as HTMLSelectElement;
    const resetTimeInput = document.getElementById('quick-reset-time') as HTMLInputElement;

    const payload = {
      title: titleInput.value.trim(),
      groupId: groupSelect.value ? parseInt(groupSelect.value) : null,
      notes: notesInput.value.trim() || undefined,
      uncompletedMode: modeSelect.value,
      resetTime: resetTimeInput.value || '04:00',
      syncGoogleCalendar: true
    };

    try {
      const createRes = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        toast.error(`エラー: ${errData.error || 'ルールの追加に失敗しました'}`);
        return;
      }

      // ルール作成後、本日のログも即時自動生成を促す
      await fetch('/api/logs/generate', { method: 'POST' });

      closeModal();
      toast.success('新しいルールを追加し、本日のタスクに反映しました！');
      await loadLogs();
    } catch (err) {
      console.error('Error creating rule:', err);
      toast.error('通信エラーが発生しました');
    }
  });
}
