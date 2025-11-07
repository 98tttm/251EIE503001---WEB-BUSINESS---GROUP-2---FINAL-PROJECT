import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { AddressService, AddressData } from '../services/address.service';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { environment } from '../../environments/environment';

interface PaymentItem {
  _id: string;
  name: string;
  image: string;
  price: number;
  discount?: number;
  quantity: number;
  unit: string;
}

// Use AddressData from AddressService

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.css',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translate(-50%, -45%) scale(0.95)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translate(-50%, -45%) scale(0.95)', opacity: 0 }))
      ])
    ])
  ]
})
export class Payment implements OnInit {
  // Items from cart
  items = signal<PaymentItem[]>([]);
  
  // Delivery options
  deliveryMethod = signal<'home' | 'store'>('home');
  
  // Address
  selectedAddress = signal<AddressData | null>(null);
  addresses = signal<AddressData[]>([]);
  
  // Payment method
  paymentMethod = signal<string>('cod');
  
  // Invoice
  requireInvoice = signal(false);
  showInvoiceModal = signal(false);
  invoiceFullName = signal('');
  invoicePhone = signal('');
  invoiceAddress = signal('');
  invoiceEmail = signal('');
  
  // Expected delivery time
  expectedDelivery = signal<string>('');
  showDeliveryTimeModal = signal(false);
  selectedDeliveryDate = signal<string>('');
  selectedDeliveryTime = signal<string>('');
  
  // Note
  note = signal<string>('');

  // Voucher information
  appliedVoucher = signal<any>(null);
  voucherDiscount = signal<number>(0);

  // Address Modal
  showAddressModal = signal(false);
  showAddForm = signal(false);
  isEditMode = signal(false);
  editingAddressId = signal<string | null>(null);
  tempSelectedAddress = signal<AddressData | null>(null);

  // New Address Form
  formName = signal('');
  formPhone = signal('');
  formProvince = signal('');
  formDistrict = signal('');
  formWard = signal('');
  formDetailAddress = signal('');
  
  // Province/District/Ward data from API
  provinces = signal<any[]>([]);
  districts = signal<any[]>([]);
  wards = signal<any[]>([]);
  
  selectedProvinceId = signal<string>('');
  selectedDistrictId = signal<string>('');

  // Guest User Information (for non-logged-in users)
  guestOrdererName = signal<string>('');
  guestOrdererPhone = signal<string>('');
  guestOrdererEmail = signal<string>('');
  
  guestRecipientName = signal<string>('');
  guestRecipientPhone = signal<string>('');
  guestAddressType = signal<'before' | 'after'>('before'); // Trước sáp nhập / Sau sáp nhập
  guestProvince = signal<string>('');
  guestDistrict = signal<string>('');
  guestWard = signal<string>('');
  guestDetailAddress = signal<string>('');
  
  // For guest address dropdowns
  guestSelectedProvinceId = signal<string>('');
  guestSelectedDistrictId = signal<string>('');
  guestDistricts = signal<any[]>([]);
  guestWards = signal<any[]>([]);

