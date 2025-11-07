import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Subject, firstValueFrom } from 'rxjs';

import {
  AdminApiService,
  AdminCollectionListOptions,
  AdminCollectionMeta,
  AdminListResponse
} from '../../core/services/admin-api.service';
import { NotificationService } from '../../core/services/notification.service';
import { AdminCollectionsStore } from '../../core/services/admin-collections.store';
import { environment } from '../../../environments/environment';

interface AdminPagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type ProductListRow = {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  image?: string;
  categoryIds: string[];
};

type CategoryListRow = {
  id: string;
  name: string;
  slug: string;
  level: number;
  parentId?: string;
  parentName?: string;
  icon?: string;
  displayOrder?: number;
  isActive: boolean;
};

@Component({
  selector: 'app-collection-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  providers: [DatePipe],
  templateUrl: './collection-list.page.html',
  styleUrl: './collection-list.page.css'
})
export class CollectionListPage {
  @ViewChild('chatMessages') chatMessages?: ElementRef<HTMLDivElement>;

  // API URL for file downloads in template
  readonly apiUrl = environment.apiUrl;

  private readonly api = inject(AdminApiService);
  private readonly notifier = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly collectionsStore = inject(AdminCollectionsStore);
  private readonly datePipe = inject(DatePipe);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  private readonly searchSubject = new Subject<string>();

