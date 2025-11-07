import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './order-success.html',
  styleUrl: './order-success.css'
})
export class OrderSuccess implements OnInit {
  orderInfo = signal<any>(null);
  
  constructor(private router: Router) {
    // Get order info from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      this.orderInfo.set(navigation.extras.state['orderData']);
    }
  }

  ngOnInit() {
    // If no order info, redirect to home
    if (!this.orderInfo()) {
      const savedOrder = localStorage.getItem('lastOrderInfo');
      if (savedOrder) {
        this.orderInfo.set(JSON.parse(savedOrder));
      } else {
        this.router.navigate(['/']);
      }
    }
  }

  // View order details
  viewOrderDetails() {
    const orderData = this.orderInfo();
    
    // ALWAYS use orderNumber, not _id
    let orderNumber = orderData?.orderNumber;
    
    // If not in orderData, try localStorage
    if (!orderNumber) {
      const lastOrderData = localStorage.getItem('lastOrderData');
      if (lastOrderData) {
        try {
          const orderInfo = JSON.parse(lastOrderData);
          orderNumber = orderInfo.orderNumber; // Only use orderNumber
        } catch (e) {
          console.error('Error parsing lastOrderData:', e);
        }
      }
    }
    
    // Last resort: try lastOrderId (which should be orderNumber)
    if (!orderNumber) {
      orderNumber = localStorage.getItem('lastOrderId');
    }
    
    if (!orderNumber) {
      console.error('❌ No orderNumber found');
      console.error('📋 Available orderData:', orderData);
      alert('Không tìm thấy số đơn hàng. Vui lòng thử lại.');
      return;
    }

    console.log('🔍 Navigating to order details with orderNumber:', orderNumber);
    
    // Navigate to order page using orderNumber - it will load from MongoDB
    this.router.navigate(['/order', orderNumber]);
  }

  // Go to home page
  goToHome() {
    localStorage.removeItem('lastOrderInfo');
    this.router.navigate(['/']);
  }

  // Format price
  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  // Get payment method name
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
}

