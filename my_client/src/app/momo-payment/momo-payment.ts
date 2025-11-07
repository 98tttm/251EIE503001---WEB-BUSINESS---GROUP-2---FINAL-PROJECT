import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
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

interface PendingOrderData {
  orderData: any;
  orderPayload: any;
  orderDataWithNumber?: any;
}

@Component({
  selector: 'app-momo-payment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './momo-payment.html',
  styleUrl: './momo-payment.css',
})
export class MomoPayment implements OnInit {
  items = signal<PaymentItem[]>([]);
  total = signal(0);
  orderNumber = signal<string>('');
  qrCode = signal<string>('/assets/images/bank/momo.jpg');
  isPending = signal<boolean>(false);
  pendingOrderData = signal<PendingOrderData | null>(null);
  
  recipientName = signal<string>('');
  recipientPhone = signal<string>('');
  cachedOrderNumber = signal<string>('');

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get order data from route state or localStorage
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state || history.state;
    
    let orderNum = '';
    
    // Check if order is pending (not created yet)
    if (state && state.pending === true) {
      this.isPending.set(true);
      
      // Load from state
      if (state.orderData) {
        this.items.set(state.orderData.items || []);
        this.total.set(state.orderData.total || 0);
        
        // Get recipient info from address
        if (state.orderData.address) {
          this.recipientName.set(state.orderData.address.name || '');
          this.recipientPhone.set(state.orderData.address.phone || '');
        } else if (state.orderData.guestRecipientInfo) {
          this.recipientName.set(state.orderData.guestRecipientInfo.name || '');
          this.recipientPhone.set(state.orderData.guestRecipientInfo.phone || '');
        }
      }
      
      // Load pending order data from localStorage
      const pendingDataStr = localStorage.getItem('pendingOrderData');
      if (pendingDataStr) {
        const pendingData: PendingOrderData = JSON.parse(pendingDataStr);
        this.pendingOrderData.set(pendingData);
        
        if (pendingData.orderData) {
          this.items.set(pendingData.orderData.items || []);
          this.total.set(pendingData.orderData.total || 0);
          
          // Get recipient info
          if (pendingData.orderData.address) {
            this.recipientName.set(pendingData.orderData.address.name || '');
            this.recipientPhone.set(pendingData.orderData.address.phone || '');
          } else if (pendingData.orderData.guestRecipientInfo) {
            this.recipientName.set(pendingData.orderData.guestRecipientInfo.name || '');
            this.recipientPhone.set(pendingData.orderData.guestRecipientInfo.phone || '');
          }
        }
      }
    } else {
      // Order already created (from existing order)
      this.isPending.set(false);
      
      if (state && state.orderData) {
        this.items.set(state.orderData.items || []);
        this.total.set(state.orderData.total || 0);
        orderNum = state.orderData.orderNumber || '';
        
        if (state.orderData.address) {
          this.recipientName.set(state.orderData.address.name || '');
          this.recipientPhone.set(state.orderData.address.phone || '');
        }
      } else {
        // Fallback to localStorage
        const lastOrder = localStorage.getItem('lastOrderInfo');
        if (lastOrder) {
          const orderData = JSON.parse(lastOrder);
          this.items.set(orderData.items || []);
          this.total.set(orderData.total || 0);
          orderNum = orderData.orderNumber || '';
          
          if (orderData.address) {
            this.recipientName.set(orderData.address.name || '');
            this.recipientPhone.set(orderData.address.phone || '');
          }
        }
      }
      
      // Try to get orderNumber from localStorage if not in state
      if (!orderNum) {
        const lastOrderId = localStorage.getItem('lastOrderId');
        if (lastOrderId) {
          orderNum = lastOrderId;
        }
      }
      
      this.orderNumber.set(orderNum);
      
      // Cache order number to prevent constant changes
      if (orderNum) {
        this.cachedOrderNumber.set(orderNum);
      } else {
        // Generate and cache order number only once
        if (!this.cachedOrderNumber()) {
          this.cachedOrderNumber.set('MD' + Date.now());
        }
      }
    }
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  getOrderNumberForContent(): string {
    return this.orderNumber() || this.cachedOrderNumber();
  }