  constructor(
    private router: Router,
    private addressService: AddressService,
    private authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit() {
    this.loadCheckoutData();
    if (this.authService.isLoggedIn()) {
      this.loadAddresses();
    }
    this.loadProvinces();
    this.calculateExpectedDelivery();
    
    // Recalculate voucher discount after items are loaded (use setTimeout to ensure items are set)
    setTimeout(() => {
      this.recalculateVoucherDiscount();
    }, 100);
  }

  recalculateVoucherDiscount(): void {
    const voucherData = localStorage.getItem('checkoutVoucher');
    if (voucherData) {
      try {
        const voucherInfo = JSON.parse(voucherData);
        
        if (voucherInfo.appliedVoucher && this.subtotal > 0) {
          // Validate voucher again to ensure it's still valid
          const minOrderAmount = voucherInfo.appliedVoucher.minOrderAmount || 0;
          if (this.subtotal >= minOrderAmount) {
            this.appliedVoucher.set(voucherInfo.appliedVoucher);
            const discountAmount = Math.round((this.subtotal * voucherInfo.appliedVoucher.discountPercent) / 100);
            this.voucherDiscount.set(discountAmount);
            console.log('🎫 Voucher recalculated:', {
              code: voucherInfo.appliedVoucher.code,
              discount: discountAmount,
              subtotal: this.subtotal
            });
          } else {
            // If subtotal doesn't meet minimum, remove voucher
            this.appliedVoucher.set(null);
            this.voucherDiscount.set(0);
            localStorage.removeItem('checkoutVoucher');
            console.log('⚠️ Voucher removed - subtotal too low');
          }
        }
      } catch (error) {
        console.error('Error recalculating voucher:', error);
      }
    }
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
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

  onProvinceChange(event: Event) {
    const provinceId = (event.target as HTMLSelectElement).value;
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

  onDistrictChange(event: Event) {
    const districtId = (event.target as HTMLSelectElement).value;
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

  // Guest address change handlers
  onGuestProvinceChange(event: Event) {
    const provinceValue = (event.target as HTMLSelectElement).value;
    this.guestSelectedProvinceId.set(provinceValue);
    
    // Find province by code or _id (option value might be code or _id)
    const province = this.provinces().find(p => 
      p.code === provinceValue || p._id === provinceValue || 
      String(p.code) === String(provinceValue) || String(p._id) === String(provinceValue)
    );
    this.guestProvince.set(province ? province.name : '');
    
    // Clear districts and wards
    this.guestDistricts.set([]);
    this.guestWards.set([]);
    this.guestDistrict.set('');
    this.guestWard.set('');
    this.guestSelectedDistrictId.set('');
    
    if (provinceValue) {
      // Use _id for API call (backend expects _id)
      const provinceId = province?._id || provinceValue;
      console.log('🔄 Loading districts for province:', {
        selectedValue: provinceValue,
        provinceId: provinceId,
        provinceName: province?.name
      });
      
      this.addressService.getDistricts(provinceId).subscribe({
        next: (response) => {
          console.log('✅ Districts response:', response);
          if (response.success && response.data && Array.isArray(response.data)) {
            this.guestDistricts.set(response.data);
            console.log('✅ Loaded', response.data.length, 'districts');
          } else {
            console.warn('⚠️ No districts in response:', response);
            this.guestDistricts.set([]);
          }
        },
        error: (error) => {
          console.error('❌ Error loading districts:', error);
          this.guestDistricts.set([]);
          alert('Không thể tải danh sách quận/huyện. Vui lòng thử lại.');
        }
      });
    } else {
      // Clear if no province selected
      this.guestDistricts.set([]);
    }
  }

  onGuestDistrictChange(event: Event) {
    const districtValue = (event.target as HTMLSelectElement).value;
    this.guestSelectedDistrictId.set(districtValue);
    
    // Find district by _id or code
    const district = this.guestDistricts().find(d => 
      d._id === districtValue || d.code === districtValue ||
      String(d._id) === String(districtValue) || String(d.code) === String(districtValue)
    );
    this.guestDistrict.set(district ? district.name : '');
    
    // Clear wards
    this.guestWards.set([]);
    this.guestWard.set('');
    
    if (districtValue) {
      // Use _id for API call (backend expects _id)
      const districtId = district?._id || districtValue;
      console.log('🔄 Loading wards for district:', {
        selectedValue: districtValue,
        districtId: districtId,
        districtName: district?.name
      });
      
      this.addressService.getWards(districtId).subscribe({
        next: (response) => {
          console.log('✅ Wards response:', response);
          if (response.success && response.data && Array.isArray(response.data)) {
            this.guestWards.set(response.data);
            console.log('✅ Loaded', response.data.length, 'wards');
          } else {
            console.warn('⚠️ No wards in response:', response);
            this.guestWards.set([]);
          }
        },
        error: (error) => {
          console.error('❌ Error loading wards:', error);
          this.guestWards.set([]);
          alert('Không thể tải danh sách phường/xã. Vui lòng thử lại.');
        }
      });
    } else {
      // Clear if no district selected
      this.guestWards.set([]);
    }
  }

  onGuestWardChange(event: Event) {
    const wardValue = (event.target as HTMLSelectElement).value;
    const ward = this.guestWards().find(w => 
      w._id === wardValue || w.code === wardValue ||
      String(w._id) === String(wardValue) || String(w.code) === String(wardValue)
    );
    this.guestWard.set(ward ? ward.name : '');
  }

  loadCheckoutData() {
    // Get items from localStorage (passed from cart)
    const checkoutData = localStorage.getItem('checkoutItems');
    if (checkoutData) {
      this.items.set(JSON.parse(checkoutData));
    } else {
      // If no items, redirect to cart
      this.router.navigate(['/cart']);
      return;
    }

    // Load voucher information from localStorage
    const voucherData = localStorage.getItem('checkoutVoucher');
    if (voucherData) {
      try {
        const voucherInfo = JSON.parse(voucherData);
        
        // Recalculate voucher discount based on current subtotal
        if (voucherInfo.appliedVoucher) {
          // Validate voucher again to ensure it's still valid
          const minOrderAmount = voucherInfo.appliedVoucher.minOrderAmount || 0;
          if (this.subtotal >= minOrderAmount) {
            this.appliedVoucher.set(voucherInfo.appliedVoucher);
            const discountAmount = Math.round((this.subtotal * voucherInfo.appliedVoucher.discountPercent) / 100);
            this.voucherDiscount.set(discountAmount);
          } else {
            // If subtotal doesn't meet minimum, remove voucher
            this.appliedVoucher.set(null);
            this.voucherDiscount.set(0);
            localStorage.removeItem('checkoutVoucher');
          }
        } else {
          this.voucherDiscount.set(voucherInfo.voucherDiscount || 0);
        }
      } catch (error) {
        console.error('Error loading voucher data:', error);
      }
    }
  }

  loadAddresses() {
    this.addressService.getAddresses().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.addresses.set(response.data);
          // Set default address
          const defaultAddr = response.data.find(addr => addr.isDefault);
          if (defaultAddr) {
            this.selectedAddress.set(defaultAddr);
          } else if (response.data.length > 0) {
            this.selectedAddress.set(response.data[0]);
          }
        }
      },
      error: (error) => {
        console.error('Error loading addresses:', error);
      }
    });
  }

