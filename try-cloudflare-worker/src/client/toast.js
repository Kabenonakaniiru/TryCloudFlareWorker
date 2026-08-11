class ToastManager {
    container = null;
    ensureContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        return this.container;
    }
    show(message, type = 'info', duration = 3500) {
        const container = this.ensureContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let icon = 'ℹ️';
        if (type === 'success')
            icon = '✅';
        else if (type === 'error')
            icon = '❌';
        else if (type === 'warning')
            icon = '⚠️';
        toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="閉じる">&times;</button>
    `;
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.dismiss(toast));
        }
        container.appendChild(toast);
        // アニメーション用リフロー強制
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }
    }
    success(message, duration) {
        this.show(message, 'success', duration);
    }
    error(message, duration) {
        this.show(message, 'error', duration);
    }
    info(message, duration) {
        this.show(message, 'info', duration);
    }
    warning(message, duration) {
        this.show(message, 'warning', duration);
    }
    dismiss(toast) {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, { once: true });
    }
}
export const toast = new ToastManager();
