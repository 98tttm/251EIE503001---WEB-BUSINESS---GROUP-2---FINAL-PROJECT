import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  // Auth popup states
  showLoginPopup = signal(false);
  showRegisterPopup = signal(false);
  showForgotPasswordPopup = signal(false);
  showOtpPopup = signal(false);
  showResetPasswordPopup = signal(false);
  
  // Auth form data
  loginEmail = signal('');
  loginPassword = signal('');
  registerEmail = signal('');
  registerPassword = signal('');
  registerConfirmPassword = signal('');
  registerPhone = signal('');
  forgotEmail = signal('');
  otpCode = signal('');
  
  // OTP individual digits
  otp1 = signal('');
  otp2 = signal('');
  otp3 = signal('');
  otp4 = signal('');
  otp5 = signal('');
  otp6 = signal('');
  
  // New password for reset
  newPassword = signal('');
  confirmNewPassword = signal('');
  
  // Password visibility toggles
  showLoginPassword = signal(false);
  showRegisterPassword = signal(false);
  showRegisterConfirmPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmNewPassword = signal(false);
  
  // Error messages
  loginError = signal('');
  registerError = signal('');
  forgotPasswordError = signal('');
  otpError = signal('');
  resetPasswordError = signal('');
  
  // User state
  isLoggedIn = signal(false);
  currentUser = signal<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Sync với AuthService
    this.isLoggedIn = this.authService.isLoggedIn;
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit() {
    // Watch for popup changes and toggle blur
    this.watchPopupState();
  }

  private watchPopupState() {
    // Use effect to watch popup signals
    setInterval(() => {
      const anyPopupOpen = this.showLoginPopup() || this.showRegisterPopup() || 
                           this.showForgotPasswordPopup() || this.showOtpPopup() || 
                           this.showResetPasswordPopup();
      
      const topBar = document.querySelector('.top-bar');
      const mainHeader = document.querySelector('.main-header');
      
      if (anyPopupOpen) {
        topBar?.classList.add('blur-background');
        mainHeader?.classList.add('blur-background');
      } else {
        topBar?.classList.remove('blur-background');
        mainHeader?.classList.remove('blur-background');
      }
    }, 100);
  }

  // ==================== AUTH POPUP METHODS ====================
  
  // Open/Close popup methods
  openLoginPopup() {
    this.showLoginPopup.set(true);
    this.closeAllOtherPopups('login');
  }

  openRegisterPopup() {
    this.showRegisterPopup.set(true);
    this.closeAllOtherPopups('register');
  }

  openForgotPasswordPopup() {
    this.showForgotPasswordPopup.set(true);
    this.closeAllOtherPopups('forgot');
  }

  openOtpPopup() {
    this.showOtpPopup.set(true);
    this.closeAllOtherPopups('otp');
  }

  openResetPasswordPopup() {
    this.showResetPasswordPopup.set(true);
    this.closeAllOtherPopups('reset');
  }

  closeAllPopups() {
    this.showLoginPopup.set(false);
    this.showRegisterPopup.set(false);
    this.showForgotPasswordPopup.set(false);
    this.showOtpPopup.set(false);
    this.showResetPasswordPopup.set(false);
  }

  private closeAllOtherPopups(except: string) {
    if (except !== 'login') this.showLoginPopup.set(false);
    if (except !== 'register') this.showRegisterPopup.set(false);
    if (except !== 'forgot') this.showForgotPasswordPopup.set(false);
    if (except !== 'otp') this.showOtpPopup.set(false);
    if (except !== 'reset') this.showResetPasswordPopup.set(false);
  }

  // Switch between popups
  switchToRegister() {
    this.openRegisterPopup();
  }

  switchToLogin() {
    this.openLoginPopup();
  }

  switchToForgotPassword() {
    this.openForgotPasswordPopup();
  }

  // Login method
  async onLogin() {
    this.loginError.set(''); // Clear previous error
    const email = this.loginEmail();
    const password = this.loginPassword();

    if (!email || !password) {
      this.loginError.set('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    try {
      // Gọi API login
      this.authService.login(email, password).subscribe({
        next: (response) => {
          if (response.success) {
            this.loginError.set('');
            this.closeAllPopups();
            // Clear form
            this.loginEmail.set('');
            this.loginPassword.set('');
            
            // Check for redirect path
            const redirectPath = localStorage.getItem('loginRedirect');
            if (redirectPath) {
              localStorage.removeItem('loginRedirect');
              // Navigate to the redirect path
              this.router.navigate([redirectPath]);
            }
          } else {
            this.loginError.set(response.message || 'Đăng nhập thất bại!');
          }
        },
        error: (error) => {
          console.error('Login error:', error);
          this.loginError.set(error.error?.message || 'Email hoặc mật khẩu không đúng!');
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      this.loginError.set('Đăng nhập thất bại. Vui lòng thử lại!');
    }
  }

  // Register method
  async onRegister() {
    this.registerError.set(''); // Clear previous error
    const email = this.registerEmail();
    const password = this.registerPassword();
    const confirmPassword = this.registerConfirmPassword();
    const phone = this.registerPhone();

    if (!email || !password || !confirmPassword || !phone) {
      this.registerError.set('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    if (password !== confirmPassword) {
      this.registerError.set('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      // Gọi API register
      this.authService.register(email, password, phone).subscribe({
        next: (response) => {
          if (response.success) {
            this.registerError.set('');
            // Clear form
            this.registerEmail.set('');
            this.registerPassword.set('');
            this.registerConfirmPassword.set('');
            this.registerPhone.set('');
            
            // Chuyển sang popup login
            this.switchToLogin();
          } else {
            this.registerError.set(response.message || 'Đăng ký thất bại!');
          }
        },
        error: (error) => {
          console.error('Register error:', error);
          this.registerError.set(error.error?.message || 'Email hoặc số điện thoại đã được sử dụng!');
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      this.registerError.set('Đăng ký thất bại. Vui lòng thử lại!');
    }
  }

  // Forgot password method
  async onForgotPassword() {
    this.forgotPasswordError.set(''); // Clear previous error
    const email = this.forgotEmail();

    if (!email) {
      this.forgotPasswordError.set('Vui lòng nhập email!');
      return;
    }

    try {
      // Gọi API gửi OTP
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          if (response.success) {
            this.forgotPasswordError.set('');
            this.openOtpPopup();
          } else {
            this.forgotPasswordError.set(response.message || 'Gửi OTP thất bại!');
          }
        },
        error: (error) => {
          console.error('Forgot password error:', error);
          this.forgotPasswordError.set(error.error?.message || 'Email không tồn tại trong hệ thống!');
        }
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      this.forgotPasswordError.set('Gửi mã OTP thất bại. Vui lòng thử lại!');
    }
  }

  // Handle OTP input navigation
  onOtpInput(event: any, nextInputId: string | null) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      input.value = '';
      return;
    }

    // Auto focus to next input
    if (value && nextInputId) {
      const nextInput = document.getElementById(nextInputId) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  // Handle backspace in OTP inputs
  onOtpKeydown(event: KeyboardEvent, prevInputId: string | null) {
    const input = event.target as HTMLInputElement;
    
    if (event.key === 'Backspace' && !input.value && prevInputId) {
      const prevInput = document.getElementById(prevInputId) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  // Verify OTP method - Chỉ verify OTP
  async onVerifyOtp() {
    this.otpError.set(''); // Clear previous error
    const otp = this.otp1() + this.otp2() + this.otp3() + this.otp4() + this.otp5() + this.otp6();
    const email = this.forgotEmail();

    console.log('🔍 Frontend - Verifying OTP:', { email, otp, otpLength: otp.length });

    if (!otp || otp.length !== 6) {
      this.otpError.set('Vui lòng nhập đầy đủ mã OTP 6 số!');
      return;
    }

    try {
      // Gọi API verify OTP (không reset password)
      console.log('📤 Frontend - Calling verifyOTPOnly API...');
      this.authService.verifyOTPOnly(email, otp).subscribe({
        next: (response) => {
          console.log('✅ Frontend - API Response:', response);
          if (response.success) {
            // OTP đúng, lưu lại và chuyển sang popup đặt mật khẩu mới
            console.log('✅ Frontend - OTP verified, opening reset password popup');
            this.otpCode.set(otp);
            this.otpError.set('');
            this.openResetPasswordPopup();
          } else {
            console.log('❌ Frontend - OTP verification failed:', response.message);
            this.otpError.set(response.message || 'Xác thực OTP thất bại!');
          }
        },
        error: (error) => {
          console.error('❌ Frontend - Verify OTP error:', error);
          this.otpError.set(error.error?.message || 'Mã OTP không đúng hoặc đã hết hạn!');
        }
      });
    } catch (error) {
      console.error('❌ Frontend - Verify OTP exception:', error);
      this.otpError.set('Xác thực OTP thất bại. Vui lòng thử lại!');
    }
  }

  // Reset password method - Đặt lại mật khẩu sau khi verify OTP
  async onResetPassword() {
    this.resetPasswordError.set(''); // Clear previous error
    const email = this.forgotEmail();
    const otp = this.otpCode();
    const newPassword = this.newPassword();
    const confirmPassword = this.confirmNewPassword();

    if (!newPassword || !confirmPassword) {
      this.resetPasswordError.set('Vui lòng nhập mật khẩu mới!');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.resetPasswordError.set('Mật khẩu xác nhận không khớp!');
      return;
    }

    try {
      // Gọi API verify OTP và reset password
      this.authService.verifyOTP(email, otp, newPassword).subscribe({
        next: (response) => {
          if (response.success) {
            this.resetPasswordError.set('');
            // Clear all inputs
            this.otp1.set('');
            this.otp2.set('');
            this.otp3.set('');
            this.otp4.set('');
            this.otp5.set('');
            this.otp6.set('');
            this.newPassword.set('');
            this.confirmNewPassword.set('');
            this.forgotEmail.set('');
            this.otpCode.set('');
            
            // Chuyển về popup login
            this.switchToLogin();
          } else {
            this.resetPasswordError.set(response.message || 'Đặt lại mật khẩu thất bại!');
          }
        },
        error: (error) => {
          console.error('Reset password error:', error);
          this.resetPasswordError.set(error.error?.message || 'Mã OTP không đúng hoặc đã hết hạn!');
        }
      });
    } catch (error) {
      console.error('Reset password error:', error);
      this.resetPasswordError.set('Đặt lại mật khẩu thất bại. Vui lòng thử lại!');
    }
  }

  // Logout method
  onLogout() {
    this.authService.logout();
    this.loginEmail.set('');
    this.loginPassword.set('');
    // Popup confirmation được xử lý bởi Header/ProfileLayout component
  }

  // Password toggle methods
  toggleLoginPassword() {
    this.showLoginPassword.set(!this.showLoginPassword());
  }

  toggleRegisterPassword() {
    this.showRegisterPassword.set(!this.showRegisterPassword());
  }

  toggleRegisterConfirmPassword() {
    this.showRegisterConfirmPassword.set(!this.showRegisterConfirmPassword());
  }

  toggleNewPassword() {
    this.showNewPassword.set(!this.showNewPassword());
  }

  toggleConfirmNewPassword() {
    this.showConfirmNewPassword.set(!this.showConfirmNewPassword());
  }
}