  calculateExpectedDelivery() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Giờ giao hàng chỉ từ 8h - 22h, không giao từ 22h - 8h sáng
    let nextHour: number;
    let selectedDate = new Date();
    
    // Tính giờ giao hàng sớm nhất (hiện tại + 2 giờ)
    let minDeliveryHour = currentHour + 2;
    
    // Nếu giờ hiện tại nằm trong khoảng 22h-23h59 hoặc < 8h sáng
    if (currentHour >= 22 || currentHour < 8) {
      // Chuyển sang ngày hôm sau và bắt đầu từ 8h sáng
      selectedDate.setDate(selectedDate.getDate() + 1);
      nextHour = 8;
    } else if (minDeliveryHour >= 22) {
      // Nếu giờ giao sớm nhất >= 22h, chuyển sang ngày mai
      selectedDate.setDate(selectedDate.getDate() + 1);
      nextHour = 8;
    } else if (minDeliveryHour < 8) {
      // Nếu giờ giao sớm nhất < 8h sáng, đặt về 8h sáng hôm nay (nếu đang trong giờ làm việc)
      if (currentHour >= 8 && currentHour < 22) {
        nextHour = 8;
      } else {
        // Đã quá giờ làm việc, chuyển sang ngày mai 8h
        selectedDate.setDate(selectedDate.getDate() + 1);
        nextHour = 8;
      }
    } else {
      // Giờ giao bình thường trong khoảng 8h-21h
      nextHour = Math.ceil(minDeliveryHour);
      // Đảm bảo không vượt quá 21h (vì giờ cuối là 21:00-22:00)
      if (nextHour >= 22) {
        selectedDate.setDate(selectedDate.getDate() + 1);
        nextHour = 8;
      }
    }
    
    // Đảm bảo nextHour luôn trong khoảng 8-21
    if (nextHour < 8) {
      nextHour = 8;
    }
    if (nextHour >= 22) {
      selectedDate.setDate(selectedDate.getDate() + 1);
      nextHour = 8;
    }
    
    const timeSlot = `${nextHour.toString().padStart(2, '0')}:00 - ${(nextHour + 1).toString().padStart(2, '0')}:00`;
    const dateStr = this.formatDateForDisplay(selectedDate);
    
