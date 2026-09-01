// src/client/groups.ts
import { toast } from './toast';

interface Group {
  id: number;
  slug: string;
  name: string;
  color: string;
}

const loadCategories = async () => {
  try {
    const res = await fetch('/api/groups');
    if (!res.ok) {
      toast.error('グループ一覧の取得に失敗しました');
      return;
    }
    const data: Group[] = await res.json();
    const body = document.getElementById('cat-list-body');
    if (!body) return;

    if (data.length === 0) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">登録されているグループはありません</td></tr>';
      return;
    }

    body.innerHTML = data.map(c => `
      <tr>
        <td>${c.id}</td>
        <td><code>${escapeHtml(c.slug)}</code></td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><span class="color-badge"><span class="color-preview" style="background:${escapeHtml(c.color)};"></span> ${escapeHtml(c.color)}</span></td>
        <td><button class="delete-cat-btn" data-id="${c.id}">削除</button></td>
      </tr>
    `).join('');

    body.querySelectorAll('.delete-cat-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const id = target.getAttribute('data-id');
        if (id) {
          await deleteCategory(id);
        }
      });
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    toast.error('エラーが発生しました');
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const deleteCategory = async (id: string) => {
  if (!confirm('このグループを削除しますか？\n（紐づいているルールは未分類になります）')) return;
  try {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      toast.success('グループを削除しました');
      await loadCategories();
    } else {
      const err = await res.json().catch(() => ({ error: '削除に失敗しました' }));
      toast.error(err.error || '削除に失敗しました');
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    toast.error('通信エラーが発生しました');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-cat-button');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const slugInput = document.getElementById('cat-slug') as HTMLInputElement;
      const nameInput = document.getElementById('cat-name') as HTMLInputElement;
      const colorInput = document.getElementById('cat-color') as HTMLInputElement;

      if (!slugInput || !nameInput || !colorInput) return;

      const slug = slugInput.value.trim();
      const name = nameInput.value.trim();
      const color = colorInput.value;

      if (!slug) {
        toast.warning('識別子を入力してください');
        slugInput.focus();
        return;
      }

      if (!name) {
        toast.warning('表示名を入力してください');
        nameInput.focus();
        return;
      }

      try {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, name, color })
        });

        if (res.ok) {
          toast.success('グループを追加しました');
          slugInput.value = '';
          nameInput.value = '';
          await loadCategories();
        } else {
          const err = await res.json().catch(() => ({ error: 'グループ追加に失敗しました' }));
          toast.error(err.error || 'グループ追加に失敗しました');
        }
      } catch (error) {
        console.error('Error adding category:', error);
        toast.error('通信エラーが発生しました');
      }
    });
  }

  loadCategories();
});
