import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { ToastService } from '../toast.service';

interface OrderItem {
  _id: string;
  name: string;
  image: string;
  price: number;
  discount?: number;
  quantity: number;
  unit: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  orderName?: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
  pricing?: {
    total: number;
  };
}

@Component({
  selector: 'app-myorder',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './myorder.html',
  styleUrl: './myorder.css',
})
export class MyOrder implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal<boolean>(false);
  selectedStatus = signal<string>('all'); // all, pending, processing, shipping, delivered, cancelled
  searchQuery = signal<string>('');

  // Track editing state for each order
  editingOrderIds = signal<Set<string>>(new Set());
  editingOrderNames = signal<Map<string, string>>(new Map());

  // Track cancel order state
  cancellingOrderId = signal<string | null>(null);
  showCancelModal = signal<boolean>(false);
  cancelReason = signal<string>('');
  selectedOrderForCancel = signal<Order | null>(null);

  // Track return order state
  returningOrderId = signal<string | null>(null);
  showReturnModal = signal<boolean>(false);
  returnReason = signal<string>('');
  selectedOrderForReturn = signal<Order | null>(null);

  // Status mapping
  statusMap: { [key: string]: string } = {
    'pending': 'Đang xử lý',
    'confirmed': 'Đang xử lý',
    'processing': 'Đang xử lý',
    'shipping': 'Đang giao',
    'delivered': 'Đã giao',
    'cancelled': 'Đã hủy',
    'Đã hủy': 'Đã hủy'
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private cartService: CartService
  ) {}

  ngOnInit() {
    // Check if logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }

    this.loadOrders();
  }

  async loadOrders(status?: string) {
    const user = this.authService.currentUser();
    if (!user?.userId) {
      console.error('❌ User not logged in');
      return;
    }

    this.loading.set(true);
    try {
      const statusParam = status || this.selectedStatus();
      
      // Load all orders, then filter client-side for complex status groups
      const url = `http://localhost:3000/api/orders/user/${user.userId}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        // Ensure orderName exists for each order
        let ordersWithName = data.data.map((order: Order) => {
          if (!order.orderName && order.createdAt) {
            const date = new Date(order.createdAt);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            order.orderName = `Đơn hàng ${day}/${month}/${year}`;
          } else if (!order.orderName) {
            order.orderName = 'Đơn hàng';
          }
          return order;
        });

        // Filter by status on client side
        if (statusParam !== 'all') {
          ordersWithName = ordersWithName.filter((order: Order) => {
            return this.matchesStatusFilter(order.status, statusParam);
          });
        }

        this.orders.set(ordersWithName);
        console.log(`✅ Loaded ${ordersWithName.length} orders (filtered: ${statusParam})`);
      } else {
        this.orders.set([]);
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
      this.orders.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  matchesStatusFilter(orderStatus: string, filterStatus: string): boolean {
    // Normalize statuses
    const normalizedOrderStatus = orderStatus?.toLowerCase() || '';
    
    switch (filterStatus) {
      case 'processing':
        // Đang xử lý: pending, confirmed, processing
        return ['pending', 'confirmed', 'processing'].includes(normalizedOrderStatus);
      case 'delivering':
        // Đang giao: shipping
        return normalizedOrderStatus === 'shipping';
      case 'delivered':
        // Đã giao
        return normalizedOrderStatus === 'delivered';
      case 'cancelled':
        // Đã hủy
        return normalizedOrderStatus === 'cancelled' || normalizedOrderStatus === 'đã hủy';
      case 'return':
        // Trả hàng (if exists in backend)
        return normalizedOrderStatus === 'returned' || normalizedOrderStatus === 'return';
      default:
        return true;
    }
  }

  // Filtered and searched orders
  filteredOrders = computed(() => {
    let result = [...this.orders()];

    // Filter by search query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(order => {
        const nameMatch = order.orderName?.toLowerCase().includes(query);
        const numberMatch = order.orderNumber?.toLowerCase().includes(query);
        const productMatch = order.items?.some(item => 
          item.name?.toLowerCase().includes(query)
        );
        return nameMatch || numberMatch || productMatch;
      });
    }

    return result;
  });

  onStatusChange(status: string) {
    this.selectedStatus.set(status);
    this.loadOrders(status);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  getStatusText(status: string): string {
    return this.statusMap[status] || status;
  }

  getStatusColor(status: string): string {
    if (status === 'cancelled' || status === 'Đã hủy') return '#ef4444';
    if (status === 'delivered') return '#10b981';
    if (status === 'shipping') return '#f59e0b';
    if (status === 'processing' || status === 'confirmed' || status === 'pending') return '#3b82f6';
    return '#6b7280';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  viewOrderDetails(order: Order) {
    this.router.navigate(['/order', order.orderNumber]);
  }

  getFirstItemImage(order: Order): string {
    return order.items?.[0]?.image || 'https://via.placeholder.com/400x400?text=MediCare';
  }

  getFirstItemName(order: Order): string {
    return order.items?.[0]?.name || 'Sản phẩm';
  }

  getFirstItemPrice(order: Order): number {
    const item = order.items?.[0];
    if (!item) return 0;
    return (item.price - (item.discount || 0)) * item.quantity;
  }

  getFirstItemOriginalPrice(order: Order): number | null {
    const item = order.items?.[0];
    if (!item || !item.discount || item.discount === 0) return null;
    return item.price * item.quantity;
  }

  getFirstItemQuantity(order: Order): string {
    const item = order.items?.[0];
    if (!item) return '';
    return `x${item.quantity} ${item.unit || ''}`;
  }

  // Edit Order Name Methods
  isEditingOrder(orderId: string): boolean {
    return this.editingOrderIds().has(orderId);
  }

  getEditingOrderName(orderId: string): string {
    return this.editingOrderNames().get(orderId) || '';
  }

  startEditOrderName(order: Order, event: Event) {
    event.stopPropagation();
    const orderId = order._id || order.orderNumber;
    const currentName = order.orderName || `Đơn hàng ${this.formatDate(order.createdAt)}`;
    
    const editingIds = new Set(this.editingOrderIds());
    editingIds.add(orderId);
    this.editingOrderIds.set(editingIds);

    const editingNames = new Map(this.editingOrderNames());
    editingNames.set(orderId, currentName);
    this.editingOrderNames.set(editingNames);

    // Focus input after state update
    setTimeout(() => {
      const input = document.querySelector(`input[data-order-id="${orderId}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  cancelEditOrderName(order: Order, event: Event) {
    event.stopPropagation();
    const orderId = order._id || order.orderNumber;
    
    const editingIds = new Set(this.editingOrderIds());
    editingIds.delete(orderId);
    this.editingOrderIds.set(editingIds);

    const editingNames = new Map(this.editingOrderNames());
    editingNames.delete(orderId);
    this.editingOrderNames.set(editingNames);
  }

  async saveOrderName(order: Order, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    const orderId = order._id || order.orderNumber;
    const newName = this.editingOrderNames().get(orderId)?.trim();
    
    if (!newName || newName === '') {
      alert('Tên đơn hàng không được để trống');
      return;
    }

    const orderNumber = order.orderNumber;
    if (!orderNumber) {
      alert('Không tìm thấy số đơn hàng');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(orderNumber)}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderName: newName }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local order data
        const updatedOrders = this.orders().map(o => {
          if ((o._id === orderId) || (o.orderNumber === orderNumber)) {
            return { ...o, orderName: newName };
          }
          return o;
        });
        this.orders.set(updatedOrders);

        // Clear editing state
        const editingIds = new Set(this.editingOrderIds());
        editingIds.delete(orderId);
        this.editingOrderIds.set(editingIds);

        const editingNames = new Map(this.editingOrderNames());
        editingNames.delete(orderId);
        this.editingOrderNames.set(editingNames);

        console.log('✅ Order name updated successfully');
      } else {
        const errorMsg = data.message || data.error || 'Không thể cập nhật tên đơn hàng';
        alert(errorMsg);
      }
    } catch (error) {
      console.error('❌ Error updating order name:', error);
      alert('Đã xảy ra lỗi khi cập nhật tên đơn hàng. Vui lòng thử lại.');
    }
  }

  onOrderNameInput(orderId: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const editingNames = new Map(this.editingOrderNames());
    editingNames.set(orderId, input.value);
    this.editingOrderNames.set(editingNames);
  }

  onOrderNameKeydown(order: Order, event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveOrderName(order, event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditOrderName(order, event);
    }
  }

  // Check if order can be cancelled
  canCancelOrder(order: Order): boolean {
    const status = order.status?.toLowerCase() || '';
    // Can cancel if status is pending, confirmed, or processing (not shipping, delivered, or cancelled)
    return ['pending', 'confirmed', 'processing'].includes(status);
  }

  // Check if order can be returned
  canReturnOrder(order: Order): boolean {
    const status = order.status?.toLowerCase() || '';
    // Can return only if status is delivered (not already returned or return requested)
    return status === 'delivered';
  }

  // Open cancel order modal
  openCancelModal(order: Order) {
    this.selectedOrderForCancel.set(order);
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  // Close cancel order modal
  closeCancelModal() {
    this.showCancelModal.set(false);
    this.selectedOrderForCancel.set(null);
    this.cancelReason.set('');
  }

  // Handle cancel reason input
  onCancelReasonInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (target) {
      this.cancelReason.set(target.value);
    }
  }

  // Cancel order
  async cancelOrder() {
    const order = this.selectedOrderForCancel();
    if (!order) {
      return;
    }

    if (!this.canCancelOrder(order)) {
      ToastService.error('Đơn hàng này không thể hủy', 3000);
      this.closeCancelModal();
      return;
    }

    const orderId = order.orderNumber || order._id;
    if (!orderId) {
      ToastService.error('Không tìm thấy mã đơn hàng', 3000);
      this.closeCancelModal();
      return;
    }

    this.cancellingOrderId.set(orderId);
    const reason = this.cancelReason().trim() || 'Khách hàng yêu cầu hủy đơn';

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        ToastService.success('Đã hủy đơn hàng thành công', 3000);
        
        // Update local order status
        const updatedOrders = this.orders().map(o => {
          if (o._id === order._id || o.orderNumber === order.orderNumber) {
            return { ...o, status: 'cancelled' };
          }
          return o;
        });
        this.orders.set(updatedOrders);

        // Close modal
        this.closeCancelModal();

        // Reload orders to get latest data
        setTimeout(() => {
          this.loadOrders(this.selectedStatus());
        }, 500);
      } else {
        const errorMsg = data.error || data.message || 'Không thể hủy đơn hàng';
        ToastService.error(errorMsg, 4000);
      }
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      ToastService.error('Đã xảy ra lỗi khi hủy đơn hàng. Vui lòng thử lại.', 4000);
    } finally {
      this.cancellingOrderId.set(null);
    }
  }

  // Open return order modal
  openReturnModal(order: Order) {
    this.selectedOrderForReturn.set(order);
    this.returnReason.set('');
    this.showReturnModal.set(true);
  }

  // Close return order modal
  closeReturnModal() {
    this.showReturnModal.set(false);
    this.selectedOrderForReturn.set(null);
    this.returnReason.set('');
  }

  // Handle return reason input
  onReturnReasonInput(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (target) {
      this.returnReason.set(target.value);
    }
  }

  // Return order
  async returnOrder() {
    const order = this.selectedOrderForReturn();
    if (!order) {
      return;
    }

    if (!this.canReturnOrder(order)) {
      ToastService.error('Đơn hàng này không thể trả hàng', 3000);
      this.closeReturnModal();
      return;
    }

    const orderId = order.orderNumber || order._id;
    if (!orderId) {
      ToastService.error('Không tìm thấy mã đơn hàng', 3000);
      this.closeReturnModal();
      return;
    }

    this.returningOrderId.set(orderId);
    const reason = this.returnReason().trim() || 'Khách hàng yêu cầu trả hàng';

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(orderId)}/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        ToastService.success('Yêu cầu trả hàng đã được gửi thành công', 3000);
        
        // Update local order status
        const updatedOrders = this.orders().map(o => {
          if (o._id === order._id || o.orderNumber === order.orderNumber) {
            return { ...o, status: 'return_requested' };
          }
          return o;
        });
        this.orders.set(updatedOrders);

        // Close modal
        this.closeReturnModal();

        // Reload orders to get latest data
        setTimeout(() => {
          this.loadOrders(this.selectedStatus());
        }, 500);
      } else {
        const errorMsg = data.error || data.message || 'Không thể gửi yêu cầu trả hàng';
        ToastService.error(errorMsg, 4000);
      }
    } catch (error) {
      console.error('❌ Error returning order:', error);
      ToastService.error('Đã xảy ra lỗi khi gửi yêu cầu trả hàng. Vui lòng thử lại.', 4000);
    } finally {
      this.returningOrderId.set(null);
    }
  }

  // Buy again - Add all items from order to cart
  async buyAgain(order: Order) {
    console.log('========================================');
    console.log('🛒 MUA LẠI ĐỚN HÀNG');
    console.log('========================================');
    console.log('📦 Đơn hàng:', order.orderNumber);
    console.log('📋 Số sản phẩm:', order.items?.length || 0);
    
    if (!order.items || order.items.length === 0) {
      ToastService.warning('Đơn hàng không có sản phẩm để mua lại', 4000);
      return;
    }

    try {
      console.log('\n🔄 Bắt đầu thêm sản phẩm vào giỏ hàng...\n');
      
      let addedCount = 0;
      let failedCount = 0;
      const failedItems: string[] = [];

      for (const item of order.items) {
        try {
          console.log(`  → Đang thêm: ${item.name} (SL: ${item.quantity})`);
          
          // Map order item to cart item format
          const cartItem = {
            _id: item._id,
            name: item.name,
            price: item.price,
            discount: item.discount,
            image: item.image,
            unit: item.unit,
            stock: 999 // Assume in stock, will be validated by backend
          };

          // Add to cart with the original quantity
          await this.cartService.addToCart(cartItem);
          
          // If quantity > 1, update quantity
          if (item.quantity > 1) {
            await this.cartService.updateQuantity(item._id, item.quantity);
            console.log(`    ✅ Đã thêm: ${item.name} x${item.quantity}`);
          } else {
            console.log(`    ✅ Đã thêm: ${item.name} x1`);
          }
          
          addedCount++;
        } catch (error) {
          console.error(`    ❌ Thất bại: ${item.name}`, error);
          failedCount++;
          failedItems.push(item.name);
        }
      }

      console.log('\n========================================');
      console.log('📊 KẾT QUẢ:');
      console.log(`  ✅ Thành công: ${addedCount}/${order.items.length}`);
      console.log(`  ❌ Thất bại: ${failedCount}`);
      console.log('========================================\n');

      // Show result with toast notifications
      if (addedCount === order.items.length) {
        ToastService.success(`Đã thêm ${addedCount} sản phẩm vào giỏ hàng!`, 4000);
        // Navigate to cart after a short delay
        setTimeout(() => {
          console.log('🚀 Điều hướng đến giỏ hàng...');
          this.router.navigate(['/cart']);
        }, 1500);
      } else if (addedCount > 0) {
        const failedList = failedItems.length > 0 
          ? `\n\nSản phẩm không thể thêm:\n${failedItems.slice(0, 3).join('\n')}${failedItems.length > 3 ? `\n... và ${failedItems.length - 3} sản phẩm khác` : ''}`
          : '';
        ToastService.warning(`Đã thêm ${addedCount}/${order.items.length} sản phẩm vào giỏ hàng.${failedList}`, 5000);
        // Navigate to cart after a short delay
        setTimeout(() => {
          console.log('🚀 Điều hướng đến giỏ hàng...');
          this.router.navigate(['/cart']);
        }, 2000);
      } else {
        ToastService.error('Không thể thêm sản phẩm vào giỏ hàng. Một số sản phẩm có thể đã hết hàng hoặc không còn bán.', 5000);
        return;
      }

    } catch (error) {
      console.error('❌ Error in buyAgain:', error);
      ToastService.error('Có lỗi xảy ra khi thêm sản phẩm vào giỏ hàng', 4000);
    }
  }
}

