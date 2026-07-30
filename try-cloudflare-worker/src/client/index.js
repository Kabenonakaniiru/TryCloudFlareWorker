"use strict";
let allLogs = [];
let availableGroups = [];
let selectedGroupId = 'all';
async function fetchGroups() {
    try {
        const res = await fetch('/api/groups');
        if (res.ok) {
            return await res.json();
        }
    }
    catch (err) {
        console.error('Failed to fetch groups:', err);
    }
    return [];
}
async function loadLogs() {
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
    }
    catch (error) {
        console.error('Error loading logs:', error);
    }
}
function renderGroupTabs() {
    const tabsContainer = document.getElementById('group-filter-tabs');
    if (!tabsContainer)
        return;
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
            return { id: id, slug: '', name: sample?.group?.name || 'グループ', color: sample?.group?.color };
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
function renderLogs() {
    const list = document.getElementById('log-list');
    if (!list)
        return;
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
function updateProgressBar(logsToCalculate) {
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
async function toggleStatus(logId, isChecked) {
    try {
        await fetch(`/api/logs/${logId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isChecked ? 'completed' : 'pending' })
        });
    }
    catch (error) {
        console.error('Error toggling status:', error);
        await loadLogs(); // エラー時は再読込して復元
    }
}
document.addEventListener('DOMContentLoaded', () => {
    loadLogs();
});
