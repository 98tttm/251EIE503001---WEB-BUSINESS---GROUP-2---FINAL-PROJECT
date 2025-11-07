import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
  @if (toasts().length > 0) {
    <div class="toast-container">
      @for (toast of toasts(); track toast.id; let idx = $index) {
        <div class="toast toast-{{toast.type}}"
             [style.animation-delay.ms]="idx * 50"
             [class.removing]="isRemoving(toast.id)"
             (mouseenter)="pauseTimeout(toast.id)" 
             (mouseleave)="resumeTimeout(toast.id)">
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" (click)="remove(toast.id)">&times;</button>
        </div>
      }
    </div>
  }
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 30px;
      right: 30px;
      z-index: 12000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }
    
    @keyframes slideInBounceRight {
      0% {
        opacity: 0;
        transform: translateX(calc(100% + 20px)) scale(0.8);
      }
      60% {
        opacity: 1;
        transform: translateX(-10px) scale(1.05);
      }
      80% {
        transform: translateX(5px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }
    
    @keyframes slideOutRight {
      0% {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      100% {
        opacity: 0;
        transform: translateX(calc(100% + 20px)) scale(0.8);
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 6px 30px rgba(0, 102, 204, 0.3);
      }
      50% {
        box-shadow: 0 6px 40px rgba(0, 102, 204, 0.5);
      }
    }
    
    .toast {
      min-width: 280px;
      max-width: 380px;
      background: linear-gradient(135deg, #0066cc 0%, #003b8e 100%);
      color: #fff;
      border-radius: 8px;
      padding: 16px 20px;
      box-shadow: 0 6px 30px rgba(0, 102, 204, 0.3);
      font-size: 15px;
      display: flex; 
      align-items: center;
      gap: 12px;
      animation: slideInBounceRight 0.6s cubic-bezier(.34,1.56,.64,1) forwards;
      pointer-events: auto;
      font-weight: 500;
    }
    
    .toast.removing {
      animation: slideOutRight 0.35s cubic-bezier(.51,1,.37,1) forwards;
    }
    
    .toast-success {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      box-shadow: 0 6px 30px rgba(34, 197, 94, 0.3);
    }
    .toast-error {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 6px 30px rgba(239, 68, 68, 0.3);
    }
    .toast-info {
      background: linear-gradient(135deg, #1867c0 0%, #0d4a94 100%);
      box-shadow: 0 6px 30px rgba(24, 103, 192, 0.3);
    }
    .toast-warning {
      background: linear-gradient(135deg, #f59e42 0%, #d97706 100%);
      box-shadow: 0 6px 30px rgba(245, 158, 66, 0.3);
    }
    
    .toast-message {
      flex: 1; 
      word-break: break-word;
    }
    
    .toast-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      color: #fff;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      pointer-events: auto;
      flex-shrink: 0;
    }
    .toast-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
  `]
})
export class ToastNotification {
  toasts = ToastService.toasts;
  manualTimeouts: Record<string, any> = {};
  removingIds = signal<Set<string>>(new Set());

  remove(id: string) {
    this.removingIds.update(ids => new Set([...ids, id]));
    setTimeout(() => {
      ToastService.remove(id);
      this.removingIds.update(ids => {
        const newIds = new Set(ids);
        newIds.delete(id);
        return newIds;
      });
    }, 300); // Wait for animation to complete
  }

  isRemoving(id: string): boolean {
    return this.removingIds().has(id);
  }

  pauseTimeout(id: string) {
    if (this.manualTimeouts[id]) {
      clearTimeout(this.manualTimeouts[id]);
      this.manualTimeouts[id] = null;
    }
  }
  resumeTimeout(id: string) {
    // nothing, as timeout is handled outside by service
  }
}
