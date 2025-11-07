import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-medicine-request',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './medicine-request.html',
  styleUrl: './medicine-request.css'
})
export class MedicineRequest implements OnInit {
  // Form fields
  fullName = signal('');
  phoneNumber = signal('');
  notes = signal('');
  prescriptionImages = signal<string[]>([]);
  medicineNames = signal<string[]>([]);
  
  // UI states
  loading = signal(false);
  submitting = signal(false);
  showImageUpload = signal(false);
  showMedicineInput = signal(false);
  newMedicineName = signal('');
  
  // Image upload
  selectedImages: File[] = [];
  imagePreviewUrls = signal<string[]>([]);
  
  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Pre-fill user info if logged in
    const user = this.authService.currentUser();
    if (user) {
      this.fullName.set(user.name || '');
      this.phoneNumber.set(user.phone || '');
    }
  }

  // Add medicine name
  addMedicine() {
    const name = this.newMedicineName().trim();
    if (name) {
      this.medicineNames.update(names => [...names, name]);
      this.newMedicineName.set('');
      this.showMedicineInput.set(false);
    }
  }

  // Remove medicine name
  removeMedicine(index: number) {
    this.medicineNames.update(names => names.filter((_, i) => i !== index));
  }

  // Handle image selection
  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      
      // Validate file types and size
      const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
          alert(`File ${file.name} không phải là hình ảnh`);
          return false;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          alert(`File ${file.name} quá lớn (tối đa 5MB)`);
          return false;
        }
        return true;
      });

      // Add to selected images
      this.selectedImages = [...this.selectedImages, ...validFiles];

      // Create preview URLs
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagePreviewUrls.update(urls => [...urls, e.target.result]);
        };
        reader.readAsDataURL(file);
      });
    }
    
    // Reset input
    input.value = '';
  }

  // Remove image
  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.update(urls => urls.filter((_, i) => i !== index));
  }

  // Upload images to server
  async uploadImages(): Promise<string[]> {
    if (this.selectedImages.length === 0) {
      return [];
    }

    const uploadedUrls: string[] = [];
    
    for (const file of this.selectedImages) {
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch('http://localhost:3000/api/upload/image', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (data?.success && data.url) {
          uploadedUrls.push(data.url);
        } else {
          console.error('Upload failed:', data?.error);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }

    return uploadedUrls;
  }

  // Submit form
  async submitRequest() {
    // Validation
    if (!this.fullName().trim()) {
      alert('Vui lòng nhập họ và tên');
      return;
    }

    if (!this.phoneNumber().trim()) {
      alert('Vui lòng nhập số điện thoại');
      return;
    }

    // Validate phone number format (Vietnamese)
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(this.phoneNumber().trim().replace(/\s/g, ''))) {
      alert('Vui lòng nhập số điện thoại hợp lệ (10 số, bắt đầu bằng 0)');
      return;
    }

    this.submitting.set(true);

    try {
      // Upload images first
      const imageUrls = await this.uploadImages();

      // Get user ID if logged in
      const user = this.authService.currentUser();
      const userId = user?.userId || null;

      // Prepare request data
      const requestData = {
        userId: userId,
        fullName: this.fullName().trim(),
        phoneNumber: this.phoneNumber().trim().replace(/\s/g, ''),
        notes: this.notes().trim(),
        prescriptionImages: imageUrls,
        medicineNames: this.medicineNames(),
        status: 'pending', // pending, contacted, completed, cancelled
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Submit to backend
      const response = await this.http.post<{ success: boolean; data?: any; message?: string }>(
        'http://localhost:3000/api/medicine-requests',
        requestData
      ).toPromise();

      if (response?.success) {
        alert('Yêu cầu của bạn đã được gửi thành công! Dược sĩ sẽ liên hệ với bạn sớm nhất.');
        
        // Clear form
        this.fullName.set('');
        this.phoneNumber.set('');
        this.notes.set('');
        this.medicineNames.set([]);
        this.selectedImages = [];
        this.imagePreviewUrls.set([]);
        
        // Navigate back to home
        this.router.navigate(['/']);
      } else {
        throw new Error(response?.message || 'Không thể gửi yêu cầu');
      }
    } catch (error: any) {
      console.error('Error submitting request:', error);
      alert(error?.error?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      this.submitting.set(false);
    }
  }

  // Navigate back
  goBack() {
    this.router.navigate(['/']);
  }
}

