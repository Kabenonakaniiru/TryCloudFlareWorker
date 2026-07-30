"use strict";
const loadCategories = async () => {
    try {
        const res = await fetch('/api/groups');
        if (!res.ok) {
            console.error('Failed to fetch groups');
            return;
        }
        const data = await res.json();
        const body = document.getElementById('cat-list-body');
        if (!body)
            return;
        body.innerHTML = data.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.slug}</td>
        <td>${c.name}</td>
        <td><span style="display:inline-block; width:20px; height:20px; background:${c.color}; border:1px solid #000;"></span> ${c.color}</td>
        <td><button class="delete-cat-btn" data-id="${c.id}">削除</button></td>
      </tr>
    `).join('');
        body.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const target = e.currentTarget;
                const id = target.getAttribute('data-id');
                if (id) {
                    await deleteCategory(id);
                }
            });
        });
    }
    catch (error) {
        console.error('Error loading categories:', error);
    }
};
const deleteCategory = async (id) => {
    if (!confirm('削除しますか？'))
        return;
    try {
        await fetch(`/api/groups/${id}`, {
            method: 'DELETE'
        });
        await loadCategories();
    }
    catch (error) {
        console.error('Error deleting category:', error);
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('add-cat-button');
    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            const slugInput = document.getElementById('cat-slug');
            const nameInput = document.getElementById('cat-name');
            const colorInput = document.getElementById('cat-color');
            if (!slugInput || !nameInput || !colorInput)
                return;
            const slug = slugInput.value;
            const name = nameInput.value;
            const color = colorInput.value;
            try {
                await fetch('/api/groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug, name, color })
                });
                slugInput.value = '';
                nameInput.value = '';
                await loadCategories();
            }
            catch (error) {
                console.error('Error adding category:', error);
            }
        });
    }
    loadCategories();
});
