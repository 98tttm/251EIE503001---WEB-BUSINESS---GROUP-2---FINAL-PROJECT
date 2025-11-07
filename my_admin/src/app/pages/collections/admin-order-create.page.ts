import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AdminApiService } from '../../core/services/admin-api.service';
import { NotificationService } from '../../core/services/notification.service';

interface Product {
  _id: string;
  name: string;
  price: number;
  finalPrice: number;
  stock: number;
  image?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Province {
  code: string;
  name: string;
}

interface District {
  code: string;
  name: string;
  provinceCode: string;
}

interface Ward {
  code: string;
  name: string;
  districtCode: string;
}

@Component({
  selector: 'app-admin-order-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-order-create.page.html',
  styleUrl: './admin-order-create.page.css'
})
export class AdminOrderCreatePage {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notifier = inject(NotificationService);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly searchingProduct = signal(false);
  readonly productSearchTerm = signal('');
  readonly products = signal<Product[]>([]);
  readonly selectedProducts = signal<OrderItem[]>([]);
  readonly showProductSearch = signal(false);
  
  // Address data
  readonly provinces = signal<Province[]>([]);
  readonly districts = signal<District[]>([]);
  readonly wards = signal<Ward[]>([]);
  readonly loadingDistricts = signal(false);
  readonly loadingWards = signal(false);

  readonly orderForm: FormGroup;

  // Promotions
  readonly promotions = signal<any[]>([]);
  readonly appliedPromotion = signal<any | null>(null);
  
  // Payment methods
  readonly paymentMethods = [
    { value: 'COD', label: 'Thanh toán khi nhận hàng (COD)', icon: '💵' },
    { value: 'bank_transfer', label: 'Chuyển khoản ngân hàng', icon: '🏦' },
    { value: 'e_wallet', label: 'Ví điện tử', icon: '📱' },
    { value: 'credit_card', label: 'Thẻ tín dụng', icon: '💳' }
  ];

  readonly subtotal = computed(() => {
    return this.selectedProducts().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  });

  readonly discount = computed(() => {
    const promo = this.appliedPromotion();
    if (!promo) return 0;
    
    const subtotal = this.subtotal();
    if (promo.discountPercent) {
      return Math.round((subtotal * promo.discountPercent) / 100);
    }
    return promo.discount || 0;
  });

  readonly shippingFee = signal(30000); // Default 30k

  readonly total = computed(() => {
    return Math.max(0, this.subtotal() - this.discount() + this.shippingFee());
  });

  constructor() {
    this.orderForm = this.fb.group({
      // Customer info
      customerName: ['', Validators.required],
      customerEmail: ['', [Validators.email]],
      customerPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      
      // Shipping address
      shippingName: ['', Validators.required],
      shippingPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      shippingAddress: ['', Validators.required],
      province: ['', Validators.required],
      district: ['', Validators.required],
      ward: ['', Validators.required],
      
      // Payment
      paymentMethod: ['COD', Validators.required],
      
      // Notes
      customerNotes: [''],
      adminNotes: ['']
    });

    void this.loadInitialData();
    
    // Watch for same as customer checkbox
    this.orderForm.get('customerName')?.valueChanges.subscribe(() => {
      if (this.sameAsCustomer()) {
        this.copySameAsCustomer();
      }
    });
  }

  readonly sameAsCustomer = signal(false);

  toggleSameAsCustomer(): void {
    this.sameAsCustomer.update(v => !v);
    if (this.sameAsCustomer()) {
      this.copySameAsCustomer();
    }
  }

  copySameAsCustomer(): void {
    const name = this.orderForm.get('customerName')?.value;
    const phone = this.orderForm.get('customerPhone')?.value;
    
    if (name) this.orderForm.patchValue({ shippingName: name });
    if (phone) this.orderForm.patchValue({ shippingPhone: phone });
  }

  async loadInitialData(): Promise<void> {
    this.loading.set(true);
    try {
      // Load provinces
      const provincesResponse: any = await firstValueFrom(
        this.api.get<any>('/api/provinces')
      );
      this.provinces.set(provincesResponse.data || []);

      // Load available promotions
      const promosResponse = await firstValueFrom(
        this.api.getCollectionItems('promotions', { page: 1, limit: 50 })
      );
      this.promotions.set((promosResponse.data || []).filter((p: any) => p.isActive));
      
    } catch (error) {
      console.error('[AdminOrderCreate] Load error:', error);
      this.notifier.showError('Không thể tải dữ liệu ban đầu');
    } finally {
      this.loading.set(false);
    }
  }

  async onProvinceChange(provinceCode: string): Promise<void> {
    if (!provinceCode) {
      this.districts.set([]);
      this.wards.set([]);
      return;
    }

    this.loadingDistricts.set(true);
    try {
      const response: any = await firstValueFrom(
        this.api.get<any>(`/api/districts/${provinceCode}`)
      );
      this.districts.set(response.data || []);
      this.wards.set([]);
      this.orderForm.patchValue({ district: '', ward: '' });
    } catch (error) {
      console.error('[AdminOrderCreate] Load districts error:', error);
    } finally {
      this.loadingDistricts.set(false);
    }
  }

