import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { NotificationCenterComponent } from '../../../shared/components/notification-center/notification-center.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NotificationCenterComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPage {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true]
  });

  readonly statusMessage = signal<string | null>(null);
  readonly loading = computed(() => this.auth.isLoading());

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.navigateAfterLogin();
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.statusMessage.set('Vui lòng nhập đầy đủ thông tin hợp lệ');
      return;
    }

    this.statusMessage.set(null);
    const { email, password } = this.form.getRawValue();

    const success = await this.auth.login({ email, password });

    if (success) {
      await this.navigateAfterLogin();
    }
  }

  get emailControl() {
    return this.form.controls.email;
  }

  get passwordControl() {
    return this.form.controls.password;
  }

  private async navigateAfterLogin(): Promise<void> {
    const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/dashboard';
    await this.router.navigateByUrl(redirect);
  }
}


