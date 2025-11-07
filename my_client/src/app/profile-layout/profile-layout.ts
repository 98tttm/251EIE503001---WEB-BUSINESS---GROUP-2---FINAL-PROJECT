import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LogoutConfirm } from '../logout-confirm/logout-confirm';

@Component({
  selector: 'app-profile-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutConfirm],
  templateUrl: './profile-layout.html',
  styleUrl: './profile-layout.css',
})
export class ProfileLayout implements OnInit {
  showLogoutConfirm = signal(false);

  // Sử dụng computed signal để tự động cập nhật khi authService.currentUser thay đổi
  fullName = computed(() => {
    const user = this.authService.currentUser();
    return user?.name || user?.phone || 'User';
  });

  phone = computed(() => {
    const user = this.authService.currentUser();
    return user?.phone || '';
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if logged in
    const loggedIn = this.authService.isLoggedIn();
    
    if (!loggedIn) {
      this.router.navigate(['/']);
      return;
    }
  }

  onLogout() {
    // Show confirmation popup instead of logging out directly
    this.showLogoutConfirm.set(true);
  }

  confirmLogout() {
    this.showLogoutConfirm.set(false);
    this.authService.logout();
    this.router.navigate(['/']);
  }

  cancelLogout() {
    this.showLogoutConfirm.set(false);
  }
}
