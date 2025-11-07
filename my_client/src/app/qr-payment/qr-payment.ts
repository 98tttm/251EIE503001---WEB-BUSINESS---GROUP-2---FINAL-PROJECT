import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

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
  selector: 'app-qr-payment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './qr-payment.html',
  styleUrl: './qr-payment.css',
})
export class QrPayment implements OnInit {
  items = signal<PaymentItem[]>([]);
  total = signal(0);
  orderNumber = signal<string>('');
  qrCode = signal<string>('');
  isPending = signal<boolean>(false); // Order not created yet
  pendingOrderData = signal<PendingOrderData | null>(null);
  
  bankAccount = signal({
    name: 'CÔNG TY CỔ PHẦN MEDICARE',
    number: '0000552758394',
    bank: 'Ngân hàng Quân Đội (MB Bank)'
  });

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
      }
      
      // Load pending order data from localStorage
      const pendingDataStr = localStorage.getItem('pendingOrderData');
      if (pendingDataStr) {
        const pendingData: PendingOrderData = JSON.parse(pendingDataStr);
        this.pendingOrderData.set(pendingData);
        
        if (pendingData.orderData) {
          this.items.set(pendingData.orderData.items || []);
          this.total.set(pendingData.orderData.total || 0);
        }
      }
    } else {
      // Order already created (from existing order)
      this.isPending.set(false);
      
      if (state && state.orderData) {
        this.items.set(state.orderData.items || []);
        this.total.set(state.orderData.total || 0);
        orderNum = state.orderData.orderNumber || '';
      } else {
        // Fallback to localStorage
        const lastOrder = localStorage.getItem('lastOrderInfo');
        if (lastOrder) {
          const orderData = JSON.parse(lastOrder);
          this.items.set(orderData.items || []);
          this.total.set(orderData.total || 0);
          orderNum = orderData.orderNumber || '';
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
    }

    // Generate QR code data
    this.generateQRCode();
  }

  generateQRCode() {
    // Use local QR code image
    this.qrCode.set('/assets/images/bank/QRBank.jpg');
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  copyAccountNumber() {
    navigator.clipboard.writeText(this.bankAccount().number);
    alert('Đã sao chép số tài khoản!');
  }

  copyQRData() {
    const qrData = `${this.bankAccount().number}\nSố tiền: ${this.formatPrice(this.total())}\nNội dung: Thanh toán đơn hàng ${this.orderNumber() || Date.now()}`;
    navigator.clipboard.writeText(qrData);
    alert('Đã sao chép thông tin thanh toán!');
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
            paymentMethod: 'qr'
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
      const response = await fetch('http://localhost:3000/api/orders', {
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
        
        // Import CartService dynamically or use fetch
        // For now, use fetch to remove from cart
        try {
          const cartResponse = await fetch(`http://localhost:3000/api/cart/${localStorage.getItem('userId') || 'guest'}`);
          const cartData = await cartResponse.json();
          
          if (cartData.success && cartData.data && cartData.data.items) {
            const remainingItems = cartData.data.items.filter((item: any) => 
              !orderedItemIds.includes(String(item._id))
            );
            
            await fetch(`http://localhost:3000/api/cart/${localStorage.getItem('userId') || 'guest'}`, {
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
            await fetch('http://localhost:3000/api/orders/send-invoice', {
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
              paymentMethod: 'qr'
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
    // Clear pending order data if going back
    if (this.isPending()) {
      // Keep pendingOrderData in localStorage so user can return
      // Just navigate back
    }
    this.router.navigate(['/payment']);
  }
}

