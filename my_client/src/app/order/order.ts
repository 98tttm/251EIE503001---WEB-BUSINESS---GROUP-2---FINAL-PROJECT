import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Login } from '../login/login';

interface OrderItem {
  _id: string;
  name: string;
  image: string;
  price: number;
  discount?: number;
  quantity: number;
  unit: string;
}

interface OrderAddress {
  name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
}

interface OrderData {
  orderNumber?: string;
  orderName?: string;
  orderDate?: string;
  status?: string;
  statusHistory?: Array<{ status: string; timestamp: string; reason?: string }>;
  items?: OrderItem[];
  address?: OrderAddress;
  paymentMethod?: string;
  subtotal?: number;
  discount?: number;
  voucherCode?: string | null;
  voucherDiscount?: number;
  shippingFee?: number;
  total?: number;
  expectedDelivery?: string;
}

@Component({
  selector: 'app-order',
  standalone: true,
  imports: [CommonModule, RouterModule, Login],
  templateUrl: './order.html',
  styleUrl: './order.css',
})
export class Order implements OnInit {
  orderData = signal<OrderData | null>(null);
  orderId = signal<string>('');
  isEditingOrderName = signal<boolean>(false);
  
  // Reference to Login component
  @ViewChild(Login) loginComponent!: Login;
  
