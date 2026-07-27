interface LogItem {
  logId: number;
  status: string;
  group?: {
    name?: string;
    color?: string;
  };
  rule: {
    title: string;
  };
}

async function loadLogs(): Promise<void> {
  const list = document.getElementById('log-list');
  if (!list) return;

  try {
    const res = await fetch('/api/logs/today');
    if (!res.ok) {
      console.error('Failed to load logs');
      return;
    }
    const logs: LogItem[] = await res.json();

    list.innerHTML = '';
    logs.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'log-item';
      if (item.group?.color) {
        itemDiv.style.borderLeftColor = item.group.color;
      }

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.status === 'completed';
      checkbox.addEventListener('change', async () => {
        await toggleStatus(item.logId, checkbox.checked);
      });

      const span = document.createElement('span');
      span.textContent = `${item.group?.name || '未分類'} - ${item.rule.title}`;

      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(span);
      list.appendChild(itemDiv);
    });
  } catch (error) {
    console.error('Error loading logs:', error);
  }
}

async function toggleStatus(logId: number, isChecked: boolean): Promise<void> {
  try {
    await fetch(`/api/logs/${logId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isChecked ? 'completed' : 'pending' })
    });
    await loadLogs();
  } catch (error) {
    console.error('Error toggling status:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadLogs();
});