  // Calculate final price for item (handle discount correctly)
  getItemFinalPrice(item: PaymentItem): number {
    if (item.discount && item.discount > 0) {
      // If discount is a percentage (0-100)
      if (item.discount <= 100) {
        return item.price * (1 - item.discount / 100);
      } else {
        // If discount is an amount (subtract from price)
        return Math.max(0, item.price - item.discount);
      }
    }
    return item.price;
  }

  async confirmPayment() {
    // If order is pending, create it now
    if (!this.isPending() || !this.pendingOrderData()) {
      // Order already exists, just redirect to success
      this.router.navigate(['/order-success'], {
        state: {
          orderData: {
            items: this.items(),
            total: this.total(),
            orderNumber: this.orderNumber(),
            paymentMethod: 'momo'
          }
        }
      });
      return;
    }
    
    const pendingData = this.pendingOrderData();
    
    if (!pendingData) {
      alert('Không tìm thấy dữ liệu đơn hàng. Vui lòng thử lại.');
      return;
    }
    
    console.log('📦 Creating order now (user confirmed payment)...');
    
    try {
      // Create order in database
      const response = await fetch(`${environment.apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingData.orderPayload)
      });
      
      const orderResponse = await response.json();
      
      if (orderResponse.success && orderResponse.data) {
        console.log('✅ Order created:', orderResponse.data.orderNumber);
        
        const orderNumber = orderResponse.data.orderNumber;
        const orderId = orderResponse.data._id || orderNumber;
        
        // Store order info
        localStorage.setItem('lastOrderId', orderNumber);
        localStorage.setItem('lastOrderData', JSON.stringify({
          orderNumber: orderNumber,
          _id: orderId
        }));
        
        // Clear pending order data
        localStorage.removeItem('pendingOrderData');
        localStorage.removeItem('checkoutItems');
        localStorage.removeItem('checkoutVoucher'); // Clear voucher after order is created
        
        // Remove ordered items from cart
        const orderedItemIds = this.items().map(item => item._id);
        console.log('🗑️ Removing ordered items from cart:', orderedItemIds);
        
        try {
          const cartResponse = await fetch(`${environment.apiUrl}/api/cart/${localStorage.getItem('userId') || 'guest'}`);
          const cartData = await cartResponse.json();
          
          if (cartData.success && cartData.data && cartData.data.items) {
            const remainingItems = cartData.data.items.filter((item: any) => 
              !orderedItemIds.includes(String(item._id))
            );
            
            await fetch(`${environment.apiUrl}/api/cart/${localStorage.getItem('userId') || 'guest'}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: remainingItems })
            });
          }
        } catch (cartError) {
          console.error('Error removing items from cart:', cartError);
        }
        
        // Handle invoice if required
        if (pendingData.orderPayload?.requireInvoice) {
          try {
            await fetch(`${environment.apiUrl}/api/orders/send-invoice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...pendingData.orderData,
                orderNumber: orderNumber,
                _id: orderId
              })
            });
          } catch (invoiceError) {
            console.error('Error sending invoice:', invoiceError);
          }
        }
        
        // Redirect to order success page
        this.router.navigate(['/order-success'], {
          state: {
            orderData: {
              ...pendingData.orderData,
              orderNumber: orderNumber,
              _id: orderId,
              paymentMethod: 'momo'
            }
          }
        });
      } else {
        alert('Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
        console.error('Order creation failed:', orderResponse);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
    }
  }

  cancelPayment() {
    if (confirm('Bạn có chắc muốn hủy thanh toán?')) {
      // Clear pending order data if exists
      if (this.isPending()) {
        localStorage.removeItem('pendingOrderData');
      }
      this.router.navigate(['/cart']);
    }
  }

  goBack() {
    // Keep pendingOrderData in localStorage so user can return
    this.router.navigate(['/payment']);
  }
}