  readonly collectionKey = toSignal(
    this.route.paramMap.pipe(map(params => params.get('collectionKey') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('collectionKey') ?? '' }
  );

  readonly collectionMeta = computed<AdminCollectionMeta | undefined>(() =>
    this.collectionsStore.getByKey(this.collectionKey())
  );

  readonly loading = signal(false);
  readonly items = signal<any[]>([]);
  readonly pagination = signal<AdminPagination>({ total: 0, page: 1, limit: 20, pages: 0 });
  readonly sortBy = signal<string | null>(null);
  readonly sortDir = signal<'asc' | 'desc'>('desc');
  readonly searchTerm = signal('');
  readonly error = signal<string | null>(null);
  readonly pageInput = signal<number>(1);

  // Product-specific view helpers
  readonly isProductCollection = computed(() => this.collectionKey() === 'products');
  readonly isCategoryCollection = computed(() => this.collectionKey() === 'categories');
  readonly isPromotionCollection = computed(() => this.collectionKey() === 'promotions');
  readonly isOrderCollection = computed(() => this.collectionKey() === 'orders');
  readonly isPharmacistChatCollection = computed(() => this.collectionKey() === 'pharmacist_chats');

  // Messenger view for pharmacist chats
  readonly selectedChatId = signal<string | null>(null);
  readonly selectedChatData = signal<any | null>(null);
  readonly loadingChat = signal(false);
  readonly pharmacistReplyDraft = signal('');
  readonly sendingPharmacistReply = signal(false);
  readonly showEmojiPicker = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly uploadingFile = signal(false);
  private chatRefreshInterval: any;

  readonly messengerChats = computed(() => {
    if (!this.isPharmacistChatCollection()) {
      return [];
    }

    const resolveDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
      if (typeof value === 'object' && typeof value.$date !== 'undefined') {
        const parsed = new Date(value.$date);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatTime = (date: Date | null): string => {
      if (!date) return '';
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Vừa xong';
      if (minutes < 60) return `${minutes} phút`;
      if (hours < 24) return `${hours} giờ`;
      if (days < 7) return `${days} ngày`;
      return this.datePipe.transform(date, 'dd/MM/yyyy') || '';
    };

    return this.items().map((chat: any) => {
      const id = chat._id?.toString() || chat.id?.toString() || '';
      const customerName = chat.customerInfo?.name || chat.username || 'Khách hàng';
      const customerPhone = chat.customerInfo?.phone || chat.phone || '';
      const status = chat.status || 'pending';
      
      // Get last message
      const messages = Array.isArray(chat.messages) ? chat.messages : (Array.isArray(chat.history) ? chat.history : []);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const lastMessageContent = lastMessage?.content || lastMessage?.message || '';
      const lastMessageTime = lastMessage ? resolveDate(lastMessage.timestamp || lastMessage.createdAt || lastMessage.time) : null;
      const lastMessageSender = lastMessage?.sender === 'pharmacist' ? 'Dược sĩ' : (lastMessage?.sender === 'system' ? 'Hệ thống' : customerName);
      
      const updatedAt = resolveDate(chat.updatedAt || chat.updated_at);
      
      return {
        id,
        customerName,
        customerPhone,
        status,
        lastMessage: lastMessageContent ? `${lastMessageSender}: ${lastMessageContent}` : 'Chưa có tin nhắn',
        lastMessageTime: formatTime(lastMessageTime || updatedAt),
        updatedAt: updatedAt?.getTime() || 0,
        messageCount: messages.length
      };
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  });

  async selectChat(chatId: string): Promise<void> {
    if (this.selectedChatId() === chatId) return;
    
    // Stop previous polling
    this.stopChatPolling();
    
    this.selectedChatId.set(chatId);
    this.loadingChat.set(true);
    
    try {
      const response = await firstValueFrom(this.api.getDocument('pharmacist_chats', chatId));
      this.selectedChatData.set(response.data);
      this.scrollChatToBottom();
      
      // Start polling for new messages
      this.startChatPolling(chatId);
    } catch (error: any) {
      console.error('[CollectionList] Load chat error', error);
      this.notifier.showError('Không thể tải chi tiết chat');
    } finally {
      this.loadingChat.set(false);
    }
  }

  startChatPolling(chatId: string): void {
    // Stop any existing polling
    this.stopChatPolling();
    
    // Poll every 3 seconds for new messages
    this.chatRefreshInterval = setInterval(async () => {
      try {
        const response = await firstValueFrom(this.api.getDocument('pharmacist_chats', chatId));
        const currentChat = this.selectedChatData();
        
        if (currentChat && response.data) {
          const currentMessages = currentChat.messages || [];
          const chatData = response.data as any;
          const newMessages = chatData.messages || [];
          
          // Check if there are new messages (compare by length or last message ID)
          const hasNewMessages = newMessages.length !== currentMessages.length ||
            (newMessages.length > 0 && currentMessages.length > 0 &&
             newMessages[newMessages.length - 1]._id?.toString() !== currentMessages[currentMessages.length - 1]._id?.toString());
          
          if (hasNewMessages) {
            this.selectedChatData.set({
              ...response.data,
              messages: newMessages
            });
            this.scrollChatToBottom();
          }
        }
      } catch (error) {
        console.error('[CollectionList] Polling error', error);
      }
    }, 3000);
  }

  stopChatPolling(): void {
    if (this.chatRefreshInterval) {
      clearInterval(this.chatRefreshInterval);
      this.chatRefreshInterval = null;
    }
  }

  readonly selectedChatView = computed(() => {
    const chat = this.selectedChatData();
    if (!chat || !this.isPharmacistChatCollection()) {
      return null;
    }

    const resolveDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
      if (typeof value === 'object' && typeof value.$date !== 'undefined') {
        const parsed = new Date(value.$date);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (value: any) => {
      const resolved = resolveDate(value);
      return resolved ? (this.datePipe.transform(resolved, 'dd/MM/yyyy HH:mm') ?? '') : '';
    };

    const statusRaw = (chat.status || '').toLowerCase();
    let statusLabel = 'Đang xử lý';
    let statusClass = 'active';

    if (statusRaw.includes('pending')) {
      statusLabel = 'Đang chờ phản hồi';
      statusClass = 'pending';
    } else if (statusRaw.includes('active') || statusRaw.includes('busy') || statusRaw.includes('processing')) {
      statusLabel = 'Đang tư vấn';
      statusClass = 'active';
    } else if (statusRaw.includes('closed') || statusRaw.includes('done') || statusRaw.includes('resolved')) {
      statusLabel = 'Đã kết thúc';
      statusClass = 'done';
    }

    const messagesSource = Array.isArray(chat.messages) ? chat.messages : (Array.isArray(chat.history) ? chat.history : []);
    const messagesSorted = messagesSource
      .map((message: any, index: number) => {
        const sender: 'user' | 'pharmacist' | 'system' = (message.sender === 'pharmacist' || message.sender === 'system') ? message.sender : 'user';
        const resolved = resolveDate(message.timestamp || message.createdAt || message.time || message.sentAt || message.created_at);
        return {
          raw: message,
          id: message._id?.toString?.() || message.id || `msg-${index}`,
          sender,
          content: message.content || message.message || '',
          type: message.type || 'text',
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileType: message.fileType,
          timestamp: resolved ? (this.datePipe.transform(resolved, 'HH:mm dd/MM/yyyy') ?? '') : '',
          timeValue: resolved?.getTime() ?? index
        };
      })
      .sort((a: any, b: any) => a.timeValue - b.timeValue);

    const messages = messagesSorted.map((meta: any) => {
      const { raw: _raw, timeValue: _timeValue, ...rest } = meta;
      return rest;
    });

    return {
      id: chat._id?.toString?.() || chat.id || '',
      status: chat.status || 'pending',
      statusLabel,
      statusClass,
      customerName: chat.customerInfo?.name || chat.username || 'Khách hàng',
      customerPhone: chat.customerInfo?.phone || chat.phone || '',
      createdAt: formatDate(chat.createdAt),
      updatedAt: formatDate(chat.updatedAt),
      messages
    };
  });

  async sendPharmacistReply(): Promise<void> {
    const message = this.pharmacistReplyDraft().trim();
    const file = this.selectedFile();
    
    if (!message && !file) {
      this.notifier.showWarning('Vui lòng nhập nội dung hoặc chọn file');
      return;
    }
    if (this.sendingPharmacistReply()) {
      return;
    }

    const chatId = this.selectedChatId();
    if (!chatId) {
      this.notifier.showError('Không tìm thấy ID phiên tư vấn');
      return;
    }

    // Optimistic update: Add message immediately to local state
    const optimisticMessage: any = {
      _id: `temp-${Date.now()}`,
      chatId,
      sender: 'pharmacist',
      content: message || (file ? `Đã gửi file: ${file.name}` : ''),
      message: message || (file ? `Đã gửi file: ${file.name}` : ''),
      timestamp: new Date(),
      read: false,
      type: file ? 'file' : 'text'
    };
    
    if (file) {
      optimisticMessage.fileName = file.name;
      optimisticMessage.fileSize = file.size;
      optimisticMessage.fileType = file.type;
    }

    // Update local state immediately
    const currentChat = this.selectedChatData();
    if (currentChat) {
      const updatedChat = {
        ...currentChat,
        messages: [...(currentChat.messages || []), optimisticMessage],
        updatedAt: new Date()
      };
      this.selectedChatData.set(updatedChat);
      this.scrollChatToBottom();
    }

    this.sendingPharmacistReply.set(true);

    try {
      const type = file ? 'file' : 'text';
      const response = await firstValueFrom(this.api.respondPharmacistChat(chatId, message, file || undefined, type));
      
      // Replace optimistic message with server response
      if (response.success && response.data) {
        const serverMessage = response.data;
        const updatedChat = this.selectedChatData();
        if (updatedChat) {
          const messages = updatedChat.messages || [];
          const index = messages.findIndex((m: any) => m._id === optimisticMessage._id);
          if (index !== -1) {
            messages[index] = serverMessage;
          } else {
            messages.push(serverMessage);
          }
          this.selectedChatData.set({
            ...updatedChat,
            messages,
            updatedAt: new Date()
          });
        }
      }
      
      this.pharmacistReplyDraft.set('');
      this.selectedFile.set(null);
      this.showEmojiPicker.set(false);
      this.notifier.showSuccess('Đã gửi phản hồi tới khách hàng');
      this.scrollChatToBottom();
    } catch (error: any) {
      console.error('[PharmacistChat] send reply error', error);
      // Remove optimistic message on error
      const updatedChat = this.selectedChatData();
      if (updatedChat) {
        const messages = (updatedChat.messages || []).filter((m: any) => m._id !== optimisticMessage._id);
        this.selectedChatData.set({
          ...updatedChat,
          messages
        });
      }
      this.notifier.showError(error?.error?.error || 'Không thể gửi phản hồi');
    } finally {
      this.sendingPharmacistReply.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.notifier.showError('File không được vượt quá 5MB');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
    input.value = ''; // Reset input để có thể chọn lại file cùng tên
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.set(!this.showEmojiPicker());
  }

  insertEmoji(emoji: string): void {
    this.pharmacistReplyDraft.update(current => current + emoji);
    this.showEmojiPicker.set(false);
  }

  // Common emojis
  readonly commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌',
    '💪', '🦾', '🦿', '🤝', '🙏', '✍️', '💅', '🤳', '💃', '🕺'
  ];

  scrollChatToBottom(): void {
    setTimeout(() => {
      if (this.chatMessages?.nativeElement) {
        const el = this.chatMessages.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Voucher creation modal
  readonly showCreateVoucherModal = signal(false);
  readonly creatingVoucher = signal(false);
  voucherForm: FormGroup;

  // Enhanced UI features
  readonly showFilters = signal(false);
  readonly showImportModal = signal(false);
  readonly lowStockCount = computed(() => {
    if (!this.isProductCollection()) return 0;
    return this.productRows().filter(p => (p.stock ?? 0) <= 10 && (p.stock ?? 0) > 0).length;
  });
  
  readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.stockFilter() !== 'all') count++;
    if (this.minPrice() !== '') count++;
    if (this.maxPrice() !== '') count++;
    if (this.selectedCategory() !== '') count++;
    if (this.levelFilter() !== null) count++;
    if (this.activeFilter() !== 'all') count++;
    if (this.orderStatusFilter() !== 'all') count++;
    return count;
  });

  readonly productRows = computed<ProductListRow[]>(() => {
    if (!this.isProductCollection()) {
      return [] as ProductListRow[];
    }

    return (this.items() || []).map((doc: any) => {
      const id: string = doc?._id || doc?.id || doc?.sku || '';
      const name: string = doc?.name || doc?.title || '';
      const priceNum = Number(doc?.finalPrice);
      const price: number = !Number.isNaN(priceNum) && priceNum > 0
        ? priceNum
        : (Number(doc?.discount) > 0 && Number(doc?.discount) < 100)
          ? Math.max(Math.round((Number(doc?.price) * (100 - Number(doc?.discount))) / 100), 0)
          : Number(doc?.price) || 0;
      const stockRaw = typeof doc?.stock === 'number' ? doc?.stock : (Number.isFinite(Number(doc?.quantity)) ? Number(doc?.quantity) : null);
      const stock: number | null = stockRaw === null ? null : Number(stockRaw);
      const image: string | undefined = doc?.image || doc?.thumbnail || (Array.isArray(doc?.gallery) ? doc.gallery[0] : undefined) || (Array.isArray(doc?.images) ? doc.images[0] : undefined);

      // Normalize category ids from various schemas
      const catIds = new Set<string>();
      const pushId = (val: any) => {
        if (val === null || val === undefined) return;
        if (typeof val === 'string') {
          if (val.trim()) catIds.add(val.trim());
          return;
        }
        if (typeof val === 'object') {
          const maybe = (val._id || val.id || val.value || '').toString();
          if (maybe) catIds.add(maybe);
          return;
        }
        const maybe = String(val);
        if (maybe) catIds.add(maybe);
      };

      pushId(doc?.categoryId);
      pushId(doc?.category_id);
      pushId(doc?.category?.id);
      pushId(doc?.category?._id);
      if (Array.isArray(doc?.categoryIds)) doc.categoryIds.forEach(pushId);
      if (Array.isArray(doc?.categories)) doc.categories.forEach(pushId);

      return { id, name, price, stock, image, categoryIds: Array.from(catIds) };
    });
  });

  readonly categoryRows = computed<CategoryListRow[]>(() => {
    if (!this.isCategoryCollection()) {
      return [] as CategoryListRow[];
    }

    const allItems = this.items() || [];
    
    // First pass: collect all categories with their basic info
    const categories = allItems.map((doc: any) => {
      const id: string = doc?._id || doc?.id || '';
      const name: string = doc?.name || '';
      const slug: string = doc?.slug || '';
      const parentId: string | undefined = doc?.parentId || doc?.parent_id || undefined;
      const parentName: string | undefined = doc?.parentName || doc?.parent_name || undefined;
      const icon: string | undefined = doc?.icon || undefined;
      const displayOrder: number | undefined = typeof doc?.display_order === 'number' ? doc.display_order : (typeof doc?.displayOrder === 'number' ? doc.displayOrder : undefined);
      const isActive: boolean = doc?.is_active === true || doc?.isActive === true;

      return { id, name, slug, parentId, parentName, icon, displayOrder, isActive };
    });

    // Build maps
    const childrenMap = new Map<string, string[]>();
    const categoryMap = new Map<string, any>();
    
    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat);
      if (!childrenMap.has(cat.id)) {
        childrenMap.set(cat.id, []);
      }
      if (cat.parentId) {
        if (!childrenMap.has(cat.parentId)) {
          childrenMap.set(cat.parentId, []);
        }
        childrenMap.get(cat.parentId)!.push(cat.id);
      }
    });

    // Calculate level based on correct logic
    // Cấp 1: Không có parentId
    // Cấp 2: Có parentId và parent đó là cấp 1
    // Cấp 3: Có parentId và parent đó là cấp 2
    const categoriesWithLevel = categories.map((cat) => {
      let level: number;
      
      if (!cat.parentId) {
        // Cấp 1: Không có parent ID
        level = 1;
      } else {
        // Tìm parent
        const parent = categoryMap.get(cat.parentId);
        if (!parent || !parent.parentId) {
          // Parent là cấp 1 (hoặc không tìm thấy parent) => đây là cấp 2
          level = 2;
        } else {
          // Parent có parentId => parent là cấp 2 => đây là cấp 3
          level = 3;
        }
      }

      return { ...cat, level };
    });

    // Sort: level asc, displayOrder asc, name asc
    return categoriesWithLevel.sort((a, b) => {
      // Sort by level first
      if (a.level !== b.level) return a.level - b.level;
      
      // Then by displayOrder (nulls last)
      const orderA = a.displayOrder ?? 999999;
      const orderB = b.displayOrder ?? 999999;
      if (orderA !== orderB) return orderA - orderB;
      
      // Finally by name
      return a.name.localeCompare(b.name, 'vi');
    });
  });

  // Filters for product view
  readonly stockFilter = signal<'all' | 'in' | 'out'>('all');
  readonly minPrice = signal<string>('');
  readonly maxPrice = signal<string>('');

  // Category-specific filters
  readonly levelFilter = signal<number | null>(null);
  readonly activeFilter = signal<'all' | 'active' | 'inactive'>('all');

  // Order-specific filters and stats
  readonly orderStatusFilter = signal<string>('all');
  readonly orderStatsData = signal<{
    total: number;
    pending: number;
    processing: number;
    shipping: number;
    delivered: number;
    cancelled: number;
    returned: number;
  } | null>(null);
  
  readonly orderStats = computed(() => {
    if (!this.isOrderCollection()) {
      return null;
    }
    // Use pre-loaded stats from API instead of counting current page items
    return this.orderStatsData() || {
      total: 0,
      pending: 0,
      processing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0
    };
  });

  readonly filteredProductRows = computed(() => {
    let rows = this.productRows();

    const stock = this.stockFilter();
    if (stock === 'in') {
      rows = rows.filter(r => (r.stock ?? 0) > 0);
    } else if (stock === 'out') {
      rows = rows.filter(r => (r.stock ?? 0) <= 0 || r.stock === null);
    }

    const minStr = this.minPrice();
    const maxStr = this.maxPrice();
    const min = Number(minStr);
    const max = Number(maxStr);
    if (minStr !== '' && !Number.isNaN(min)) {
      rows = rows.filter(r => r.price >= min);
    }
    if (maxStr !== '' && !Number.isNaN(max)) {
      rows = rows.filter(r => r.price <= max);
    }

    const target = this.selectedCategory();
    if (target) {
      const ids = this.getDescendantSet(target);
      rows = rows.filter(r => {
        if (!r.categoryIds || r.categoryIds.length === 0) return false;
        return r.categoryIds.some(id => ids.has(id));
      });
    }

    return rows;
  });

  // Filtered categories
  readonly filteredCategories = computed(() => {
    let rows = this.categoryRows();

    const level = this.levelFilter();
    if (level !== null) {
      rows = rows.filter((r: CategoryListRow) => r.level === level);
    }

    const active = this.activeFilter();
    if (active === 'active') {
      rows = rows.filter((r: CategoryListRow) => r.isActive === true);
    } else if (active === 'inactive') {
      rows = rows.filter((r: CategoryListRow) => r.isActive === false);
    }

    return rows;
  });

  // Filtered orders
  readonly filteredOrders = computed(() => {
    if (!this.isOrderCollection()) {
      return [];
    }
    
    let orders = this.items();
    const statusFilter = this.orderStatusFilter();
    
    if (statusFilter && statusFilter !== 'all') {
      orders = orders.filter((order: any) => {
        const status = (order.status || '').toLowerCase();
        switch (statusFilter) {
          case 'pending':
            return status.includes('pending') || status.includes('chờ');
          case 'processing':
            return status.includes('processing') || status.includes('xử lý') || status.includes('confirmed');
          case 'shipping':
            return status.includes('shipping') || status.includes('đang giao') || status.includes('delivering');
          case 'delivered':
            return status.includes('delivered') || status.includes('đã giao') || status.includes('completed') || status.includes('hoàn thành');
          case 'cancelled':
            return status.includes('cancelled') || status.includes('hủy');
          case 'returned':
            return status.includes('returned') || status.includes('trả');
          default:
            return true;
        }
      });
    }
    
    return orders;
  });

  // Selection state
  readonly selected = signal<Set<string>>(new Set());
  readonly allSelected = computed(() => {
    const rows = this.filteredProductRows();
    const set = this.selected();
    return rows.length > 0 && rows.every(r => set.has(r.id));
  });

  // Translate order status to Vietnamese
  translateOrderStatus(status: string): string {
    if (!status) return '—';
    
    const statusMap: { [key: string]: string } = {
      'pending': 'Chờ xử lý',
      'confirmed': 'Đã xác nhận',
      'processing': 'Đang xử lý',
      'shipping': 'Đang giao',
      'delivered': 'Đã giao',
      'cancelled': 'Đã hủy',
      'returned': 'Đã trả',
      'completed': 'Hoàn thành'
    };
    
    const lowerStatus = status.toLowerCase();
    return statusMap[lowerStatus] || status;
  }

  // Category options and single-select filter
  readonly categoriesFlat = signal<Array<{ id: string; name: string; parentId: string | null; level?: number }>>([]);
  readonly selectedCategory = signal<string>('');

  readonly columns = computed(() => {
    const rows = this.items();
    if (!rows.length) {
      return ['_id'];
    }

    const basePriority = ['orderNumber', '_id', 'name', 'title', 'email', 'phone', 'status', 'slug'];
    const discovered = new Set<string>();

    rows.slice(0, 5).forEach(row => {
      Object.keys(row || {}).forEach(key => {
        if (typeof row[key] === 'object' && row[key] !== null) {
          return;
        }
        discovered.add(key);
      });
    });

    const prioritized = basePriority.filter(key => discovered.has(key));
    const others = Array.from(discovered).filter(key => !prioritized.includes(key));
    const combined = [...prioritized, ...others];
    return combined.slice(0, 7);
  });

  readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);

  constructor() {
    // Cleanup polling on destroy
    this.destroyRef.onDestroy(() => {
      this.stopChatPolling();
    });
    // Initialize voucher form
    this.voucherForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]+$/)]],
      title: ['', [Validators.required]],
      description: [''],
      discountPercent: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      discount: [null],
      minOrderAmount: [0, [Validators.min(0)]],
      maxUsage: [null, [Validators.min(1)]],
      usedCount: [0],
      isActive: [true],
      startsAt: [''],
      expiresAt: ['']
    });

    effect(() => {
      void this.initialize();
    });

    this.searchSubject
      .pipe(distinctUntilChanged(), debounceTime(320), takeUntilDestroyed(this.destroyRef))
      .subscribe(term => {
        this.searchTerm.set(term);
        void this.loadItems({ page: 1 });
      });

    // Keep page input synced with current page
    effect(() => {
      const current = this.pagination().page;
      this.pageInput.set(current);
    });

    // Auto-select first chat for pharmacist chats
    effect(() => {
      if (this.isPharmacistChatCollection() && this.messengerChats().length > 0 && !this.selectedChatId()) {
        const firstChat = this.messengerChats()[0];
        if (firstChat) {
          void this.selectChat(firstChat.id);
        }
      }
    });

    // Auto-scroll when messages change
    effect(() => {
      const chatView = this.selectedChatView();
      if (chatView && this.isPharmacistChatCollection()) {
        this.scrollChatToBottom();
      }
    });
  }

  get collectionLabel(): string {
    return this.collectionMeta()?.label || this.collectionKey();
  }

  formatCell(value: any): string {
    if (value === null || value === undefined) {
      return '—';
    }

    if (typeof value === 'string') {
      return value.length > 120 ? `${value.slice(0, 117)}…` : value;
    }

    if (typeof value === 'number') {
      return new Intl.NumberFormat('vi-VN').format(value);
    }

    if (typeof value === 'boolean') {
      return value ? '✔' : '✘';
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      const preview = value
        .slice(0, 3)
        .map(item => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
        .join(', ');
      return value.length > 3 ? `[${preview}, …]` : `[${preview}]`;
    }

    if (value instanceof Date) {
      return this.datePipe.transform(value, 'dd/MM/yyyy HH:mm') ?? value.toISOString();
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return '{}';
      }
      const slice = keys.slice(0, 3).map(key => `${key}: ${JSON.stringify(value[key])}`).join(', ');
      return keys.length > 3 ? `{ ${slice}, … }` : `{ ${slice} }`;
    }

    return String(value);
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  async changePage(page: number): Promise<void> {
    await this.loadItems({ page });
  }

  onPageInput(value: string | number): void {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      this.pageInput.set(num);
    }
  }

  async goToPage(): Promise<void> {
    const totalPages = this.pagination().pages || 1;
    let target = Math.floor(this.pageInput());
    if (!Number.isFinite(target)) {
      return;
    }
    target = Math.max(1, Math.min(totalPages, target));
    await this.loadItems({ page: target });
  }

  toggleSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortDir.set('asc');
    }

    void this.loadItems();
  }

  goToEdit(id: string): void {
    this.router.navigate(['../', this.collectionKey(), id], { relativeTo: this.route, queryParams: { edit: 1 } });
  }

  goToDetail(id: string): void {
    this.router.navigate(['../', this.collectionKey(), id], { relativeTo: this.route });
  }

  toggleSelectAll(checked: boolean): void {
    const rows = this.filteredProductRows();
    const set = new Set(this.selected());
    if (checked) {
      rows.forEach(r => set.add(r.id));
    } else {
      rows.forEach(r => set.delete(r.id));
    }
    this.selected.set(set);
  }

  toggleSelectOne(id: string, checked: boolean): void {
    const set = new Set(this.selected());
    if (checked) {
      set.add(id);
    } else {
      set.delete(id);
    }
    this.selected.set(set);
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  clearFilters(): void {
    this.stockFilter.set('all');
    this.minPrice.set('');
    this.maxPrice.set('');
    this.selectedCategory.set('');
    this.levelFilter.set(null);
    this.activeFilter.set('all');
  }

  onLevelFilterChange(value: string): void {
    if (value === '' || value === null) {
      this.levelFilter.set(null);
    } else {
      const num = Number(value);
      this.levelFilter.set(Number.isNaN(num) ? null : num);
    }
  }

  setOrderStatusFilter(status: string): void {
    this.orderStatusFilter.set(status);
    // Scroll to table
    setTimeout(() => {
      const table = document.querySelector('.order-table');
      if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  }

  async deleteRow(id: string): Promise<void> {
    if (!this.collectionMeta()?.allowDelete) {
      this.notifier.showWarning('Collection này không cho phép xóa');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      return;
    }

    try {
      await firstValueFrom(this.api.deleteDocument(this.collectionKey(), id));
      this.notifier.showSuccess('Đã xóa sản phẩm');
      await this.loadItems();
    } catch (error: any) {
      console.error('[CollectionList] delete error', error);
      this.notifier.showError(error?.message || 'Không thể xóa sản phẩm');
    }
  }

  async deleteSelected(): Promise<void> {
    if (!this.collectionMeta()?.allowDelete || this.selected().size === 0) {
      return;
    }
    if (!confirm(`Xóa ${this.selected().size} sản phẩm đã chọn?`)) {
      return;
    }

    try {
      for (const id of Array.from(this.selected())) {
        await firstValueFrom(this.api.deleteDocument(this.collectionKey(), id));
      }
      this.notifier.showSuccess('Đã xóa các sản phẩm đã chọn');
      this.clearSelection();
      await this.loadItems();
    } catch (error: any) {
      console.error('[CollectionList] bulk delete error', error);
      this.notifier.showError(error?.message || 'Không thể xóa một số sản phẩm');
    }
  }

  goToCreate(): void {
    if (this.isPromotionCollection()) {
      this.openCreateVoucherModal();
    } else {
      this.router.navigate(['../', this.collectionKey(), 'new'], { relativeTo: this.route });
    }
  }

  // Voucher creation methods
  openCreateVoucherModal(): void {
    this.voucherForm.reset({
      code: '',
      title: '',
      description: '',
      discountPercent: 0,
      discount: null,
      minOrderAmount: 0,
      maxUsage: null,
      usedCount: 0,
      isActive: true,
      startsAt: '',
      expiresAt: ''
    });
    this.showCreateVoucherModal.set(true);
  }

  closeCreateVoucherModal(): void {
    this.showCreateVoucherModal.set(false);
    this.voucherForm.reset();
  }

  async submitVoucherForm(): Promise<void> {
    if (this.voucherForm.invalid) {
      this.voucherForm.markAllAsTouched();
      this.notifier.showError('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    this.creatingVoucher.set(true);

    try {
      const formValue = this.voucherForm.value;
      const voucherData: any = {
        code: formValue.code.trim().toUpperCase(),
        title: formValue.title.trim(),
        description: formValue.description?.trim() || '',
        discountPercent: Number(formValue.discountPercent) || 0,
        discount: formValue.discount ? Number(formValue.discount) : null,
        minOrderAmount: Number(formValue.minOrderAmount) || 0,
        maxUsage: formValue.maxUsage ? Number(formValue.maxUsage) : null,
        usedCount: 0,
        isActive: formValue.isActive !== false
      };

      // Handle dates - only add if provided
      if (formValue.startsAt) {
        voucherData.startsAt = new Date(formValue.startsAt);
      }
      if (formValue.expiresAt) {
        voucherData.expiresAt = new Date(formValue.expiresAt);
      }

      console.log('[CreateVoucher] Sending data:', voucherData);

      const response = await firstValueFrom(this.api.createDocument('promotions', voucherData));
      
      console.log('[CreateVoucher] Response:', response);

      if (response && response.success) {
        this.notifier.showSuccess(`Mã giảm giá "${voucherData.code}" đã được tạo thành công!`);
        this.closeCreateVoucherModal();
        
        // Reload items to show the new voucher
        await this.loadItems();
      } else {
        throw new Error('Không thể tạo mã giảm giá');
      }
    } catch (error: any) {
      console.error('[CreateVoucher] Error:', error);
      const errorMessage = error?.error?.message || error?.message || 'Không thể tạo mã giảm giá. Vui lòng thử lại.';
      this.notifier.showError(errorMessage);
    } finally {
      this.creatingVoucher.set(false);
    }
  }

  trackById = (_: number, row: any) => row?._id || row?.orderNumber || row?.id || _;

  private async initialize(): Promise<void> {
    const key = this.collectionKey();
    if (!key) {
      return;
    }

    await this.collectionsStore.ensureLoaded();
    if (!this.collectionMeta()) {
      this.error.set('Không tìm thấy cấu hình tài nguyên.');
      return;
    }

    await this.loadItems({ page: 1 });
  }

  private async loadItems(options: Partial<AdminCollectionListOptions> = {}): Promise<void> {
    const key = this.collectionKey();
    if (!key) {
      return;
    }

    const meta = this.collectionMeta();
    if (!meta) {
      return;
    }

    const params: AdminCollectionListOptions = {
      page: options.page ?? this.pagination().page,
      limit: options.limit ?? this.pagination().limit,
      search: this.searchTerm(),
      sortBy: this.sortBy() || undefined,
      sortDir: this.sortDir(),
      ...options
    };

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom<AdminListResponse<any>>(this.api.getCollectionItems<any>(key, params));
      this.items.set(response.data || []);
      this.pagination.set(response.pagination || { total: 0, page: 1, limit: params.limit ?? 20, pages: 0 });
      
      // Load order stats if this is orders collection
      if (this.isOrderCollection()) {
        await this.loadOrderStats();
      }
    } catch (error: any) {
      console.error('[CollectionListPage] loadItems error', error);
      const message = error?.message || 'Không thể tải dữ liệu';
      this.error.set(message);
      this.notifier.showError(message);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadOrderStats(): Promise<void> {
    try {
      // Get all orders without pagination to calculate real stats
      const response = await firstValueFrom<AdminListResponse<any>>(
        this.api.getCollectionItems<any>('orders', { page: 1, limit: 10000 })
      );
      
      const allOrders = response.data || [];
      const stats = {
        total: allOrders.length,
        pending: 0,
        processing: 0,
        shipping: 0,
        delivered: 0,
        cancelled: 0,
        returned: 0
      };
      
      allOrders.forEach((order: any) => {
        const status = (order.status || '').toLowerCase();
        if (status.includes('pending') || status.includes('chờ')) {
          stats.pending++;
        } else if (status.includes('processing') || status.includes('xử lý') || status.includes('confirmed')) {
          stats.processing++;
        } else if (status.includes('shipping') || status.includes('đang giao') || status.includes('delivering')) {
          stats.shipping++;
        } else if (status.includes('delivered') || status.includes('đã giao') || status.includes('completed') || status.includes('hoàn thành')) {
          stats.delivered++;
        } else if (status.includes('cancelled') || status.includes('hủy')) {
          stats.cancelled++;
        } else if (status.includes('returned') || status.includes('trả')) {
          stats.returned++;
        }
      });
      
      this.orderStatsData.set(stats);
    } catch (error) {
      console.error('[CollectionListPage] loadOrderStats error', error);
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const res = await firstValueFrom<AdminListResponse<any>>(this.api.getCollectionItems<any>('categories', {
        page: 1,
        limit: 500,
        sortBy: 'name',
        sortDir: 'asc'
      }));

      const flat = (res.data || []).map((c: any) => {
        const id = (c?._id || c?.id || c?.slug || c?.code || c?.name || '').toString();
        const name = (c?.name || c?.title || c?.slug || id).toString();
        const parentId = (c?.parentId || c?.parent_id || null);
        const level = c?.level;
        return { id, name, parentId: parentId ? String(parentId) : null, level };
      });
      this.categoriesFlat.set(flat);
    } catch {
      // Fallback: derive from current items
      const map = new Map<string, string>();
      (this.items() || []).forEach((doc: any) => {
        const id = (doc?.category?._id || doc?.categoryId || doc?.category?.slug || '').toString();
        const name = (doc?.category?.name || doc?.categoryName || id).toString();
        if (id) {
          map.set(id, name);
        }
      });
      this.categoriesFlat.set(Array.from(map.entries()).map(([id, name]) => ({ id, name, parentId: null })));
    }
  }

  private getDescendantSet(rootId: string): Set<string> {
    const flat = this.categoriesFlat();
    const childrenMap = new Map<string, string[]>();
    flat.forEach(c => {
      const p = c.parentId ? String(c.parentId) : '';
      if (!childrenMap.has(p)) childrenMap.set(p, []);
      if (c.parentId) childrenMap.get(p)!.push(c.id);
    });

    const set = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      set.add(id);
      const key = id;
      const children = childrenMap.get(key) || [];
      for (const child of children) stack.push(child);
    }
    return set;
  }

  onIconError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const nextElement = img.nextElementSibling as HTMLElement;
      if (nextElement && nextElement.classList.contains('no-icon')) {
        nextElement.style.display = 'flex';
      }
    }
  }

  // Enhanced UI methods
  toggleFilters(): void {
    this.showFilters.update(v => !v);
  }

  clearSearch(): void {
    this.searchSubject.next('');
  }

  openImportModal(): void {
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  async exportData(): Promise<void> {
    try {
      this.notifier.showInfo('Đang chuẩn bị file xuất...');
      
      // Get all items without pagination
      const allItems = await firstValueFrom(
        this.api.getCollectionItems(this.collectionKey(), {
          page: 1,
          limit: 10000,
          search: this.searchTerm()
        })
      );

      // Convert to CSV
      const items = allItems.data || [];
      if (items.length === 0) {
        this.notifier.showWarning('Không có dữ liệu để xuất');
        return;
      }

      // Get all keys from first item
      const firstItem = items[0] as Record<string, any>;
      const headers = Object.keys(firstItem).filter(key => 
        !key.startsWith('_') && typeof firstItem[key] !== 'object'
      );

      // Create CSV content
      let csv = headers.join(',') + '\n';
      items.forEach((item: any) => {
        const row = headers.map(header => {
          const value = item[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csv += row.join(',') + '\n';
      });

      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${this.collectionKey()}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notifier.showSuccess(`Đã xuất ${items.length} bản ghi`);
    } catch (error: any) {
      console.error('[Export] Error:', error);
      this.notifier.showError('Không thể xuất dữ liệu');
    }
  }

  async importData(file: File): Promise<void> {
    try {
      this.notifier.showInfo('Đang xử lý file...');
      
      // Read file content
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        this.notifier.showError('File không có dữ liệu');
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim());
      const items: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = values[index]?.trim() || '';
        });
        items.push(item);
      }

      // Import items
      let successCount = 0;
      let errorCount = 0;

      for (const item of items) {
        try {
          await firstValueFrom(this.api.createDocument(this.collectionKey(), item));
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      this.notifier.showSuccess(`Đã nhập ${successCount} bản ghi (${errorCount} lỗi)`);
      this.closeImportModal();
      await this.loadItems();
    } catch (error: any) {
      console.error('[Import] Error:', error);
      this.notifier.showError('Không thể nhập dữ liệu');
    }
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      void this.importData(file);
      input.value = ''; // Reset input
    }
  }

  // Get category children count
  getCategoryChildrenCount(categoryId: string): number {
    if (!this.isCategoryCollection()) return 0;
    return this.categoryRows().filter(c => c.parentId === categoryId).length;
  }
}


