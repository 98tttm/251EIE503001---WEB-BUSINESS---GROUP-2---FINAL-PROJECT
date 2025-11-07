import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.css'
})
export class NotificationCenterComponent {
  private readonly notifier = inject(NotificationService);

  readonly notifications = this.notifier.notifications;

  protected trackById = (_: number, item: { id: string }) => item.id;

  dismiss(id: string) {
    this.notifier.dismiss(id);
  }
}


