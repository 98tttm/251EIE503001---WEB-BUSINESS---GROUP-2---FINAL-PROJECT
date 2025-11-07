import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-client-infor',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './client-infor.html',
  styleUrl: './client-infor.css',
})
export class ClientInfor implements OnInit {
  currentUser = signal<any>(null);
  isEditMode = signal(false);
  
  // Form data
  fullName = signal('');
  phone = signal('');
  gender = signal('');
  birthday = signal('');
  
  // Error message
  profileError = signal('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Load user data from AuthService
    const user = this.authService.currentUser();
    if (user) {
      this.currentUser.set(user);
      this.fullName.set(user.name || user.phone || '');
      this.phone.set(user.phone || '');
      this.gender.set(user.gender || 'Nam');
      this.birthday.set(user.birthday || '');
    }
  }

  toggleEditMode() {
    this.isEditMode.set(!this.isEditMode());
  }

  saveProfile() {
    this.profileError.set(''); // Clear previous error
    const name = this.fullName();
    const gender = this.gender();
    const birthday = this.birthday();

    if (!name) {
      this.profileError.set('Vui lòng nhập họ và tên!');
      return;
    }

    // Call API to update profile
    this.authService.updateProfile(name, gender, birthday).subscribe({
      next: (response) => {
        if (response.success) {
          this.profileError.set('');
          this.isEditMode.set(false);
          // Reload user data from AuthService
          const user = this.authService.currentUser();
          if (user) {
            this.currentUser.set(user);
            this.fullName.set(user.name || user.phone || '');
            this.phone.set(user.phone || '');
            this.gender.set(user.gender || 'Nam');
            this.birthday.set(user.birthday || '');
          }
        } else {
          this.profileError.set(response.message || 'Cập nhật thất bại!');
        }
      },
      error: (error) => {
        console.error('Update profile error:', error);
        this.profileError.set(error.error?.message || 'Cập nhật thông tin thất bại. Vui lòng thử lại!');
      }
    });
  }
}
