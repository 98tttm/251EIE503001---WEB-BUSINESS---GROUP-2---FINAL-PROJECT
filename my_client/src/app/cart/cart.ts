import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { CategoryService, Product } from '../services/category.service';
import { ToastService } from '../toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit {
  // Selected items tracking
  selectedItems = signal<Set<string>>(new Set());
  selectAll = signal(false);
  
  // Delete confirmation
  showDeleteConfirm = signal(false);
  itemToDelete = signal<string | null>(null);
  showDeleteAllConfirm = signal(false);

  // Recently Viewed Products
  recentlyViewed = signal<Product[]>([]);
  currentSlide = signal(0);

  // Voucher states
  showVoucherModal = signal(false);
  voucherCodeInput = '';
  appliedVoucher = signal<any>(null);
  voucherDiscount = signal<number>(0);
  applyingVoucher = signal(false);
  voucherError = signal<string | null>(null);

  constructor(
    private router: Router,
    public cartService: CartService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    // Reload cart from database to ensure fresh data
    await this.cartService.loadCart();
    
    // Auto-select all items when cart loads
    this.selectAllItems();
    
    // Load recently viewed products
    this.loadRecentlyViewed();
  }

  get isEmpty(): boolean {
    return this.cartService.cartItems().length === 0;
  }

  // Select/deselect all items
  toggleSelectAll() {
    const newState = !this.selectAll();
    this.selectAll.set(newState);
    
    if (newState) {
      this.selectAllItems();
    } else {
      this.selectedItems.set(new Set());
    }
  }

  selectAllItems() {
    const allIds = new Set(this.cartService.cartItems().map(item => item._id));
    this.selectedItems.set(allIds);
    this.selectAll.set(true);
  }

  // Toggle individual item selection
  toggleItemSelection(itemId: string) {
    const current = new Set(this.selectedItems());
    
    if (current.has(itemId)) {
      current.delete(itemId);
    } else {
      current.add(itemId);
    }
    
    this.selectedItems.set(current);
    
    // Update select all state
    this.selectAll.set(current.size === this.cartService.cartItems().length);
  }

  // Check if item is selected
  isItemSelected(itemId: string): boolean {
    return this.selectedItems().has(itemId);
  }

  // Get total for selected items only
  get selectedTotal(): number {
    return this.cartService.cartItems().reduce((sum, item) => {
      if (this.selectedItems().has(item._id)) {
        const price = this.getItemPrice(item);
        return sum + (price * item.quantity);
      }
      return sum;
    }, 0);
  }

  // Get original total for selected items
  get selectedOriginalTotal(): number {
    return this.cartService.cartItems().reduce((sum, item) => {
      if (this.selectedItems().has(item._id)) {
        const price = this.getItemOriginalPrice(item);
        return sum + (price * item.quantity);
      }
      return sum;
    }, 0);
  }

  // Get discount for selected items
  get selectedDiscount(): number {
    return this.selectedOriginalTotal - this.selectedTotal;
  }

  // Get final total with voucher discount
  get finalTotal(): number {
    return Math.max(0, this.selectedTotal - this.voucherDiscount());
  }

  // Voucher methods
  openVoucherModal() {
    this.showVoucherModal.set(true);
    this.voucherError.set(null);
  }

  closeVoucherModal() {
    this.showVoucherModal.set(false);
    this.voucherError.set(null);
  }

  async applyVoucher() {
    const code = this.voucherCodeInput.trim().toUpperCase();
    if (!code) {
      this.voucherError.set('Vui lòng nhập mã giảm giá');
      return;
    }

    this.applyingVoucher.set(true);
    this.voucherError.set(null);

    try {
      const response = await this.http.post<{ success: boolean; data?: any; message?: string }>(
        `${environment.apiUrl}/api/vouchers/validate`,
        {
          code: code,
          total: this.selectedTotal
        }
      ).toPromise();

      if (response?.success && response.data) {
        const voucher = response.data;
        this.appliedVoucher.set(voucher);
        
        // Calculate voucher discount
        const discountAmount = Math.round((this.selectedTotal * voucher.discountPercent) / 100);
        this.voucherDiscount.set(discountAmount);
        
        this.voucherCodeInput = '';
        this.voucherError.set(null);
      } else {
        this.voucherError.set(response?.message || 'Mã giảm giá không hợp lệ');
      }
    } catch (error: any) {
      this.voucherError.set(error?.error?.message || 'Không thể áp dụng mã giảm giá. Vui lòng thử lại.');
    } finally {
      this.applyingVoucher.set(false);
    }
  }

  removeVoucher() {
    this.appliedVoucher.set(null);
    this.voucherDiscount.set(0);
    this.voucherCodeInput = '';
    this.voucherError.set(null);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  continueShopping() {
    this.router.navigate(['/products']);
  }

  // Increase quantity
  async increaseQuantity(itemId: string) {
    const item = this.cartService.cartItems().find(i => i._id === itemId);
    if (item) {
      await this.cartService.updateQuantity(itemId, item.quantity + 1);
      // Auto-select item when quantity changes
      if (!this.isItemSelected(itemId)) {
        this.toggleItemSelection(itemId);
      }
    }
  }

  // Decrease quantity
  async decreaseQuantity(itemId: string) {
    const item = this.cartService.cartItems().find(i => i._id === itemId);
    if (item && item.quantity > 1) {
      await this.cartService.updateQuantity(itemId, item.quantity - 1);
    }
  }

  // Show delete confirmation
  showDeleteConfirmation(itemId: string) {
    this.itemToDelete.set(itemId);
    this.showDeleteConfirm.set(true);
  }
  
  // Remove item after confirmation
  async confirmDelete() {
    const itemId = this.itemToDelete();
    if (itemId) {
      await this.cartService.removeFromCart(itemId);
      // Remove from selected items
      const current = new Set(this.selectedItems());
      current.delete(itemId);
      this.selectedItems.set(current);
      
      // Update select all state
      this.selectAll.set(current.size === this.cartService.cartItems().length);
      ToastService.success('Đã xóa sản phẩm khỏi giỏ hàng');
    }
    this.cancelDelete();
  }
  
  // Cancel delete
  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.itemToDelete.set(null);
  }
  
  // Show delete all confirmation
  showDeleteAllConfirmation() {
    this.showDeleteAllConfirm.set(true);
  }
  
  // Cancel delete all
  cancelDeleteAll() {
    this.showDeleteAllConfirm.set(false);
  }
  
  // Remove all items after confirmation
  async confirmDeleteAll() {
    const items = this.cartService.cartItems();
    for (const item of items) {
      await this.cartService.removeFromCart(item._id);
    }
    this.selectedItems.set(new Set());
    this.selectAll.set(false);
    ToastService.success('Đã xóa tất cả sản phẩm khỏi giỏ hàng');
    this.cancelDeleteAll();
  }

  // Get item price (considering discount)
  getItemPrice(item: any): number {
    return item.discount ? item.price : item.price;
  }

  // Get item original price
  getItemOriginalPrice(item: any): number {
    return item.discount ? item.price + item.discount : item.price;
  }

  // Get item subtotal
  getItemSubtotal(item: any): number {
    return this.getItemPrice(item) * item.quantity;
  }

  // Proceed to checkout
  proceedToCheckout() {
    // Check if any items are selected
    if (this.selectedItems().size === 0) {
      ToastService.warning('Vui lòng chọn ít nhất một sản phẩm để thanh toán');
      return;
    }

    // Get selected items
    const selectedCartItems = this.cartService.cartItems().filter(item => 
      this.selectedItems().has(item._id)
    );

    // Store checkout items in localStorage
    localStorage.setItem('checkoutItems', JSON.stringify(selectedCartItems));

    // Store voucher information in localStorage
    const voucherInfo = {
      appliedVoucher: this.appliedVoucher(),
      voucherDiscount: this.voucherDiscount(),
      selectedTotal: this.selectedTotal
    };
    localStorage.setItem('checkoutVoucher', JSON.stringify(voucherInfo));

    // Navigate to payment page
    this.router.navigate(['/payment']);
  }

  // Recently Viewed Products Management
  loadRecentlyViewed() {
    try {
      const stored = localStorage.getItem('recentlyViewedProducts');
      if (stored) {
        const products = JSON.parse(stored);
        this.recentlyViewed.set(products.slice(0, 8));
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
  }

  // Slider navigation for recently viewed
  prevSlide() {
    if (this.currentSlide() > 0) {
      this.currentSlide.set(this.currentSlide() - 1);
    }
  }

  nextSlide() {
    if (this.currentSlide() < this.recentlyViewed().length - 5) {
      this.currentSlide.set(this.currentSlide() + 1);
    }
  }

  getSlideWidth(): number {
    // Check if mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 200; // 180px card + 20px gap
    }
    return 260; // 240px card + 20px gap
  }

  // Add to cart from recently viewed
  async addToCart(product: Product) {
    const result = await this.cartService.addToCart({
      _id: product._id,
      name: product.name,
      price: product.discount ? product.price : product.price,
      discount: product.discount,
      image: product.image || 'https://via.placeholder.com/400x400?text=MediCare',
      unit: product.unit || 'Hộp',
      stock: product.stock || 999
    });

    if (result.success) {
      ToastService.success(result.message || `Đã thêm ${product.name} vào giỏ hàng!`);
    } else {
      ToastService.error(result.message || 'Sản phẩm đã hết hàng hoặc vượt quá số lượng trong kho!');
    }
  }

  // Format price helper
  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  // Calculate discount percent
  calculateDiscountPercent(price: number, discount: number): number {
    if (!discount || discount <= 0) return 0;
    const originalPrice = price + discount;
    return Math.round((discount / originalPrice) * 100);
  }
}