  editingOrderName = signal<string>('');

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Get orderNumber from route params and load from MongoDB
    this.route.params.subscribe(params => {
      const orderNumber = params['id']; // This is actually orderNumber, not _id
      
      if (orderNumber) {
        console.log('📦 Loading order from MongoDB using orderNumber:', orderNumber);
        this.orderId.set(orderNumber);
        this.loadOrder(orderNumber);
      } else {
        console.error('❌ No orderNumber in route params');
        // Try to get from navigation state as fallback
        const navigation = this.router.getCurrentNavigation();
        let state = navigation?.extras?.state;
        
        if (!state && typeof window !== 'undefined') {
          state = (window.history.state || {});
        }
        
        if (state && state['orderData']) {
          const orderData = state['orderData'];
          const fallbackOrderNumber = orderData.orderNumber; // Only use orderNumber
          if (fallbackOrderNumber && fallbackOrderNumber !== 'latest') {
            console.log('📦 Loading order from navigation state (orderNumber):', fallbackOrderNumber);
            this.orderId.set(fallbackOrderNumber);
            this.loadOrder(fallbackOrderNumber);
          } else {
            this.router.navigate(['/']);
          }
        } else {
          this.router.navigate(['/']);
        }
      }
    });
  }

  loadOrder(orderNumber: string) {
    if (!orderNumber || orderNumber === 'latest') {
      console.error('❌ Invalid orderNumber:', orderNumber);
      alert('Số đơn hàng không hợp lệ.');
      this.router.navigate(['/']);
      return;
    }

    // Always fetch from MongoDB API using orderNumber
    console.log('📦 Fetching order from MongoDB with orderNumber:', orderNumber);
    fetch(`http://localhost:3000/api/orders/${encodeURIComponent(orderNumber)}`)
      .then(async response => {
        console.log('📡 API Response status:', response.status);
        const data = await response.json();
        
        // Handle different status codes
        if (response.status === 500) {
          console.error('❌ Server error (500):', data);
          throw new Error(data.error || 'Internal server error');
        }
        
        if (response.status === 404) {
          console.error('❌ Order not found (404):', data);
          return { success: false, ...data };
        }
        
        if (!response.ok) {
          console.error('❌ API error:', response.status, data);
          throw new Error(data.error || `API error: ${response.status}`);
        }
        
        return data;
      })
      .then(data => {
        console.log('📦 API Response data:', data);
        
        if (data.success && data.data) {
          console.log('✅ Order loaded from MongoDB');
          console.log('📋 Order details:', {
            orderNumber: data.data.orderNumber,
            _id: data.data._id,
            status: data.data.status,
            itemsCount: data.data.items?.length || 0
          });
          
          // Map MongoDB order format to component format
          const order = data.data;
          
          // Get orderName or generate default from date
          let orderName = order.orderName;
          if (!orderName && order.createdAt) {
            const date = new Date(order.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            orderName = `Đơn hàng ${day}/${month}/${year}`;
          } else if (!orderName) {
            orderName = 'Đơn hàng';
          }
          
          const mappedOrder: OrderData = {
            orderNumber: order.orderNumber,
            orderName: orderName,
            orderDate: order.createdAt,
            status: order.status,
            statusHistory: order.statusHistory || [],
            items: order.items || [],
            address: order.shippingAddress || {
              name: order.customerInfo?.name || '',
              phone: order.customerInfo?.phone || '',
              province: order.shippingAddress?.province || '',
              district: order.shippingAddress?.district || '',
              ward: order.shippingAddress?.ward || '',
              detailAddress: order.shippingAddress?.detailAddress || ''
            },
            paymentMethod: order.paymentMethod,
            subtotal: order.pricing?.subtotal || 0,
            discount: order.pricing?.discount || 0,
            voucherCode: order.pricing?.voucherCode || null,
            voucherDiscount: order.pricing?.voucherDiscount || 0,
            shippingFee: order.pricing?.shippingFee || 0,
            total: order.pricing?.total || 0,
            expectedDelivery: order.expectedDelivery
          };
          
          this.orderData.set(mappedOrder);
          this.editingOrderName.set(orderName);
          
          // Focus input if editing
          setTimeout(() => {
            if (this.isEditingOrderName()) {
              const input = document.querySelector('.order-name-input') as HTMLInputElement;
              if (input) {
                input.focus();
                input.select();
              }
            }
          }, 0);
        } else {
          console.error('❌ Order not found:', {
            searchedOrderNumber: orderNumber,
            error: data.error,
            suggestion: data.suggestion,
            details: data.details
          });
          
          // More detailed error message
          let errorMsg = 'Không tìm thấy đơn hàng.';
          if (data.error) {
            errorMsg += `\n\nLỗi: ${data.error}`;
          }
          if (data.details) {
            errorMsg += `\nChi tiết: ${data.details}`;
          }
          if (data.searchedId) {
            errorMsg += `\nSố đơn hàng tìm kiếm: ${data.searchedId}`;
          }
          if (data.suggestion) {
            errorMsg += `\n\n${data.suggestion}`;
          }
          alert(errorMsg);
          
          // Don't redirect immediately - let user see the error
          // this.router.navigate(['/']);
        }
      })
      .catch(error => {
        console.error('❌ Error loading order:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          orderNumber: orderNumber
        });
        
        let errorMsg = 'Không thể tải đơn hàng.';
        if (error.message) {
          errorMsg += `\n\nLỗi: ${error.message}`;
        }
        errorMsg += '\n\nVui lòng kiểm tra:';
        errorMsg += '\n- Kết nối mạng';
        errorMsg += '\n- Backend server đang chạy (localhost:3000)';
        errorMsg += '\n- Số đơn hàng đúng';
        
        alert(errorMsg);
        // Don't redirect on network error - might be temporary
      });
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  calculateDiscountPercent(price: number, discount: number): number {
    if (!discount || discount <= 0) return 0;
    return Math.round((discount / (price + discount)) * 100);
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      'pending': '#f59e0b',
      'confirmed': '#3b82f6',
      'processing': '#6366f1',
      'shipping': '#8b5cf6',
      'delivered': '#10b981',
      'cancelled': '#ef4444',
      'Đã hủy': '#ef4444'
    };
    return statusColors[status.toLowerCase()] || '#6b7280';
  }

  getStatusText(status: string): string {
    const statusTexts: { [key: string]: string } = {
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'processing': 'Đang xử lý',
      'shipping': 'Đang giao hàng',
      'delivered': 'Đã giao hàng',
      'cancelled': 'Đã hủy',
      'Đã hủy': 'Đã hủy'
    };
    return statusTexts[status.toLowerCase()] || status;
  }

  getPaymentMethodName(method: string): string {
    const methods: { [key: string]: string } = {
      'cod': 'Thanh toán tiền mặt khi nhận hàng',
      'qr': 'Thanh toán bằng chuyển khoản (QR Code)',
      'bank': 'Thanh toán bằng thẻ ATM nội địa và tài khoản ngân hàng',
      'card': 'Thanh toán bằng thẻ quốc tế (Visa, Master...), Apple Pay, Google Pay và ví VNPay',
      'momo': 'Thanh toán bằng ví MoMo'
    };
    return methods[method] || method;
  }

  copyOrderNumber() {
    if (this.orderData()?.orderNumber) {
      navigator.clipboard.writeText(this.orderData()!.orderNumber!);
      alert('Đã sao chép số đơn hàng!');
    }
  }

  buyAgain() {
    // TODO: Add logic to re-add items to cart
    if (this.orderData()?.items) {
      alert('Chức năng mua lại đang được phát triển');
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string | Date | undefined): string {
    if (!dateString) return '';
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const time = date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateStr = date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${time} ngày ${dateStr}`;
  }

  // Edit order name
  startEditOrderName() {
    const currentName = this.orderData()?.orderName || '';
    this.editingOrderName.set(currentName);
    this.isEditingOrderName.set(true);
    
    // Focus input after state update
    setTimeout(() => {
      const input = document.querySelector('.order-name-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  cancelEditOrderName() {
    const currentName = this.orderData()?.orderName || '';
    this.editingOrderName.set(currentName);
    this.isEditingOrderName.set(false);
  }

  async saveOrderName() {
    const newName = this.editingOrderName().trim();
    if (!newName || newName === '') {
      alert('Tên đơn hàng không được để trống');
      return;
    }

    const orderNumber = this.orderData()?.orderNumber || this.orderId();
    if (!orderNumber) {
      alert('Không tìm thấy số đơn hàng');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(orderNumber)}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderName: newName })
      });

      // Check if response is OK and is JSON
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('API endpoint không tồn tại. Vui lòng kiểm tra backend server đã được restart.');
        }
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`Server trả về lỗi: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (data.success) {
        // Update local order data
        const currentData = this.orderData();
        if (currentData) {
          this.orderData.set({
            ...currentData,
            orderName: newName
          });
        }
        this.isEditingOrderName.set(false);
        console.log('✅ Order name updated successfully');
      } else {
        alert('Có lỗi xảy ra khi cập nhật tên đơn hàng: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error updating order name:', error);
      
      let errorMessage = 'Không thể kết nối đến server.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(errorMessage + '\n\nVui lòng:\n1. Kiểm tra backend server đang chạy (localhost:3000)\n2. Restart backend server để load API endpoint mới');
    }
  }

  // Navigate to orders with login check
  navigateToOrders(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Check if user is logged in
    const isLoggedIn = this.authService.isLoggedIn();
    
    if (!isLoggedIn || !this.loginComponent?.isLoggedIn) {
      // Store redirect path for after login
      localStorage.setItem('loginRedirect', '/profile/orders');
      
      // Open login popup
      if (this.loginComponent) {
        this.loginComponent.openLoginPopup();
        // Show message
        setTimeout(() => {
          alert('Vui lòng đăng nhập để xem đơn hàng của bạn');
        }, 100);
      } else {
        // If login component not ready, just show alert
        alert('Vui lòng đăng nhập để xem đơn hàng của bạn');
      }
    } else {
      // User is logged in, navigate normally
      this.router.navigate(['/profile/orders']);
    }
  }

  onOrderNameKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveOrderName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditOrderName();
    }
  }

  getCancellationInfo() {
    const order = this.orderData();
    if (!order?.statusHistory) return null;
    
    const cancelled = order.statusHistory.find(s => 
      s.status.toLowerCase().includes('cancelled') || 
      s.status.includes('Đã hủy')
    );
    
    return cancelled;
  }
}