    this.selectedDeliveryDate.set(this.formatDateForStorage(selectedDate));
    this.selectedDeliveryTime.set(timeSlot);
    this.expectedDelivery.set(`Từ ${timeSlot} ${dateStr}`);
  }

  // Format date for display
  formatDateForDisplay(date: Date): string {
    const today = new Date();
    const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    if (date.toDateString() === today.toDateString()) {
      return `Hôm nay, ${day}/${month}/${year}`;
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Ngày mai, ${day}/${month}/${year}`;
    }
    
    return `${dayOfWeek[date.getDay()]}, ${day}/${month}/${year}`;
  }

  // Format date for storage
  formatDateForStorage(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Get available dates (today + 2 days)
  getAvailableDates(): { value: string, display: string }[] {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push({
        value: this.formatDateForStorage(date),
        display: this.formatDateForDisplay(date)
      });
    }
    
    return dates;
  }

  // Get available time slots
  getAvailableTimeSlots(): string[] {
    const slots = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    
    // Parse selected date
    let selectedDate: Date;
    if (this.selectedDeliveryDate()) {
      // Parse YYYY-MM-DD format
      const dateParts = this.selectedDeliveryDate().split('-');
      selectedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      selectedDate.setHours(0, 0, 0, 0); // Reset to start of day
    } else {
      selectedDate = today;
    }
    
    // Check if selected date is today (compare dates only, not time)
    const isToday = selectedDate.getTime() === today.getTime();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log('🕐 getAvailableTimeSlots:', {
      isToday,
      currentHour,
      currentMinute,
      selectedDate: this.selectedDeliveryDate()
    });
    
    // Chỉ hiển thị time slots từ 8h - 22h (slot cuối là 21:00-22:00)
    for (let hour = 8; hour < 22; hour++) {
      let shouldInclude = true;
      
      // Nếu là ngày hôm nay
      if (isToday) {
        // Nếu hiện tại đang trong khoảng 22h-7h59 sáng, không có slot nào available hôm nay
        if (currentHour >= 22 || currentHour < 8) {
          console.log(`⏰ Skipping slot ${hour}:00 - Currently ${currentHour}:${currentMinute} (outside 8h-22h)`);
          shouldInclude = false;
        } else {
          // Tính giờ tối thiểu (hiện tại + 2 giờ)
          // Ví dụ: 14:00 -> minAvailableHour = 16, 14:30 -> minAvailableHour = 17
          let minAvailableHour = currentHour + 2;
          if (currentMinute > 0) {
            // Nếu có phút (14:30), cần thêm 1 giờ nữa (làm tròn lên)
            minAvailableHour = currentHour + 3;
          }
          
          // Đảm bảo không vượt quá 22h
          if (minAvailableHour >= 22) {
            shouldInclude = false;
            console.log(`⏰ Skipping slot ${hour}:00 - minAvailableHour (${minAvailableHour}) >= 22`);
          } else if (hour < minAvailableHour) {
            // Bỏ qua nếu giờ này quá sớm (ít hơn 2 giờ từ bây giờ)
            console.log(`⏰ Skipping slot ${hour}:00 - less than minAvailableHour (${minAvailableHour})`);
            shouldInclude = false;
          } else {
            console.log(`✅ Including slot ${hour}:00 - ${hour + 1}:00`);
          }
        }
      } else {
        // Nếu không phải hôm nay, hiển thị tất cả slots từ 8h-21h
        console.log(`✅ Including slot ${hour}:00 - ${hour + 1}:00 (not today)`);
      }
      
      if (shouldInclude) {
        slots.push(`${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`);
      }
    }
    
    console.log('📅 Available time slots for', isToday ? 'today' : selectedDate.toDateString(), ':', slots.length, 'slots');
    
    return slots;
  }

  // Open delivery time modal
  openDeliveryTimeModal() {
    // Đảm bảo selectedDate được set trước khi mở modal
    if (!this.selectedDeliveryDate()) {
      // Nếu chưa có date, set mặc định là hôm nay
      const today = new Date();
      this.selectedDeliveryDate.set(this.formatDateForStorage(today));
    }
    
    this.showDeliveryTimeModal.set(true);
    document.body.style.overflow = 'hidden';
    
    console.log('📅 Opening delivery time modal, selectedDate:', this.selectedDeliveryDate());
  }

  // Close delivery time modal
  closeDeliveryTimeModal() {
    this.showDeliveryTimeModal.set(false);
    document.body.style.overflow = '';
  }

  // Select delivery date
  selectDeliveryDate(dateStr: string) {
    const oldDate = this.selectedDeliveryDate();
    this.selectedDeliveryDate.set(dateStr);
    
    // If date changed and selected time is no longer available, reset time
    if (oldDate !== dateStr) {
      const availableSlots = this.getAvailableTimeSlots();
      const currentTime = this.selectedDeliveryTime();
      
      // If current selected time is not in available slots, select first available
      if (currentTime && !availableSlots.includes(currentTime)) {
        if (availableSlots.length > 0) {
          this.selectedDeliveryTime.set(availableSlots[0]);
        } else {
          this.selectedDeliveryTime.set('');
        }
      } else if (!currentTime && availableSlots.length > 0) {
        // If no time selected, select first available
        this.selectedDeliveryTime.set(availableSlots[0]);
      }
    }
    
    this.updateExpectedDelivery();
  }

  // Select delivery time
  selectDeliveryTime(time: string) {
    this.selectedDeliveryTime.set(time);
    this.updateExpectedDelivery();
  }

  // Update expected delivery
  updateExpectedDelivery() {
    if (this.selectedDeliveryDate() && this.selectedDeliveryTime()) {
      const date = new Date(this.selectedDeliveryDate());
      const dateDisplay = this.formatDateForDisplay(date);
      this.expectedDelivery.set(`Từ ${this.selectedDeliveryTime()} ${dateDisplay}`);
    }
  }

  // Confirm delivery time
  confirmDeliveryTime() {
    if (!this.selectedDeliveryDate() || !this.selectedDeliveryTime()) {
      alert('Vui lòng chọn ngày và giờ nhận hàng');
      return;
    }
    this.closeDeliveryTimeModal();
  }

  // Reset to earliest time
  resetToEarliestTime() {
    this.calculateExpectedDelivery();
  }

  // Toggle invoice
  toggleInvoice(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    
    if (checked) {
      // Open invoice modal
      this.showInvoiceModal.set(true);
      document.body.style.overflow = 'hidden';
    } else {
      // Turn off invoice
      this.requireInvoice.set(false);
      this.resetInvoiceData();
    }
  }

  // Close invoice modal
  closeInvoiceModal() {
    this.showInvoiceModal.set(false);
    this.requireInvoice.set(false);
    document.body.style.overflow = '';
    this.resetInvoiceData();
  }

  // Confirm invoice
  confirmInvoice() {
    // Validate - Email is now required
    if (!this.invoiceFullName() || !this.invoicePhone() || 
        !this.invoiceAddress() || !this.invoiceEmail()) {
      alert('Vui lòng điền đầy đủ thông tin bao gồm email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.invoiceEmail())) {
      alert('Email không hợp lệ');
      return;
    }

    this.requireInvoice.set(true);
    this.showInvoiceModal.set(false);
    document.body.style.overflow = '';
  }

  // Reset invoice data
  resetInvoiceData() {
    this.invoiceFullName.set('');
    this.invoicePhone.set('');
    this.invoiceAddress.set('');
    this.invoiceEmail.set('');
  }

  // Getters for pricing
  get subtotal(): number {
    return this.items().reduce((sum, item) => {
      const price = item.discount ? item.price : item.price;
      return sum + (price * item.quantity);
    }, 0);
  }

  get originalTotal(): number {
    return this.items().reduce((sum, item) => {
      const price = item.discount ? item.price + item.discount : item.price;
      return sum + (price * item.quantity);
    }, 0);
  }

  get discount(): number {
    return this.originalTotal - this.subtotal;
  }

  get shippingFee(): number {
    return this.deliveryMethod() === 'home' ? (this.subtotal >= 300000 ? 0 : 25000) : 0;
  }

  get total(): number {
    return Math.max(0, this.subtotal - this.voucherDiscount() + this.shippingFee);
  }

  // Format price
  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  // Calculate discount percent
  calculateDiscountPercent(price: number, discount: number): number {
    if (!discount || discount <= 0) return 0;
    const originalPrice = price + discount;
    return Math.round((discount / originalPrice) * 100);
  }

  // Select delivery method
  selectDeliveryMethod(method: 'home' | 'store') {
    this.deliveryMethod.set(method);
  }

  // Select payment method
  selectPaymentMethod(method: string) {
    this.paymentMethod.set(method);
  }

  // Change address
  changeAddress() {
    this.showAddressModal.set(true);
    this.tempSelectedAddress.set(this.selectedAddress());
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  // Close address modal
  closeAddressModal() {
    this.showAddressModal.set(false);
    this.showAddForm.set(false);
    this.resetFormFields();
    // Restore body scroll when modal is closed
    document.body.style.overflow = '';
  }

  // Open add form
  openAddForm() {
    this.isEditMode.set(false);
    this.editingAddressId.set(null);
    this.resetFormFields();
    this.showAddForm.set(true);
  }

  // Close add form
  closeAddForm() {
    this.showAddForm.set(false);
    this.isEditMode.set(false);
    this.editingAddressId.set(null);
    this.resetFormFields();
  }

  // Select address
  selectAddress(address: AddressData) {
    this.tempSelectedAddress.set(address);
  }

  // Confirm address
  confirmAddress() {
    if (this.tempSelectedAddress()) {
      this.selectedAddress.set(this.tempSelectedAddress());
    }
    this.closeAddressModal();
  }

  // Edit address
  editAddress(event: Event, address: AddressData) {
    event.stopPropagation();
    
    // Set edit mode
    this.isEditMode.set(true);
    this.editingAddressId.set(address._id || null);
    
    // Populate form with existing data
    this.formName.set(address.name);
    this.formPhone.set(address.phone);
    this.formDetailAddress.set(address.detailAddress);
    
    // Find and set province
    const province = this.provinces().find(p => p.name === address.province);
    if (province) {
      this.selectedProvinceId.set(province._id);
      this.formProvince.set(province._id);
      
      // Load districts for this province
      this.addressService.getDistricts(province._id).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.districts.set(response.data);
            
            // Find and set district
            const district = response.data.find((d: any) => d.name === address.district);
            if (district) {
              this.selectedDistrictId.set(district._id);
              this.formDistrict.set(district._id);
              
              // Load wards for this district
              this.addressService.getWards(district._id).subscribe({
                next: (wardResponse) => {
                  if (wardResponse.success && wardResponse.data) {
                    this.wards.set(wardResponse.data);
                    
                    // Find and set ward
                    const ward = wardResponse.data.find((w: any) => w.name === address.ward);
                    if (ward) {
                      this.formWard.set(ward._id);
                    }
                  }
                }
              });
            }
          }
        }
      });
    }
    
    // Show form
    this.showAddForm.set(true);
  }

  // Save new address
  saveNewAddress() {
    // Validate
    if (!this.formName() || !this.formPhone() || 
        !this.formProvince() || !this.formDistrict() || 
        !this.formWard() || !this.formDetailAddress()) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Get province/district/ward names
    const provinceName = this.provinces().find(p => p._id === this.selectedProvinceId())?.name || '';
    const districtName = this.districts().find(d => d._id === this.selectedDistrictId())?.name || '';
    const wardName = this.wards().find(w => w._id === this.formWard())?.name || '';

    const addressData: AddressData = {
      name: this.formName(),
      phone: this.formPhone(),
      province: provinceName,
      district: districtName,
      ward: wardName,
      detailAddress: this.formDetailAddress(),
      deliveryTime: 'before',
      isDefault: this.addresses().length === 0
    };

    // Check if edit or create
    if (this.isEditMode() && this.editingAddressId()) {
      // Update existing address
      this.addressService.updateAddress(this.editingAddressId()!, addressData).subscribe({
        next: (response: any) => {
          // Reload addresses
          this.loadAddresses();
          
          // Close add form, show address list
          this.showAddForm.set(false);
          this.isEditMode.set(false);
          this.editingAddressId.set(null);
          
          alert('Cập nhật địa chỉ thành công!');
        },
        error: (error: any) => {
          console.error('Error updating address:', error);
          alert('Có lỗi xảy ra khi cập nhật địa chỉ');
        }
      });
    } else {
      // Create new address
      this.addressService.addAddress(addressData).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            // Reload addresses
            this.loadAddresses();
            
            // Select this new address
            this.tempSelectedAddress.set(response.data);
            
            // Close add form, show address list
            this.showAddForm.set(false);
            
            alert('Thêm địa chỉ thành công!');
          }
        },
        error: (error: any) => {
          console.error('Error creating address:', error);
          alert('Có lỗi xảy ra khi thêm địa chỉ');
        }
      });
    }
  }

  // Reset form fields
  resetFormFields() {
    this.formName.set('');
    this.formPhone.set('');
    this.formProvince.set('');
    this.formDistrict.set('');
    this.formWard.set('');
    this.formDetailAddress.set('');
    this.selectedProvinceId.set('');
    this.selectedDistrictId.set('');
    this.districts.set([]);
    this.wards.set([]);
  }

  // Complete order
  async completeOrder() {
    // Validate for logged-in users
    if (this.isLoggedIn() && !this.selectedAddress()) {
      alert('Vui lòng chọn địa chỉ nhận hàng');
      return;
    }

    // Validate for guest users
    if (!this.isLoggedIn()) {
      if (!this.guestOrdererName().trim()) {
        alert('Vui lòng nhập họ và tên người đặt');
        return;
      }
      if (!this.guestOrdererPhone().trim()) {
        alert('Vui lòng nhập số điện thoại người đặt');
        return;
      }
      if (!this.guestRecipientName().trim()) {
        alert('Vui lòng nhập họ và tên người nhận');
        return;
      }
      if (!this.guestRecipientPhone().trim()) {
        alert('Vui lòng nhập số điện thoại người nhận');
        return;
      }
      if (!this.guestProvince() || !this.guestDistrict() || !this.guestWard()) {
        alert('Vui lòng chọn đầy đủ Tỉnh/Thành phố, Quận/Huyện và Phường/Xã');
        return;
      }
      if (!this.guestDetailAddress().trim()) {
        alert('Vui lòng nhập địa chỉ cụ thể');
        return;
      }
    }

    // Build address data - use selected address for logged-in users, or guest form data
    let addressData: any;
    
    if (this.isLoggedIn() && this.selectedAddress()) {
      addressData = this.selectedAddress();
    } else {
      // Build address from guest form
      addressData = {
        name: this.guestRecipientName(),
        phone: this.guestRecipientPhone(),
        email: this.guestOrdererEmail(), // Include email for order confirmation
        province: this.guestProvince(),
        district: this.guestDistrict(),
        ward: this.guestWard(),
        detailAddress: this.guestDetailAddress()
      };
    }

    const orderData = {
      items: this.items(),
      address: addressData,
      deliveryMethod: this.deliveryMethod(),
      paymentMethod: this.paymentMethod(),
      requireInvoice: this.requireInvoice(),
      invoiceInfo: this.requireInvoice() ? {
        fullName: this.invoiceFullName(),
        phone: this.invoicePhone(),
        address: this.invoiceAddress(),
        email: this.invoiceEmail()
      } : null,
      expectedDelivery: this.expectedDelivery(),
      note: this.note(),
      subtotal: this.subtotal,
      discount: this.discount,
      voucherCode: this.appliedVoucher()?.code || null,
      voucherDiscount: this.voucherDiscount(),
      shippingFee: this.shippingFee,
      total: this.total,
      // Guest orderer info
      guestOrdererInfo: !this.isLoggedIn() ? {
        name: this.guestOrdererName(),
        phone: this.guestOrdererPhone(),
        email: this.guestOrdererEmail()
      } : null
    };

    console.log('📦 Order data:', orderData);
    console.log('🎫 Voucher info:', {
      appliedVoucher: this.appliedVoucher(),
      voucherDiscount: this.voucherDiscount(),
      voucherCode: this.appliedVoucher()?.code
    });

    // Check payment method - if QR, ATM, Card, or MoMo, don't create order yet
    const paymentMethod = this.paymentMethod();
    
    if (paymentMethod === 'qr' || paymentMethod === 'atm' || paymentMethod === 'card' || paymentMethod === 'momo') {
      // QR Payment, ATM Payment, Card Payment, or MoMo Payment: Don't create order yet, just prepare data and navigate
      const paymentTypes: { [key: string]: string } = {
        'qr': 'QR Payment',
        'atm': 'ATM Payment (VNPAY)',
        'card': 'Card Payment (International/VNPay)',
        'momo': 'MoMo Payment'
      };
      const paymentType = paymentTypes[paymentMethod] || 'Payment';
      console.log(`💳 ${paymentType} selected - saving temporary data, order will be created on confirmation`);
      
      // Prepare order payload (without creating order)
      const user = this.authService.currentUser();
      
      // Check if guest phone matches existing user
      let finalUserId = user?.userId || 'guest';
      
      if (!this.isLoggedIn() && this.guestOrdererPhone()) {
        const guestPhone = this.guestOrdererPhone().trim();
        console.log('🔍 Frontend: Checking if guest phone matches existing user:', guestPhone);
        
        try {
          const checkUserResponse = await fetch(
            `${environment.apiUrl}/api/users/by-phone/${encodeURIComponent(guestPhone)}`
          );
          const checkUserResult = await checkUserResponse.json();
          
          if (checkUserResult.success && checkUserResult.data) {
            finalUserId = checkUserResult.data.userId;
            console.log('✅ Frontend: Guest order will be linked to existing user:', finalUserId);
          }
        } catch (error) {
          console.error('❌ Error checking user by phone:', error);
        }
      }
      
      const orderPayload = {
        ...orderData,
        userId: finalUserId,
        isGuest: !this.isLoggedIn() && finalUserId === 'guest',
        ...(orderData.guestOrdererInfo && { guestOrdererInfo: orderData.guestOrdererInfo })
      };
      
      // Save temporary order data (order will be created when user confirms payment)
      localStorage.setItem('pendingOrderData', JSON.stringify({
        orderData: orderData,
        orderPayload: orderPayload,
        paymentMethod: paymentMethod
      }));
      
      if (paymentMethod === 'qr') {
        // Navigate to QR payment page
        this.router.navigate(['/qr-payment'], {
          state: {
            orderData: orderData,
            orderPayload: orderPayload,
            pending: true // Flag to indicate order not created yet
          }
        });
      } else if (paymentMethod === 'atm') {
        // Redirect to VNPAY payment page
        const vnpayUrl = this.getVNPayUrl();
        
        console.log('💳 Redirecting to VNPAY for ATM payment:', vnpayUrl);
        
        // Redirect to VNPAY
        window.location.href = vnpayUrl;
      } else if (paymentMethod === 'card') {
        // Navigate to card payment page
        this.router.navigate(['/card-payment'], {
          state: {
            orderData: orderData,
            orderPayload: orderPayload,
            pending: true // Flag to indicate order not created yet
          }
        });
      } else if (paymentMethod === 'momo') {
        // Navigate to MoMo payment page
        this.router.navigate(['/momo-payment'], {
          state: {
            orderData: orderData,
            orderPayload: orderPayload,
            pending: true // Flag to indicate order not created yet
          }
        });
      }
      
      return; // Exit early, don't create order
    }
    
    // For other payment methods (COD, etc.), create order immediately
    const user = this.authService.currentUser();
    
    // Check if guest phone matches existing user
    let finalUserId = user?.userId || 'guest';
    
    // If guest checkout, check if phone matches existing user
    if (!this.isLoggedIn() && this.guestOrdererPhone()) {
      const guestPhone = this.guestOrdererPhone().trim();
      console.log('🔍 Frontend: Checking if guest phone matches existing user:', guestPhone);
      
      try {
        const checkUserResponse = await fetch(
          `${environment.apiUrl}/api/users/by-phone/${encodeURIComponent(guestPhone)}`
        );
        const checkUserResult = await checkUserResponse.json();
        
        console.log('📡 API Response:', checkUserResult);
        
        if (checkUserResult.success && checkUserResult.data) {
          // Phone matches existing user - link order to that user
          finalUserId = checkUserResult.data.userId;
          console.log('✅ Frontend: Guest order will be linked to existing user:', finalUserId);
        } else {
          console.log('ℹ️ Frontend: No user found with phone:', guestPhone);
        }
      } catch (error) {
        console.error('❌ Error checking user by phone:', error);
        // Continue with guest order if check fails
      }
    }
    
    console.log('📦 Frontend: Final userId before sending:', finalUserId);
    
    const orderPayload = {
      ...orderData,
      userId: finalUserId,
      isGuest: !this.isLoggedIn() && finalUserId === 'guest',
      // Include guest orderer info if exists
      ...(orderData.guestOrdererInfo && { guestOrdererInfo: orderData.guestOrdererInfo })
    };

    // Save order to database (for non-QR payment methods)
    fetch(`${environment.apiUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    })
    .then(response => response.json())
    .then(async (orderResponse) => {
      console.log('✅ Order created response:', orderResponse);
      
      if (orderResponse.success && orderResponse.data) {
        // Get orderNumber and _id from MongoDB response
        const orderNumber = orderResponse.data.orderNumber;
        const orderId = orderResponse.data._id || orderNumber;
        
        console.log('📦 Order Number:', orderNumber);
        console.log('📦 Order ID:', orderId);
        
        // Store order info in localStorage for reference
        localStorage.setItem('lastOrderId', orderNumber);
        localStorage.setItem('lastOrderData', JSON.stringify({
          orderNumber: orderNumber,
          _id: orderId
        }));
        
        // Create updated orderData with orderNumber and _id
        const orderDataWithNumber = {
          ...orderData,
          orderNumber: orderNumber,
          _id: orderId
        };
        
        // Remove ordered items from cart (frontend sync)
        const orderedItemIds = this.items().map(item => item._id);
        console.log('🗑️ Removing ordered items from cart:', orderedItemIds);
        
        for (const itemId of orderedItemIds) {
          await this.cartService.removeFromCart(itemId);
        }
        
        // Reload cart to sync with MongoDB
        await this.cartService.loadCart();
        
        console.log('✅ Ordered items removed from cart');
        
        // Handle invoice sending if required
        const sendInvoicePromise = this.requireInvoice() 
          ? fetch(`${environment.apiUrl}/api/orders/send-invoice`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(orderDataWithNumber)
            })
            .then(response => response.json())
            .catch(error => {
              console.error('Error sending invoice:', error);
              return { success: false, error: error.message };
            })
          : Promise.resolve({ success: true });

        // Process order based on payment method
        sendInvoicePromise.then(() => {
          // Route based on payment method
          const paymentMethod = this.paymentMethod();

          if (paymentMethod === 'cod') {
            // COD: Clear checkout and go to success page
            localStorage.removeItem('checkoutItems');
            localStorage.removeItem('checkoutVoucher'); // Clear voucher after order is created
            localStorage.setItem('lastOrderInfo', JSON.stringify(orderDataWithNumber));
            
            this.router.navigate(['/order-success'], {
              state: { orderData: orderDataWithNumber }
            });
          } else if (paymentMethod === 'bank') {
            // Other online payment methods: Show payment gateway (for now, redirect to success)
            // TODO: Integrate with real payment gateway
            alert('Chuyển hướng đến cổng thanh toán ' + this.getPaymentMethodName(paymentMethod));
            
            // Clear checkout and save order info
            localStorage.removeItem('checkoutItems');
            localStorage.removeItem('checkoutVoucher'); // Clear voucher after order is created
            localStorage.setItem('lastOrderInfo', JSON.stringify(orderDataWithNumber));
            
            // Simulate successful payment after 2 seconds
            setTimeout(() => {
              this.router.navigate(['/order-success'], {
                state: { orderData: orderDataWithNumber }
              });
            }, 2000);
          } else {
            // Default: Clear checkout and go to success page
            localStorage.removeItem('checkoutItems');
            localStorage.removeItem('checkoutVoucher'); // Clear voucher after order is created
            localStorage.setItem('lastOrderInfo', JSON.stringify(orderDataWithNumber));
            
            this.router.navigate(['/order-success'], {
              state: { orderData: orderDataWithNumber }
            });
          }
        });
      }
    })
    .catch(error => {
      console.error('Error creating order:', error);
      alert('Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
    });
  }

  // Get payment method name
  getPaymentMethodName(method: string): string {
    const methods: { [key: string]: string } = {
      'cod': 'COD',
      'qr': 'QR Code',
      'atm': 'ATM nội địa',
      'bank': 'ATM/Ngân hàng',
      'card': 'Thẻ quốc tế',
      'momo': 'MoMo'
    };
    return methods[method] || method;
  }
  
  // Generate VNPAY payment URL
  // In production, this should call backend API to generate token from VNPAY with actual order data
  // For now, using the provided token format
  getVNPayUrl(): string {
    const vnpayToken = '1a6326397cc44d9c9c63e0e5899eba62';
    return `https://pay.vnpay.vn/Transaction/PaymentMethod.html?token=${vnpayToken}`;
  }

  // Back to cart
  backToCart() {
    this.router.navigate(['/cart']);
  }
}
