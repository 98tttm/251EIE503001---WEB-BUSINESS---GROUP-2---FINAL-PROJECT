import { Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  discount?: number;
  image: string;
  unit?: string;
  quantity: number;
  stock: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  cartItems = signal<CartItem[]>([]);
  private apiUrl = 'http://localhost:3000/api';
  
  constructor(private authService: AuthService) {
    this.loadCart();
  }

  // Load cart from database or localStorage
  async loadCart() {
    const user = this.authService.currentUser();
    
    console.log('🔄 Loading cart...', user?.userId ? 'from MongoDB' : 'from localStorage');
    
    if (user?.userId) {
      // Load from database if user is logged in
      try {
        const response = await fetch(`${this.apiUrl}/cart/${user.userId}`);
        const data = await response.json();
        
        if (data.success && data.data.items) {
          console.log('✅ Loaded from MongoDB:', data.data.items.length, 'items');
          this.cartItems.set([...data.data.items]); // Force new array reference
          // Sync to localStorage as backup
          localStorage.setItem('cart', JSON.stringify(data.data.items));
        } else {
          console.log('⚠️ MongoDB cart empty or error, loading from localStorage');
          this.loadFromLocalStorage();
        }
      } catch (error) {
        console.error('❌ Error loading cart from database:', error);
        // Fallback to localStorage
        this.loadFromLocalStorage();
      }
    } else {
      // Load from localStorage if not logged in
      console.log('⚠️ User not logged in, loading from localStorage');
      this.loadFromLocalStorage();
    }
    
    console.log('📊 Cart loaded, total items:', this.cartItems().length);
  }

  // Load from localStorage (fallback)
  private loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('cart');
      if (saved) {
        const items = JSON.parse(saved);
        console.log('📦 Loaded from localStorage:', items.length, 'items');
        this.cartItems.set([...items]); // Force new array reference
      } else {
        console.log('📦 LocalStorage cart is empty');
        this.cartItems.set([]);
      }
    } catch (error) {
      console.error('❌ Error loading cart from localStorage:', error);
      this.cartItems.set([]);
    }
  }

  // (Deprecated - no longer needed, each method saves directly)
  private async saveCart() {
    const items = this.cartItems();
    localStorage.setItem('cart', JSON.stringify(items));
  }

  // Add item to cart
  async addToCart(product: Omit<CartItem, 'quantity'>) {
    const user = this.authService.currentUser();
    
    console.log('🛒 addToCart called');
    console.log('📦 Product ID:', product._id);
    console.log('📦 Product Name:', product.name);
    console.log('📋 Current cart items:', this.cartItems().map(i => ({ id: i._id, name: i.name, qty: i.quantity })));
    
    // If logged in, use MongoDB as source of truth
    if (user?.userId) {
      try {
        // Always send to backend first
        const response = await fetch(`${this.apiUrl}/cart/${user.userId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product._id,
            name: product.name,
            price: product.price,
            discount: product.discount,
            image: product.image,
            unit: product.unit,
            quantity: 1
          })
        });
        
        const data = await response.json();
        console.log('✅ Backend response:', data);
        
        if (!data.success) {
          console.error('❌ Backend error:', data.error);
          return { success: false, message: data.error || 'Lỗi khi thêm vào giỏ hàng' };
        }
        
        // Reload cart from MongoDB to sync
        await this.loadCart();
        
        // Check if it was an update or new item
        const updatedItem = data.data.items.find((i: any) => i._id === product._id);
        if (updatedItem && updatedItem.quantity > 1) {
          return { success: true, message: 'Đã tăng số lượng sản phẩm' };
        } else {
          return { success: true, message: 'Đã thêm vào giỏ hàng' };
        }
        
      } catch (error) {
        console.error('❌ Error adding to cart:', error);
        return { success: false, message: 'Lỗi kết nối server' };
      }
    } else {
      // Fallback to localStorage only if not logged in
      console.log('⚠️ User not logged in, using localStorage');
      const items = this.cartItems();
      const existingItem = items.find(item => item._id === product._id);
      
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          existingItem.quantity++;
          this.cartItems.set([...items]);
          localStorage.setItem('cart', JSON.stringify(this.cartItems()));
          return { success: true, message: 'Đã tăng số lượng sản phẩm' };
        } else {
          return { success: false, message: 'Sản phẩm đã đạt số lượng tối đa trong kho' };
        }
      } else {
        const newItem = { ...product, quantity: 1 };
        this.cartItems.set([...items, newItem]);
        localStorage.setItem('cart', JSON.stringify(this.cartItems()));
        return { success: true, message: 'Đã thêm vào giỏ hàng' };
      }
    }
  }

  // Remove item from cart
  async removeFromCart(itemId: string) {
    const user = this.authService.currentUser();
    
    console.log('🗑️ Removing item:', itemId);
    
    // If logged in, remove from MongoDB first
    if (user?.userId) {
      try {
        const response = await fetch(`${this.apiUrl}/cart/${user.userId}/items/${itemId}`, {
          method: 'DELETE'
        });
        
        const data = await response.json();
        console.log('✅ Remove response:', data);
        
        if (!data.success) {
          console.error('❌ Remove error:', data.error);
        }
        
        // Reload cart from MongoDB to sync
        await this.loadCart();
        
      } catch (error) {
        console.error('❌ Error removing from cart in database:', error);
      }
    } else {
      // Fallback to localStorage only if not logged in
      const items = this.cartItems();
      this.cartItems.set(items.filter(item => item._id !== itemId));
      localStorage.setItem('cart', JSON.stringify(this.cartItems()));
    }
  }

  // Update item quantity
  async updateQuantity(itemId: string, quantity: number) {
    const user = this.authService.currentUser();
    
    console.log('🔄 Updating quantity:', itemId, 'to', quantity);
    
    // If logged in, update MongoDB first
    if (user?.userId) {
      try {
        const response = await fetch(`${this.apiUrl}/cart/${user.userId}/items/${itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity })
        });
        
        const data = await response.json();
        console.log('✅ Update quantity response:', data);
        
        if (!data.success) {
          return { success: false, message: data.error || 'Lỗi cập nhật số lượng' };
        }
        
        // Reload cart from MongoDB to sync
        await this.loadCart();
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error updating quantity in database:', error);
        return { success: false, message: 'Lỗi kết nối server' };
      }
    } else {
      // Fallback to localStorage only if not logged in
      const items = this.cartItems();
      const item = items.find(i => i._id === itemId);
      
      if (item) {
        if (quantity > item.stock) {
          return { success: false, message: 'Số lượng vượt quá tồn kho' };
        }
        
        item.quantity = quantity;
        this.cartItems.set([...items]);
        localStorage.setItem('cart', JSON.stringify(this.cartItems()));
        return { success: true };
      }
      
      return { success: false, message: 'Không tìm thấy sản phẩm' };
    }
  }

  // Clear cart
  async clearCart() {
    this.cartItems.set([]);
    
    // Clear localStorage
    localStorage.setItem('cart', JSON.stringify([]));
    
    // Clear in database if logged in
    const user = this.authService.currentUser();
    if (user?.userId) {
      try {
        await fetch(`${this.apiUrl}/cart/${user.userId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error clearing cart in database:', error);
      }
    }
  }

  // Get total items
  get totalItems(): number {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  // Get total price
  get totalPrice(): number {
    return this.cartItems().reduce((sum, item) => {
      const price = item.discount ? item.price : item.price;
      return sum + (price * item.quantity);
    }, 0);
  }

  // Get total discount
  get totalDiscount(): number {
    return this.cartItems().reduce((sum, item) => {
      const discount = item.discount || 0;
      return sum + (discount * item.quantity);
    }, 0);
  }

  // Get original total
  get originalTotal(): number {
    return this.cartItems().reduce((sum, item) => {
      const price = item.discount ? item.price + item.discount : item.price;
      return sum + (price * item.quantity);
    }, 0);
  }
}
