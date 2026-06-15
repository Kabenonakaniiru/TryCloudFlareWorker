// src/client/admin.ts
import type { Group, Rule } from '../schema';

// 型を拡張して group プロパティを持つ Rule を定義
type RuleWithGroup = Rule & { group?: { name: string } };

async function init() {
  const [resGroups, resRules] = await Promise.all([
    fetch('/api/groups'),
    fetch('/api/rules')
  ]);

  const groups: Group[] = await resGroups.json();
  const rules: RuleWithGroup[] = await resRules.json(); // ここで型を指定

  const ruleList = document.getElementById('rule-list')!;
  const groupSelect = document.getElementById('groupId') as unknown as HTMLSelectElement;

  groupSelect.innerHTML = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
  ruleList.innerHTML = rules.map(r => `
    <li>
      ${r.title} ${r.group ? `[${r.group.name}]` : '[グループなし]'} 
      <button class="delete-btn" data-id="${r.id}">削除</button>
    </li>
  `).join('');

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).dataset.id;
      if (confirm('削除しますか？')) {
        await fetch(`/api/rules/${id}`, { method: 'DELETE' });
        location.reload();
      }
    });
  });
}

document.getElementById('add-btn')?.addEventListener('click', async () => {
  const title = (document.getElementById('title') as HTMLInputElement).value;
  const groupId = parseInt((document.getElementById('groupId') as unknown as HTMLSelectElement).value);
  await fetch('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, groupId })
  });
  location.reload();
});

document.getElementById('generate-btn')?.addEventListener('click', async () => {
  await fetch('/api/logs/generate', { method: 'POST' });
  alert('今日のログを生成しました！');
  location.reload();
});

init();