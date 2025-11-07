import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (state().isOpen) {
      <div class="modal-backdrop" (click)="cancel()"></div>
      <div class="confirmation-dialog" role="dialog" aria-modal="true">
        <div class="dialog-icon" [ngClass]="state().icon">
          <span class="material-icon">
            @switch (state().icon) {
              @case ('warning') { warning }
              @case ('danger') { error }
              @case ('info') { info }
              @default { help }
            }
          </span>
        </div>
        <h2 class="dialog-title">{{ state().title }}</h2>
        <p class="dialog-message">{{ state().message }}</p>
        <div class="dialog-actions">
          <button 
            type="button" 
            class="btn btn-ghost" 
            (click)="cancel()"
          >
            {{ state().cancelText }}
          </button>
          <button 
            type="button" 
            class="btn"
            [ngClass]="'btn-' + state().confirmButtonClass"
            (click)="confirm()"
            autofocus
          >
            {{ state().confirmText }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(2px);
      z-index: 9998;
      animation: fadeIn 0.2s ease;
    }

    .confirmation-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 1.5rem;
      padding: 2.5rem;
      box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
      z-index: 9999;
      min-width: 400px;
      max-width: 500px;
      animation: slideIn 0.3s ease;
      text-align: center;
    }

    .dialog-icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
    }

    .dialog-icon.warning {
      background: rgba(251, 191, 36, 0.15);
      color: #f59e0b;
    }

    .dialog-icon.danger {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .dialog-icon.info {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
    }

    .dialog-icon.question {
      background: rgba(99, 102, 241, 0.15);
      color: #6366f1;
    }

    .dialog-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 1rem;
    }

    .dialog-message {
      font-size: 1rem;
      color: #475569;
      line-height: 1.6;
      margin: 0 0 2rem;
    }

    .dialog-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
    }

    .btn-ghost {
      background: #f8fafc;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .btn-ghost:hover {
      background: #f1f5f9;
    }

    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.2);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px rgba(37, 99, 235, 0.3);
    }

    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);
    }

    .btn-danger:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px rgba(239, 68, 68, 0.3);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -45%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    @media (max-width: 640px) {
      .confirmation-dialog {
        min-width: auto;
        width: 90%;
        padding: 2rem 1.5rem;
      }

      .dialog-actions {
        flex-direction: column-reverse;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class ConfirmationDialogComponent {
  protected readonly confirmationService = inject(ConfirmationService);
  protected readonly state = this.confirmationService.state;

  confirm(): void {
    this.confirmationService.handleConfirm();
  }

  cancel(): void {
    this.confirmationService.handleCancel();
  }
}