  async onDistrictChange(districtCode: string): Promise<void> {
    if (!districtCode) {
      this.wards.set([]);
      return;
    }

    this.loadingWards.set(true);
    try {
      const response: any = await firstValueFrom(
        this.api.get<any>(`/api/wards/${districtCode}`)
      );
      this.wards.set(response.data || []);
      this.orderForm.patchValue({ ward: '' });
    } catch (error) {
      console.error('[AdminOrderCreate] Load wards error:', error);
    } finally {
      this.loadingWards.set(false);
    }
  }

  // Product search
  async searchProducts(term: string): Promise<void> {
    if (!term || term.length < 2) {
      this.products.set([]);
      return;
    }

    this.searchingProduct.set(true);
    try {
      const response = await firstValueFrom(
        this.api.getCollectionItems<Product>('products', {
          page: 1,
          limit: 20,
          search: term
        })
      );
      this.products.set(response.data || []);
    } catch (error) {
      console.error('[AdminOrderCreate] Search error:', error);
    } finally {
      this.searchingProduct.set(false);
    }
  }

  onProductSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.productSearchTerm.set(term);
    void this.searchProducts(term);
  }

  addProduct(product: Product): void {
    const existing = this.selectedProducts().find(p => p.productId === product._id);
    
    if (existing) {
      // Increase quantity
      this.selectedProducts.update(items =>
        items.map(item =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      // Add new
      this.selectedProducts.update(items => [
        ...items,
        {
          productId: product._id,
          productName: product.name,
          quantity: 1,
          price: product.finalPrice || product.price,
          image: product.image
        }
      ]);
    }

    this.notifier.showSuccess(`Đã thêm ${product.name}`);
    this.productSearchTerm.set('');
    this.products.set([]);
  }

  removeProduct(productId: string): void {
    this.selectedProducts.update(items => items.filter(p => p.productId !== productId));
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeProduct(productId);
      return;
    }

    this.selectedProducts.update(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  }

  applyPromotion(promotion: any): void {
    // Check minimum order amount
    if (promotion.minOrderAmount && this.subtotal() < promotion.minOrderAmount) {
      this.notifier.showWarning(
        `Đơn hàng tối thiểu ${promotion.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`
      );
      return;
    }

    // Check max usage
    if (promotion.maxUsage && promotion.usedCount >= promotion.maxUsage) {
      this.notifier.showWarning('Mã giảm giá đã hết lượt sử dụng');
      return;
    }

    this.appliedPromotion.set(promotion);
    this.notifier.showSuccess(`Đã áp dụng mã ${promotion.code}`);
  }

  removePromotion(): void {
    this.appliedPromotion.set(null);
  }

  async submitOrder(): Promise<void> {
    // Validate
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      this.notifier.showError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (this.selectedProducts().length === 0) {
      this.notifier.showError('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    this.submitting.set(true);

    try {
      const formValue = this.orderForm.value;
      
      // Build order data matching backend API structure
      const orderData = {
        userId: 'admin-created', // Special userId for admin-created orders
        isGuest: false,
        
        // Items - Backend expects _id, name, price, quantity, unit
        items: this.selectedProducts().map(item => ({
          _id: item.productId,
          name: item.productName,
          price: item.price,
          discount: 0,
          quantity: item.quantity,
          unit: 'Hộp',
          image: item.image
        })),
        
        // Address - Backend expects this structure
        address: {
          name: formValue.shippingName,
          phone: formValue.shippingPhone,
          province: this.provinces().find(p => p.code === formValue.province)?.name || '',
          district: this.districts().find(d => d.code === formValue.district)?.name || '',
          ward: this.wards().find(w => w.code === formValue.ward)?.name || '',
          detailAddress: formValue.shippingAddress
        },
        
        // Payment
        paymentMethod: formValue.paymentMethod.toLowerCase(),
        
        // Invoice (optional)
        requireInvoice: !!formValue.customerEmail,
        invoiceInfo: formValue.customerEmail ? {
          fullName: formValue.customerName,
          phone: formValue.customerPhone,
          email: formValue.customerEmail,
          address: formValue.shippingAddress
        } : null,
        
        // Pricing
        subtotal: this.subtotal(),
        discount: 0, // Product discounts
        voucherCode: this.appliedPromotion()?.code || null,
        voucherDiscount: this.discount(),
        shippingFee: this.shippingFee(),
        total: this.total(),
        
        // Notes
        note: formValue.customerNotes || '',
        adminNotes: formValue.adminNotes || '',
        
        // Expected delivery (optional, can be calculated by backend)
        expectedDelivery: '',
        
        // Meta
        createdBy: 'admin',
        orderName: `Đơn hàng ${new Date().toLocaleDateString('vi-VN')}`
      };

      const response: any = await firstValueFrom(
        this.api.post<any>('/api/orders', orderData)
      );

      this.notifier.showSuccess('Đã tạo đơn hàng thành công!');
      
      // Navigate to order detail
      if (response.data && response.data._id) {
        await this.router.navigate(['/collections/orders', response.data._id]);
      } else {
        await this.router.navigate(['/collections/orders']);
      }
      
    } catch (error: any) {
      console.error('[AdminOrderCreate] Submit error:', error);
      this.notifier.showError(error?.error?.message || 'Không thể tạo đơn hàng');
    } finally {
      this.submitting.set(false);
    }
  }
}

