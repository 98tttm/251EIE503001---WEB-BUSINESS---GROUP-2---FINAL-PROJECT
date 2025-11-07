import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-confirm',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logout-confirm.html',
  styleUrl: './logout-confirm.css',
})
export class LogoutConfirm {
  @Output() confirmLogout = new EventEmitter<void>();
  @Output() cancelLogout = new EventEmitter<void>();

  onConfirm() {
    this.confirmLogout.emit();
  }

  onCancel() {
    this.cancelLogout.emit();
  }
}

