import { Injectable, signal } from '@angular/core';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: 'warning' | 'danger' | 'info' | 'question';
  confirmButtonClass?: string;
}

interface ConfirmationState extends ConfirmationConfig {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

/**
 * Service to show confirmation dialogs
 * Usage:
 * const confirmed = await this.confirmationService.confirm({
 *   title: 'Xóa sản phẩm?',
 *   message: 'Bạn có chắc muốn xóa sản phẩm này không?',
 *   icon: 'danger'
 * });
 * if (confirmed) {
 *   // Do delete
 * }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly _state = signal<ConfirmationState>({
    title: '',
    message: '',
    isOpen: false
  });

  readonly state = this._state.asReadonly();

  confirm(config: ConfirmationConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this._state.set({
        ...config,
        confirmText: config.confirmText || 'Xác nhận',
        cancelText: config.cancelText || 'Hủy',
        icon: config.icon || 'question',
        confirmButtonClass: config.confirmButtonClass || 'primary',
        isOpen: true,
        resolve
      });
    });
  }

  handleConfirm(): void {
    const state = this._state();
    if (state.resolve) {
      state.resolve(true);
    }
    this.close();
  }

  handleCancel(): void {
    const state = this._state();
    if (state.resolve) {
      state.resolve(false);
    }
    this.close();
  }

  private close(): void {
    this._state.update(state => ({
      ...state,
      isOpen: false
    }));
  }
}

