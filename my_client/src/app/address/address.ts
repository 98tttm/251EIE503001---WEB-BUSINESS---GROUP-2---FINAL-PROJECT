import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { AddressService, AddressData } from '../services/address.service';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './address.html',
  styleUrl: './address.css',
})
export class Address implements OnInit {
  addresses = signal<AddressData[]>([]);
  showAddressPopup = signal(false);
  isEditMode = signal(false);
  currentEditId = signal<string | null>(null);
  
  // Form data
  formName = signal('');
  formPhone = signal('');
  formProvince = signal('');
  formDistrict = signal('');
  formWard = signal('');
  formDetailAddress = signal('');
  formDeliveryTime = signal<'before' | 'after'>('before');
  formIsDefault = signal(false);

  // Province/District/Ward data from API
  provinces = signal<any[]>([]);
  districts = signal<any[]>([]);
  wards = signal<any[]>([]);
  
  selectedProvinceId = signal<string>('');
  selectedDistrictId = signal<string>('');
  
  // Error message
  addressError = signal('');

  constructor(
    private authService: AuthService,
    private addressService: AddressService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProvinces();
    this.loadAddresses();
  }

  loadProvinces() {
    this.addressService.getProvinces().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.provinces.set(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading provinces:', error);
      }
    });
  }

  onProvinceChange(provinceId: string) {
    this.selectedProvinceId.set(provinceId);
    this.districts.set([]);
    this.wards.set([]);
    this.formDistrict.set('');
    this.formWard.set('');
    
    if (provinceId) {
      this.addressService.getDistricts(provinceId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.districts.set(response.data);
          }
        },
        error: (error) => {
          console.error('Error loading districts:', error);
        }
      });
    }
  }

  onDistrictChange(districtId: string) {
    this.selectedDistrictId.set(districtId);
    this.wards.set([]);
    this.formWard.set('');
    
    if (districtId) {
      this.addressService.getWards(districtId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.wards.set(response.data);
          }
        },
        error: (error) => {
          console.error('Error loading wards:', error);
        }
      });
    }
  }

  loadAddresses() {
    this.addressService.getAddresses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Sắp xếp: địa chỉ mặc định lên đầu
          const sortedAddresses = response.data.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return 0;
          });
          this.addresses.set(sortedAddresses);
        }
      },
      error: (error) => {
        console.error('Error loading addresses:', error);
      }
    });
  }

  openAddPopup() {
    this.isEditMode.set(false);
    this.currentEditId.set(null);
    this.resetForm();
    this.showAddressPopup.set(true);
  }

  openEditPopup(address: AddressData) {
    this.isEditMode.set(true);
    this.currentEditId.set(address._id || null);
    this.formName.set(address.name);
    this.formPhone.set(address.phone);
    this.formProvince.set(address.province);
    this.formDistrict.set(address.district);
    this.formWard.set(address.ward);
    this.formDetailAddress.set(address.detailAddress);
    this.formDeliveryTime.set(address.deliveryTime);
    this.formIsDefault.set(address.isDefault);
    this.showAddressPopup.set(true);
  }

  closePopup() {
    this.showAddressPopup.set(false);
    this.resetForm();
  }

  resetForm() {
    this.formName.set('');
    this.formPhone.set('');
    this.formProvince.set('');
    this.formDistrict.set('');
    this.formWard.set('');
    this.formDetailAddress.set('');
    this.formDeliveryTime.set('before');
    this.formIsDefault.set(false);
    this.addressError.set(''); // Clear error when resetting form
  }

  onSubmit() {
    this.addressError.set(''); // Clear previous error
    // Validation
    if (!this.formName() || !this.formPhone() || !this.formProvince() || 
        !this.formDistrict() || !this.formWard() || !this.formDetailAddress()) {
      this.addressError.set('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    const addressData: AddressData = {
      name: this.formName(),
      phone: this.formPhone(),
      province: this.formProvince(),
      district: this.formDistrict(),
      ward: this.formWard(),
      detailAddress: this.formDetailAddress(),
      deliveryTime: this.formDeliveryTime(),
      isDefault: this.formIsDefault()
    };

    if (this.isEditMode()) {
      // Update existing address
      const addressId = this.currentEditId()!;
      this.addressService.updateAddress(addressId, addressData).subscribe({
        next: (response) => {
          if (response.success) {
            this.addressError.set('');
            this.loadAddresses();
            this.closePopup();
          } else {
            this.addressError.set(response.message || 'Cập nhật địa chỉ thất bại!');
          }
        },
        error: (error) => {
          console.error('Error updating address:', error);
          this.addressError.set(error.error?.message || 'Cập nhật địa chỉ thất bại. Vui lòng thử lại!');
        }
      });
    } else {
      // Add new address
      this.addressService.addAddress(addressData).subscribe({
        next: (response) => {
          if (response.success) {
            this.addressError.set('');
            this.loadAddresses();
            this.closePopup();
          } else {
            this.addressError.set(response.message || 'Thêm địa chỉ thất bại!');
          }
        },
        error: (error) => {
          console.error('Error adding address:', error);
          this.addressError.set(error.error?.message || 'Thêm địa chỉ thất bại. Vui lòng thử lại!');
        }
      });
    }
  }

  setDefaultAddress(addressId: string) {
    this.addressService.setDefaultAddress(addressId).subscribe({
      next: (response) => {
        if (response.success) {
          // Reload addresses và tự động sắp xếp địa chỉ mặc định lên đầu
          this.loadAddresses();
        }
      },
      error: (error) => {
        console.error('Error setting default address:', error);
      }
    });
  }

  deleteAddress(addressId: string) {
    // Directly delete without confirmation
    this.addressService.deleteAddress(addressId).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadAddresses();
        }
      },
      error: (error) => {
        console.error('Error deleting address:', error);
      }
    });
  }
}
