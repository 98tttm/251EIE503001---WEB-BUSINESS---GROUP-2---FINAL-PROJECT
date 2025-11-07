import { CommonModule, DatePipe } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { AdminApiService, AdminCollectionMeta } from '../../core/services/admin-api.service';
import { AdminCollectionsStore } from '../../core/services/admin-collections.store';
import { NotificationService } from '../../core/services/notification.service';

interface SpecListItem {
  label: string;
  value: string | number | null;
  field?: string;
  readonly?: boolean;
  mono?: boolean;
}

interface ProductViewData {
  name?: string;
  brand?: string;
  sku?: string;
  slug?: string;
  price: number;
  finalPrice: number;
  discount: number;
  unit?: string;
  stock?: number;
  status: string;
  statusClass: 'in-stock' | 'out-of-stock' | 'pending';
  image?: string;
  gallery: string[];
  description?: string;
  usage?: string;
  ingredients?: string;
  warnings?: string;
  tags: string[];
  specList: SpecListItem[];
  country?: string;
}

interface CategoryViewData {
  id: string;
  name: string;
  slug: string;
  fullPath?: string;
  level: number;
  displayOrder?: number;
  parentId?: string;
  parentName?: string;
  icon?: string;
  isActive: boolean;
  description?: string;
  specList: SpecListItem[];
}

interface VoucherViewData {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountPercent: number;
  discount?: number;
  minOrderAmount: number;
  maxUsage?: number;
  usedCount: number;
  isActive: boolean;
  startsAt?: Date | string;
  expiresAt?: Date | string;
  status: 'active' | 'expired' | 'upcoming' | 'inactive';
  statusClass: 'active' | 'expired' | 'upcoming' | 'inactive';
  startsAtLabel: string;
  expiresAtLabel: string;
  usageLabel: string;
  usagePercent: number | null;
  validityLabel: string;
  statusLabel: string;
  specList: SpecListItem[];
  timeline: Array<{ label: string; value: string; icon: string }>;
}

type InlineEditableField =
  | 'description'
  | 'usage'
  | 'ingredients'
  | 'warnings'
  | 'shortDescription'
  | 'content'
  | 'summary'
  | 'symptoms'
  | 'causes'
  | 'treatment'
  | 'prevention'
  | 'notes'
  | 'adminNotes';

type StatusBadge = 'published' | 'draft' | 'scheduled' | 'hidden' | 'pending' | 'active' | 'inactive';

interface BlogViewData {
  id: string;
  title: string;
  slug: string;
  articleId?: string;
  url?: string;
  originalUrl?: string;
  headline?: string;
  shortDescription?: string;
  content?: string;
  coverImage?: string;
  authorName?: string;
  authorTitle?: string;
  authorAvatar?: string;
  statusLabel: string;
  statusClass: StatusBadge;
  publishedAt?: Date | string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
  fetchedAt?: Date | string;
  categories: string[];
  tags: string[];
  specList: SpecListItem[];
  timeline: Array<{ label: string; value: string; icon: string }>;
}

interface DiseaseViewData {
  id: string;
  code?: string;
  name: string;
  slug: string;
  summary?: string;
  symptoms?: string;
  causes?: string;
  treatment?: string;
  prevention?: string;
  notes?: string;
  headline?: string;
  coverImage?: string;
  url?: string;
  originalUrl?: string;
  categories: string[];
  alternateNames: string[];
  statusLabel: string;
  statusClass: StatusBadge;
  updatedAt?: Date | string;
  createdAt?: Date | string;
  specList: SpecListItem[];
  timeline: Array<{ label: string; value: string; icon: string }>;
}

interface UserViewData {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  roles: string[];
  statusLabel: string;
  statusClass: StatusBadge;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastLogin?: Date | string;
  addressLines: string[];
  gender?: string;
  birthday?: string;
  notes?: string;
  specList: SpecListItem[];
  securityInfo: Array<{ label: string; value: string | number | null }>;
  timeline: Array<{ label: string; value: string; icon: string }>;
}

interface OrderViewData {
  id: string;
  orderNumber: string;
  status: string;
  statusClass: string;
  statusLabel: string;
  createdAt: string;
  updatedAt?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string[];
  billingAddress: string[];
  paymentMethod: string;
  paymentMethodLabel: string;
  paymentStatus: string;
  paymentStatusLabel: string;
  requireInvoice: boolean;
  items: Array<{
    productId: string;
    productName: string;
    productSlug?: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }>;
  pricing: {
    subtotal: number;
    discount: number;
    voucher: number;
    shipping: number;
    total: number;
  };
  notes?: string;
  adminNotes?: string;
  cancelReason?: string;
  returnReason?: string;
  returnRequestedAt?: string;
  specList: SpecListItem[];
  timeline: Array<{ label: string; value: string; icon: string; class?: string }>;
  pricingLines: Array<{ label: string; amount: number; type?: 'discount' | 'charge' }>; 
  expectedDeliveryAt?: string;
}

interface PharmacistChatMessageView {
  id: string;
  sender: 'user' | 'pharmacist' | 'system';
  content: string;
  timestamp: string;
  senderLabel: string;
  isPharmacist: boolean;
  isSystem: boolean;
}

interface PharmacistChatViewData {
  id: string;
  status: string;
  statusLabel: string;
  statusClass: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
  messages: PharmacistChatMessageView[];
  lastMessageAt?: string;
}

interface PharmacistChatMessageMeta extends PharmacistChatMessageView {
  raw: any;
  timeValue: number;
}

interface TuvanThuocViewData {
  id: string;
  userId?: string;
  fullName: string;
  phoneNumber: string;
  notes?: string;
  prescriptionImages: string[];
  medicineNames: string[];
  status: string;
  statusLabel: string;
  statusClass: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  specList: SpecListItem[];
  timeline: Array<{ label: string; value: string; icon: string }>;
}

interface BannerViewData {
  id: string;
  name: string;
  type: 'hero' | 'feature' | 'sub' | 'marketing';
  typeLabel: string;
  position: string;
  image?: string;
  backgroundImage?: string;
  slideImage?: string;
  title?: string;
  subtitle?: string;
  badge1?: { text: string; discount: string };
  badge2?: { text: string; discount: string };
  buttonText?: string;
  dateRange?: string;
  productId?: string;
  link?: string;
  order: number;
  status: string;
  statusLabel: string;
  statusClass: 'active' | 'inactive';
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  specList: SpecListItem[];
  timeline: Array<{ label: string; value: string; icon: string }>;
}

@Component({
  selector: 'app-collection-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  providers: [DatePipe],
  templateUrl: './collection-detail.page.html',
  styleUrl: './collection-detail.page.css'
})
export class CollectionDetailPage {
  @ViewChild('pharmacistChatMessages') pharmacistChatMessages?: ElementRef<HTMLDivElement>;

  private readonly api = inject(AdminApiService);
  private readonly store = inject(AdminCollectionsStore);
  private readonly notifier = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly datePipe = inject(DatePipe);
  private readonly fb = inject(FormBuilder);

  readonly collectionKey = toSignal(
    this.route.paramMap.pipe(map(params => params.get('collectionKey') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('collectionKey') ?? '' }
  );

  readonly documentId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' }
  );

  readonly openEditSignal = toSignal(
    this.route.queryParamMap.pipe(map(params => {
      const v = (params.get('edit') || '').toLowerCase();
      return v === '1' || v === 'true' || v === 'yes';
    })),
    { initialValue: (() => { const v = (this.route.snapshot.queryParamMap.get('edit') || '').toLowerCase(); return v === '1' || v === 'true' || v === 'yes'; })() }
  );

  readonly collectionMeta = computed<AdminCollectionMeta | undefined>(() =>
    this.store.getByKey(this.collectionKey())
  );

  readonly isCreate = computed(() => this.documentId() === 'new' || this.documentId() === 'create');

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly error = signal<string | null>(null);
  readonly document = signal<any | null>(null);
  readonly jsonValue = signal('');
  readonly showJsonModal = signal(false);
  readonly showEditDrawer = signal(false);
  readonly sectionEdit = signal<{ [key: string]: boolean }>({});
  readonly sectionDraft = signal<{ [key: string]: string }>({});
  readonly newImageUrl = signal<string>('');
  readonly specEditMode = signal(false);
  readonly specEditFields = signal<{ [key: string]: boolean }>({});
  readonly specDrafts = signal<{ [key: string]: string | number | boolean | null }>({});
  readonly showConfirmOrderModal = signal(false);
  readonly confirmingOrder = signal(false);
  readonly pharmacistReplyDraft = signal('');
  readonly sendingPharmacistReply = signal(false);

  readonly productForm = this.fb.group({
    // Product fields
    name: ['', [Validators.required, Validators.maxLength(255)]],
    brand: [''],
    sku: [''],
    slug: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    discount: [0, [Validators.min(0), Validators.max(100)]],
    stock: [null],
    unit: ['Hộp'],
    country: [''],
    status: [''],
    image: [''],
    // Product detail fields
    description: [''],
    usage: [''],
    ingredients: [''],
    warnings: [''],
    tags: [''], // Comma-separated string, will be converted to array
    // Voucher fields
    code: [''],
    title: [''],
    voucherDescription: [''], // Renamed to avoid conflict with product description
    discountPercent: [0],
    voucherDiscount: [null as number | null | undefined], // Renamed to avoid conflict with product discount
    minOrderAmount: [0],
    maxUsage: [null as number | null | undefined],
    startsAt: [''],
    expiresAt: [''],
    isActive: [false]
  });

  readonly galleryArray = signal<string[]>([]);

  // Category Form
  readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    slug: [''],
    level: [1, [Validators.required, Validators.min(1), Validators.max(3)]],
    parentId: [''],
    displayOrder: [null as number | null],
    icon: [''],
    isActive: [true],
    description: ['']
  });

  readonly availableCategories = signal<Array<{ _id: string; name: string; level: number }>>([]);

  // Disease Form
  readonly diseaseForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    code: [''],
    slug: [''],
    headline: [''],
    summary: [''],
    symptoms: [''],
    causes: [''],
    treatment: [''],
    prevention: [''],
    notes: [''],
    coverImage: [''],
    url: [''],
    originalUrl: [''],
    categories: [''], // Comma-separated string
    alternateNames: [''], // Comma-separated string
    isVisible: [true]
  });

  // Banner Form
  readonly bannerForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    type: ['hero' as 'hero' | 'feature' | 'sub' | 'marketing', [Validators.required]],
    position: ['homepage', [Validators.required]],
    image: [''],
    backgroundImage: [''],
    slideImage: [''],
    title: [''],
    subtitle: [''],
    badge1Text: [''],
    badge1Discount: [''],
    badge2Text: [''],
    badge2Discount: [''],
    buttonText: [''],
    dateRange: [''],
    productId: [''],
    link: [''],
    order: [0, [Validators.min(0)]],
    isActive: [true]
  });

  // Blog Form
  readonly blogForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(500)]],
    slug: [''],
    articleId: [''],
    headline: [''],
    shortDescription: ['', [Validators.maxLength(500)]],
    content: ['', [Validators.required, Validators.minLength(100)]], // Make content required with min length
    coverImage: [''],
    url: [''],
    originalUrl: [''],
    authorName: [''],
    authorTitle: [''],
    authorAvatar: [''],
    status: ['published'],
    isApproved: [true],
    isVisible: [true],
    publishedAt: [''],
    categories: [''], // Comma-separated string
    tags: [''], // Comma-separated string
    // SEO & Metadata
    metaTitle: [''],
    metaDescription: [''],
    metaKeywords: [''],
    readTime: [null as number | null], // Reading time in minutes
    featured: [false],
    allowComments: [true]
  });

  // Blog editor helpers
  readonly blogPreviewMode = signal(false);
  readonly contentWordCount = computed(() => {
    const content = this.blogForm.value.content || '';
    const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return words.length;
  });
  readonly contentCharCount = computed(() => {
    return (this.blogForm.value.content || '').length;
  });
  readonly estimatedReadTime = computed(() => {
    return Math.ceil(this.contentWordCount() / 200);
  });
  
  // Expose Math for template
  readonly Math = Math;

  readonly isProductCollection = computed(() => this.collectionKey() === 'products');
  readonly isBannerCollection = computed(() => this.collectionKey() === 'banners');
  get pricePreviewValue(): number {
    const price = Number(this.productForm.value.price ?? 0);
    const rawDiscount = this.productForm.value.discount;
    const discount = Number(rawDiscount ?? 0);

    if (!Number.isFinite(price) || price <= 0) {
      return 0;
    }

    if (!Number.isFinite(discount) || discount <= 0) {
      return price;
    }

    if (discount > 0 && discount < 1) {
      return Math.max(Math.round(price * (1 - discount)), 0);
    }

    if (discount <= 100) {
      return Math.max(Math.round((price * (100 - discount)) / 100), 0);
    }

    return Math.max(price - discount, 0);
  }

  get discountIsAmount(): boolean {
    const rawDiscount = Number(this.productForm.value.discount ?? 0);
    return Number.isFinite(rawDiscount) && rawDiscount > 100;
  }

  readonly isCategoryCollection = computed(() => this.collectionKey() === 'categories');
  readonly isPromotionCollection = computed(() => this.collectionKey() === 'promotions');
  readonly isBlogCollection = computed(() => this.collectionKey() === 'blogs');
  readonly isDiseaseCollection = computed(() => this.collectionKey() === 'benh');
  readonly isUserCollection = computed(() => this.collectionKey() === 'users');
  readonly isOrderCollection = computed(() => this.collectionKey() === 'orders');
  readonly isPharmacistChatCollection = computed(() => this.collectionKey() === 'pharmacist_chats');
  readonly isTuvanThuocCollection = computed(() => this.collectionKey() === 'tuvanthuoc');

  readonly productView = computed<ProductViewData | null>(() => {
    if (!this.isProductCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const price = Number(doc.price) || 0;
    const discount = Number(doc.discount) || 0;
    const finalFromDoc = Number(doc.finalPrice);
    const finalPrice = !Number.isNaN(finalFromDoc) && finalFromDoc > 0
      ? finalFromDoc
      : discount > 0 && discount < 100
        ? Math.max(Math.round((price * (100 - discount)) / 100), 0)
        : price;

    const gallerySources: string[] = [];
    
    // Handle gallery field - could be array or string (JSON string)
    if (Array.isArray(doc.gallery)) {
      gallerySources.push(...doc.gallery);
    } else if (typeof doc.gallery === 'string' && doc.gallery.trim() !== '') {
      try {
        // Try to parse as JSON array string
        const parsed = JSON.parse(doc.gallery);
        if (Array.isArray(parsed)) {
          gallerySources.push(...parsed);
        }
      } catch (e) {
        // If parsing fails, try to parse as Python-style array string ['url1', 'url2']
        const match = doc.gallery.match(/'([^']+)'/g);
        if (match) {
          gallerySources.push(...match.map((m: string) => m.replace(/'/g, '')));
        }
      }
    }
    
    // Handle images field - could be array or string (JSON string)
    if (Array.isArray(doc.images)) {
      gallerySources.push(...doc.images);
    } else if (typeof doc.images === 'string' && doc.images.trim() !== '') {
      try {
        const parsed = JSON.parse(doc.images);
        if (Array.isArray(parsed)) {
          gallerySources.push(...parsed);
        }
      } catch (e) {
        const match = doc.images.match(/'([^']+)'/g);
        if (match) {
          gallerySources.push(...match.map((m: string) => m.replace(/'/g, '')));
        }
      }
    }
    
    // Ensure gallery is always an array, filter out empty/invalid values
    let gallery = gallerySources.length > 0
      ? Array.from(new Set(gallerySources.filter((item) => typeof item === 'string' && item.trim() !== '')))
      : [];
    
    // If no gallery but has image, add image to gallery
    const mainImage = doc.image || doc.thumbnail;
    if (gallery.length === 0 && mainImage && typeof mainImage === 'string' && mainImage.trim() !== '') {
      gallery = [mainImage];
    }

    const tagsSources: string[] = [];
    if (Array.isArray(doc.tags)) {
      tagsSources.push(...doc.tags);
    }
    if (Array.isArray(doc.labels)) {
      tagsSources.push(...doc.labels);
    }
    const tags = Array.from(new Set(tagsSources.filter((item) => typeof item === 'string' && item.trim() !== '')));

    const stockValue = typeof doc.stock === 'number' ? doc.stock : Number.isFinite(Number(doc.quantity)) ? Number(doc.quantity) : undefined;
    const status = doc.status || (typeof stockValue === 'number' ? (stockValue > 0 ? 'Còn hàng' : 'Hết hàng') : 'Đang cập nhật');
    const statusClass: ProductViewData['statusClass'] = status.toLowerCase().includes('hết') || (typeof stockValue === 'number' && stockValue <= 0)
      ? 'out-of-stock'
      : status.toLowerCase().includes('chờ') || status.toLowerCase().includes('pending')
        ? 'pending'
        : 'in-stock';

    const specList: SpecListItem[] = [
      { label: 'Danh mục', value: doc.categoryName || doc.category?.name || '—', readonly: true },
      { label: 'Slug', value: doc.slug || '—', field: 'slug', mono: true },
      { label: 'Mã sản phẩm', value: doc.sku || doc.code || doc._id || '—', field: 'sku', mono: true },
      { label: 'Đơn vị', value: doc.unit || '—', field: 'unit' },
      { label: 'Xuất xứ', value: doc.country || '—', field: 'country' },
      { label: 'Đơn thuốc', value: doc.prescriptionRequired === true ? 'Có' : doc.prescriptionRequired === false ? 'Không' : '—', readonly: true },
      { label: 'Tồn kho', value: typeof stockValue === 'number' && !Number.isNaN(stockValue) ? `${stockValue}` : '—', field: 'stock' },
      { label: 'Trạng thái', value: status || '—', field: 'status' }
    ];

    // Use main image or first gallery image
    const image = doc.image || doc.thumbnail || (gallery.length > 0 ? gallery[0] : '');

    return {
      name: doc.name,
      brand: doc.brand,
      sku: doc.sku || doc.code || doc._id,
      slug: doc.slug,
      price,
      finalPrice,
      discount,
      unit: doc.unit,
      stock: typeof stockValue === 'number' ? stockValue : undefined,
      status,
      statusClass,
      image,
      gallery,
      description: doc.description,
      usage: doc.usage,
      ingredients: doc.ingredients,
      warnings: doc.warnings,
      tags,
      specList,
      country: doc.country
    };
  });

  readonly categoryView = computed<CategoryViewData | null>(() => {
    if (!this.isCategoryCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const id = doc._id || '';
    const name = doc.name || '';
    const slug = doc.slug || '';
    const fullPath = doc.full_path || doc.fullPath || '';
    const level = Number(doc.level) || 1;
    const displayOrder = typeof doc.display_order === 'number' ? doc.display_order : (typeof doc.displayOrder === 'number' ? doc.displayOrder : undefined);
    const parentId = doc.parentId || doc.parent_id || '';
    const parentName = doc.parentName || doc.parent_name || '';
    const icon = doc.icon || '';
    const isActive = doc.is_active === true || doc.isActive === true;
    const description = doc.description || '';

    const specList: SpecListItem[] = [
      { label: 'Cấp độ', value: `Cấp ${level}` },
      { label: 'Đường dẫn đầy đủ', value: fullPath || '—', readonly: true, mono: true },
      { label: 'Danh mục cha', value: parentName || parentId || '—', field: 'parentId' },
      { label: 'Thứ tự hiển thị', value: displayOrder !== undefined && displayOrder !== null ? `${displayOrder}` : '—', field: 'displayOrder' },
      { label: 'Trạng thái', value: isActive ? 'Hoạt động' : 'Ẩn', field: 'isActive' }
    ];

    return {
      id,
      name,
      slug,
      fullPath,
      level,
      displayOrder,
      parentId,
      parentName,
      icon,
      isActive,
      description,
      specList
    };
  });

  readonly voucherView = computed<VoucherViewData | null>(() => {
    if (!this.isPromotionCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const id = doc._id?.toString() || '';
    const code = doc.code || '';
    const title = doc.title || doc.name || '';
    const description = doc.description || '';
    const discountPercent = typeof doc.discountPercent === 'number' ? doc.discountPercent : (typeof doc.discount_percent === 'number' ? doc.discount_percent : 0);
    const discount = typeof doc.discount === 'number' ? doc.discount : undefined;
    const minOrderAmount = typeof doc.minOrderAmount === 'number' ? doc.minOrderAmount : (typeof doc.min_order_amount === 'number' ? doc.min_order_amount : 0);
    const maxUsage = typeof doc.maxUsage === 'number' ? doc.maxUsage : (typeof doc.max_usage === 'number' ? doc.max_usage : undefined);
    const usedCount = typeof doc.usedCount === 'number' ? doc.usedCount : (typeof doc.used_count === 'number' ? doc.used_count : 0);
    const isActive = doc.isActive === true || doc.is_active === true;

    // Determine status
    const now = new Date();
    let status: VoucherViewData['status'] = 'inactive';
    let statusClass: VoucherViewData['statusClass'] = 'inactive';

    if (!isActive) {
      status = 'inactive';
      statusClass = 'inactive';
    } else {
      const startsAt = doc.startsAt ? new Date(doc.startsAt) : null;
      const expiresAt = doc.expiresAt ? new Date(doc.expiresAt) : null;

      if (startsAt && now < startsAt) {
        status = 'upcoming';
        statusClass = 'upcoming';
      } else if (expiresAt && now > expiresAt) {
        status = 'expired';
        statusClass = 'expired';
      } else {
        status = 'active';
        statusClass = 'active';
      }
    }

    const startsAtDate = doc.startsAt ? new Date(doc.startsAt) : null;
    const expiresAtDate = doc.expiresAt ? new Date(doc.expiresAt) : null;
    const startsAtLabel = startsAtDate ? (this.datePipe.transform(startsAtDate, 'dd/MM/yyyy HH:mm') ?? '') : 'Ngay lập tức';
    const expiresAtLabel = expiresAtDate ? (this.datePipe.transform(expiresAtDate, 'dd/MM/yyyy HH:mm') ?? '') : 'Không hết hạn';
    const validityLabel = startsAtDate || expiresAtDate
      ? `${startsAtLabel} → ${expiresAtLabel}`
      : 'Không giới hạn thời gian';

    const usagePercent = maxUsage && maxUsage > 0 ? Math.min(100, Math.round((usedCount / maxUsage) * 100)) : null;
    const usageLabel = maxUsage
      ? `${usedCount}/${maxUsage} lượt${usagePercent !== null ? ` (${usagePercent}%)` : ''}`
      : usedCount > 0
        ? `${usedCount} lượt đã dùng`
        : 'Chưa được sử dụng';

    let statusLabel = 'Không hoạt động';
    if (status === 'active') {
      statusLabel = 'Đang hoạt động';
    } else if (status === 'expired') {
      statusLabel = 'Đã hết hạn';
    } else if (status === 'upcoming') {
      statusLabel = 'Sắp diễn ra';
    }

    const specList: SpecListItem[] = [
      { label: 'Mã giảm giá', value: code || '—', field: 'code', mono: true },
      { label: 'Phần trăm giảm', value: discountPercent > 0 ? `${discountPercent}%` : '—', field: 'discountPercent' },
      { label: 'Giảm giá cố định', value: discount ? `${discount.toLocaleString('vi-VN')}₫` : '—', field: 'discount' },
      { label: 'Đơn hàng tối thiểu', value: minOrderAmount > 0 ? `${minOrderAmount.toLocaleString('vi-VN')}₫` : 'Không giới hạn', field: 'minOrderAmount' },
      { label: 'Số lượt sử dụng', value: maxUsage ? `${usedCount}/${maxUsage}` : usedCount > 0 ? `${usedCount} lượt` : 'Không giới hạn', field: 'maxUsage' },
      { label: 'Ngày bắt đầu', value: startsAtLabel, field: 'startsAt' },
      { label: 'Ngày hết hạn', value: expiresAtLabel, field: 'expiresAt' },
      { label: 'Trạng thái', value: statusLabel },
      { label: 'Hiệu lực', value: validityLabel }
    ];

    const timeline: VoucherViewData['timeline'] = [];
    timeline.push({ label: 'Kích hoạt', value: startsAtLabel, icon: 'play_arrow' });
    if (expiresAtLabel !== 'Không hết hạn') {
      timeline.push({ label: 'Kết thúc', value: expiresAtLabel, icon: 'event_busy' });
    }
    timeline.push({ label: 'Lượt sử dụng', value: usageLabel, icon: 'auto_graph' });

    return {
      id,
      code,
      title,
      description,
      discountPercent,
      discount,
      minOrderAmount,
      maxUsage,
      usedCount,
      isActive,
      startsAt: doc.startsAt,
      expiresAt: doc.expiresAt,
      status,
      statusClass,
      startsAtLabel,
      expiresAtLabel,
      usageLabel,
      usagePercent,
      validityLabel,
      statusLabel,
      specList,
      timeline
    };
  });

  readonly bannerView = computed<BannerViewData | null>(() => {
    if (!this.isBannerCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const id = doc._id?.toString() || '';
    const name = doc.name || '';
    const type = (doc.type || 'hero') as BannerViewData['type'];
    const typeLabels: Record<BannerViewData['type'], string> = {
      hero: 'Hero Banner',
      feature: 'Feature Banner',
      sub: 'Sub Banner',
      marketing: 'Marketing Banner'
    };
    const typeLabel = typeLabels[type] || 'Banner';
    const position = doc.position || 'homepage';
    const image = doc.image || '';
    const backgroundImage = doc.backgroundImage || '';
    const slideImage = doc.slideImage || '';
    const title = doc.title || '';
    const subtitle = doc.subtitle || '';
    const badge1 = doc.badge1 || undefined;
    const badge2 = doc.badge2 || undefined;
    const buttonText = doc.buttonText || '';
    const dateRange = doc.dateRange || '';
    const productId = doc.productId || '';
    const link = doc.link || '';
    const order = typeof doc.order === 'number' ? doc.order : 0;
    const status = doc.status || 'active';
    const isActive = doc.isActive !== false && status === 'active';
    const statusLabel = isActive ? 'Đang hoạt động' : 'Không hoạt động';
    const statusClass: BannerViewData['statusClass'] = isActive ? 'active' : 'inactive';

    const specList: SpecListItem[] = [
      { label: 'Tên banner', value: name || '—', field: 'name' },
      { label: 'Loại banner', value: typeLabel, field: 'type' },
      { label: 'Vị trí', value: position || '—', field: 'position' },
      { label: 'Thứ tự', value: order.toString(), field: 'order' },
      { label: 'Trạng thái', value: statusLabel, field: 'status' },
      { label: 'Hình ảnh', value: image || '—', field: 'image', mono: true },
      { label: 'Background Image', value: backgroundImage || '—', field: 'backgroundImage', mono: true },
      { label: 'Slide Image', value: slideImage || '—', field: 'slideImage', mono: true },
      { label: 'Tiêu đề', value: title || '—', field: 'title' },
      { label: 'Phụ đề', value: subtitle || '—', field: 'subtitle' },
      { label: 'Badge 1', value: badge1 ? `${badge1.text} - ${badge1.discount}` : '—', field: 'badge1' },
      { label: 'Badge 2', value: badge2 ? `${badge2.text} - ${badge2.discount}` : '—', field: 'badge2' },
      { label: 'Nút bấm', value: buttonText || '—', field: 'buttonText' },
      { label: 'Khoảng thời gian', value: dateRange || '—', field: 'dateRange' },
      { label: 'Product ID', value: productId || '—', field: 'productId', mono: true },
      { label: 'Link', value: link || '—', field: 'link', mono: true }
    ];

    const timeline: BannerViewData['timeline'] = [];
    if (doc.createdAt) {
      const createdAt = doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt);
      timeline.push({
        label: 'Tạo lúc',
        value: this.datePipe.transform(createdAt, 'dd/MM/yyyy HH:mm') || '',
        icon: 'add_circle'
      });
    }
    if (doc.updatedAt) {
      const updatedAt = doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt);
      timeline.push({
        label: 'Cập nhật',
        value: this.datePipe.transform(updatedAt, 'dd/MM/yyyy HH:mm') || '',
        icon: 'update'
      });
    }

    return {
      id,
      name,
      type,
      typeLabel,
      position,
      image,
      backgroundImage,
      slideImage,
      title,
      subtitle,
      badge1,
      badge2,
      buttonText,
      dateRange,
      productId,
      link,
      order,
      status,
      statusLabel,
      statusClass,
      isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      specList,
      timeline
    };
  });

  readonly blogView = computed<BlogViewData | null>(() => {
    if (!this.isBlogCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const id = doc._id?.toString() || doc.id?.toString() || '';
    const title = doc.title || doc.name || '';
    const slug = doc.slug || doc.cleanSlug || '';
    const articleId = doc.articleId ? String(doc.articleId) : (doc.id ? String(doc.id) : undefined);
    const url = doc.url || doc.detailUrl || '';
    const originalUrl = doc.originalUrl || doc.original_url || '';
    const headline = doc.headline || '';
    const shortDescription = doc.shortDescription || doc.summary || '';
    const content = doc.descriptionHtml || doc.content || doc.body || doc.html || doc.article || '';
    const coverImage = doc.primaryImage?.url || doc.primaryImage?.src || doc.primaryImage?.original || doc.primaryImage || doc.thumbnail || doc.image || '';
    const authorName = doc.author?.fullName || doc.author?.name || doc.author?.displayName || doc.author?.username || (typeof doc.author === 'string' ? doc.author : '');
    const authorTitle = doc.author?.title || doc.author?.role || '';
    const authorAvatar = doc.author?.avatar || doc.author?.image || doc.author?.avatarUrl || '';

    const collectStrings = (input: any, target: Set<string>) => {
      if (!input) {
        return;
      }
      if (Array.isArray(input)) {
        input.forEach(item => collectStrings(item, target));
        return;
      }
      if (typeof input === 'string') {
        const value = input.trim();
        if (value) {
          target.add(value);
        }
        return;
      }
      if (typeof input === 'object') {
        const value = input.name || input.title || input.slug || input.fullPath || input.fullPathSlug || input.categoryName;
        if (value) {
          target.add(String(value));
        }
      }
    };

    const categorySet = new Set<string>();
    collectStrings(doc.category, categorySet);
    collectStrings(doc.parentCategory, categorySet);
    collectStrings(doc.categories, categorySet);

    const tagSet = new Set<string>();
    if (Array.isArray(doc.tags)) {
      doc.tags.forEach((tag: any) => {
        if (typeof tag === 'string') {
          tagSet.add(tag.trim());
        } else if (tag?.title) {
          tagSet.add(String(tag.title));
        } else if (tag?.name) {
          tagSet.add(String(tag.name));
        } else if (tag?.slug) {
          tagSet.add(String(tag.slug));
        }
      });
    }
    if (Array.isArray(doc.hashtags)) {
      doc.hashtags.forEach((item: any) => {
        if (!item) {
          return;
        }
        if (typeof item === 'string') {
          tagSet.add(item.replace(/^#/, '').trim());
        } else if (item?.title) {
          tagSet.add(String(item.title));
        }
      });
    } else if (typeof doc.hashtags === 'string') {
      doc.hashtags
        .split(/[,;#]/)
        .map((item: string) => item.trim())
        .filter(Boolean)
        .forEach((value: string) => tagSet.add(value));
    }

    const publishedAtDate = doc.publishedAt ? new Date(doc.publishedAt) : null;
    const updatedAtDate = doc.updatedAt ? new Date(doc.updatedAt) : null;
    const createdAtDate = doc.createdAt ? new Date(doc.createdAt) : null;
    const fetchedAtDate = doc.fetchedAt ? new Date(doc.fetchedAt) : null;

    const statusRaw = (doc.status || '').toLowerCase();
    const isApproved = doc.isApproved !== false;
    const isVisible = doc.isVisible !== false && doc.visibility !== 'hidden';

    let statusLabel = 'Đã xuất bản';
    let statusClass: StatusBadge = 'published';

    if (!isApproved) {
      statusLabel = 'Chờ phê duyệt';
      statusClass = 'pending';
    } else if (!isVisible) {
      statusLabel = 'Đang ẩn';
      statusClass = 'hidden';
    } else if (statusRaw.includes('draft')) {
      statusLabel = 'Bản nháp';
      statusClass = 'draft';
    } else if (publishedAtDate && publishedAtDate > new Date()) {
      statusLabel = 'Đã lên lịch';
      statusClass = 'scheduled';
    }

    const formatDate = (date: Date | null) => date ? (this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') ?? '') : '';

    const specList: BlogViewData['specList'] = [
      { label: 'Slug', value: slug || '—', field: 'slug', mono: true },
      { label: 'Mã bài viết', value: articleId || id || '—', mono: true, readonly: true },
      { label: 'Chuyên mục', value: categorySet.size ? Array.from(categorySet).join(', ') : '—', readonly: true },
      { label: 'Tác giả', value: authorName || '—', readonly: true },
      { label: 'Trạng thái', value: statusLabel, field: 'status' },
      { label: 'Đường dẫn hiển thị', value: url || '—', field: 'url', mono: true },
      { label: 'Link nguồn', value: originalUrl || '—', field: 'originalUrl', mono: true }
    ];

    const tagsValue = Array.from(tagSet).join(', ');
    specList.push({ label: 'Từ khoá', value: tagsValue || '—', field: 'tags' });

    const timeline: BlogViewData['timeline'] = [];
    if (publishedAtDate) {
      timeline.push({ label: 'Xuất bản', value: formatDate(publishedAtDate), icon: 'event_available' });
    }
    if (updatedAtDate) {
      timeline.push({ label: 'Cập nhật', value: formatDate(updatedAtDate), icon: 'update' });
    }
    if (createdAtDate) {
      timeline.push({ label: 'Tạo mới', value: formatDate(createdAtDate), icon: 'fiber_new' });
    }
    if (fetchedAtDate) {
      timeline.push({ label: 'Thu thập', value: formatDate(fetchedAtDate), icon: 'cloud_download' });
    }

    return {
      id,
      title,
      slug,
      articleId,
      url,
      originalUrl,
      headline,
      shortDescription,
      content,
      coverImage,
      authorName,
      authorTitle,
      authorAvatar,
      statusLabel,
      statusClass,
      publishedAt: doc.publishedAt,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      fetchedAt: doc.fetchedAt,
      categories: Array.from(categorySet),
      tags: Array.from(tagSet),
      specList,
      timeline
    };
  });

  readonly diseaseView = computed<DiseaseViewData | null>(() => {
    if (!this.isDiseaseCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const id = doc._id?.toString() || doc.id?.toString() || '';
    const code = doc.id ? String(doc.id) : undefined;
    const name = doc.name || doc.title || '';
    const slug = doc.slug || '';
    const coverImage = doc.primary_image || doc.primaryImage || doc.image || doc.thumbnail || '';
    const url = doc.url || '';
    const originalUrl = doc.original_url || doc.originalUrl || '';

    const toRichText = (value: any): string => {
      if (!value) {
        return '';
      }
      if (typeof value === 'string') {
        return value;
      }
      if (Array.isArray(value)) {
        return value
          .map(item => {
            if (!item) {
              return '';
            }
            if (typeof item === 'string') {
              return item;
            }
            if (typeof item === 'object') {
              if (typeof item.text === 'string') {
                return item.text;
              }
              const firstValue = Object.values(item).find(v => typeof v === 'string');
              return firstValue ? String(firstValue) : '';
            }
            return String(item);
          })
          .filter(Boolean)
          .join('<br />');
      }
      if (typeof value === 'object') {
        if (typeof value.text === 'string') {
          return value.text;
        }
        const aggregated = Object.values(value)
          .map(v => (typeof v === 'string' ? v : ''))
          .filter(Boolean)
          .join('<br />');
        return aggregated;
      }
      return String(value);
    };

    const summary = toRichText(doc.summary || doc.description || doc.headline || doc.overview);
    const symptoms = toRichText(doc.symptoms || doc.symptom || doc.signs || doc.signals);
    const causes = toRichText(doc.causes || doc.cause || doc.reasons);
    const treatment = toRichText(doc.treatment || doc.treatments || doc.treatmentOptions);
    const prevention = toRichText(doc.prevention || doc.preventions || doc.preventive || doc.preventiveMeasures);
    const notes = toRichText(doc.notes || doc.note || doc.advice || doc.recommendations);

    const categorySet = new Set<string>();
    if (Array.isArray(doc.categories)) {
      doc.categories.forEach((cat: any) => {
        if (!cat) {
          return;
        }
        if (typeof cat === 'string') {
          categorySet.add(cat);
        } else if (cat.name) {
          categorySet.add(String(cat.name));
        }
      });
    }
    if (doc.category?.name) {
      categorySet.add(String(doc.category.name));
    }

    const alternateNames = new Set<string>();
    const pushAlternate = (value: any) => {
      if (!value) {
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(item => pushAlternate(item));
      } else if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          alternateNames.add(trimmed);
        }
      }
    };
    pushAlternate(doc.other_names || doc.aliases || doc.alias || doc.synonyms);

    const updatedAtDate = doc.updatedAt ? new Date(doc.updatedAt) : null;
    const createdAtDate = doc.createdAt ? new Date(doc.createdAt) : null;

    const formatDate = (date: Date | null) => date ? (this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') ?? '') : '';

    const statusLabel = doc.isVisible === false ? 'Đang ẩn' : 'Đang hiển thị';
    const statusClass: StatusBadge = doc.isVisible === false ? 'hidden' : 'published';

    const specList: DiseaseViewData['specList'] = [
      { label: 'Mã bệnh', value: code || '—', readonly: true },
      { label: 'Slug', value: slug || '—', field: 'slug', mono: true },
      { label: 'Trạng thái', value: statusLabel, field: 'isVisible' },
      { label: 'Link chi tiết', value: url || '—', field: 'url', mono: true },
      { label: 'Link gốc', value: originalUrl || '—', field: 'originalUrl', mono: true }
    ];

    if (categorySet.size) {
      specList.push({ label: 'Chuyên khoa', value: Array.from(categorySet).join(', ') });
    }

    if (alternateNames.size) {
      specList.push({ label: 'Tên khác', value: Array.from(alternateNames).join(', ') });
    }

    const timeline: DiseaseViewData['timeline'] = [];
    if (createdAtDate) {
      timeline.push({ label: 'Tạo mới', value: formatDate(createdAtDate), icon: 'fiber_new' });
    }
    if (updatedAtDate) {
      timeline.push({ label: 'Cập nhật', value: formatDate(updatedAtDate), icon: 'update' });
    }

    return {
      id,
      code,
      name,
      slug,
      summary,
      symptoms,
      causes,
      treatment,
      prevention,
      notes,
      headline: doc.headline,
      coverImage,
      url,
      originalUrl,
      categories: Array.from(categorySet),
      alternateNames: Array.from(alternateNames),
      statusLabel,
      statusClass,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      specList,
      timeline
    };
  });

  readonly userView = computed<UserViewData | null>(() => {
    if (!this.isUserCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const id = doc._id?.toString() || doc.id?.toString() || '';
    const email = doc.mail || doc.email || doc.username || doc.account || '';
    const phone = doc.phone || doc.profile?.phone || doc.contact?.phone || doc.userPhone || '';
    const roles = Array.isArray(doc.roles)
      ? doc.roles.map((role: any) => {
          if (!role) {
            return '';
          }
          if (typeof role === 'string') {
            return role;
          }
          return role.name || role.code || String(role);
        }).filter(Boolean)
      : doc.roles
        ? [String(doc.roles)]
        : [];

    const statusRaw = (doc.status || '').toString().toLowerCase();
    let statusLabel = 'Hoạt động';
    let statusClass: StatusBadge = 'active';

    if (doc.isActive === false || statusRaw.includes('inactive') || statusRaw.includes('blocked') || statusRaw.includes('disabled')) {
      statusLabel = 'Đã khóa';
      statusClass = 'inactive';
    } else if (statusRaw.includes('pending') || statusRaw.includes('verify')) {
      statusLabel = 'Chờ xác minh';
      statusClass = 'pending';
    } else if (statusRaw.includes('deleted')) {
      statusLabel = 'Đã xóa';
      statusClass = 'hidden';
    }

    const displayName = doc.profile?.fullName || doc.profile?.name || doc.name || doc.fullName || email || phone || 'Người dùng';
    const avatar = doc.profile?.avatar || doc.avatar || '';
    const gender = doc.profile?.gender || doc.gender || '';
    const birthdayRaw = doc.profile?.birthday || doc.profile?.dob || doc.profile?.dateOfBirth || doc.birthday || doc.dob;
    let birthday: string | undefined;
    if (birthdayRaw) {
      const parsed = new Date(birthdayRaw);
      birthday = Number.isNaN(parsed.getTime()) ? String(birthdayRaw) : (this.datePipe.transform(parsed, 'dd/MM/yyyy') ?? String(birthdayRaw));
    }

    const addressLines: string[] = [];
    const pushAddress = (value: any) => {
      if (!value) {
        return;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          addressLines.push(trimmed);
        }
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(item => pushAddress(item));
        return;
      }
      if (typeof value === 'object') {
        const parts = [value.addressLine, value.fullAddress, value.street, value.ward, value.district, value.city, value.province]
          .map(part => (part ? String(part).trim() : ''))
          .filter(Boolean);
        if (parts.length) {
          addressLines.push(parts.join(', '));
        }
      }
    };

    pushAddress(doc.address);
    pushAddress(doc.addresses);
    pushAddress(doc.profile?.address);
    pushAddress(doc.shippingAddress);

    const notes = doc.notes || doc.note || doc.profile?.note || '';

    const createdAtDate = doc.createdAt ? new Date(doc.createdAt) : null;
    const updatedAtDate = doc.updatedAt ? new Date(doc.updatedAt) : null;
    const lastLoginDate = doc.lastLogin
      ? new Date(doc.lastLogin)
      : doc.last_login
        ? new Date(doc.last_login)
        : (doc.lastLoggedInAt ? new Date(doc.lastLoggedInAt) : null);

    const formatDate = (date: Date | null) => date ? (this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') ?? '') : '';

    const specList: UserViewData['specList'] = [
      { label: 'Email', value: email || '—', field: 'mail', mono: true },
      { label: 'Số điện thoại', value: phone || '—', field: 'phone' },
      { label: 'Trạng thái', value: statusLabel || '—', field: 'status' },
      { label: 'Vai trò', value: roles.length ? roles.join(', ') : '—', field: 'roles' },
      { label: 'Giới tính', value: gender || '—', field: 'gender' },
      { label: 'Ngày sinh', value: birthday || '—', field: 'birthday' }
    ];

    if (addressLines.length) {
      specList.push({ label: 'Địa chỉ', value: addressLines.join(' • '), field: 'address' });
    }

    // Security info removed - không hiển thị thông tin mật khẩu
    const securityInfo: UserViewData['securityInfo'] = [];

    const timeline: UserViewData['timeline'] = [];
    if (createdAtDate) {
      timeline.push({ label: 'Tạo tài khoản', value: formatDate(createdAtDate), icon: 'fiber_new' });
    }
    if (updatedAtDate) {
      timeline.push({ label: 'Cập nhật', value: formatDate(updatedAtDate), icon: 'update' });
    }
    if (lastLoginDate) {
      timeline.push({ label: 'Đăng nhập gần nhất', value: formatDate(lastLoginDate), icon: 'login' });
    }

    return {
      id,
      displayName,
      email,
      phone,
      avatar,
      roles,
      statusLabel,
      statusClass,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lastLogin: doc.lastLogin || doc.last_login || doc.lastLoggedInAt,
      addressLines,
      gender,
      birthday,
      notes,
      specList,
      securityInfo,
      timeline
    };
  });

  readonly orderView = computed<OrderViewData | null>(() => {
    if (!this.isOrderCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const toNumber = (value: any): number => {
      const num = typeof value === 'string' && value.trim() === '' ? NaN : Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const normalizeArray = (input: any): any[] => {
      if (!input) return [];
      if (Array.isArray(input)) {
        return input;
      }
      if (typeof input === 'object') {
        return Object.values(input);
      }
      return [];
    };

    const resolveDate = (value: any): Date | null => {
      if (!value) {
        return null;
      }
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const id = doc._id?.toString() || '';
    const orderNumber = doc.orderNumber || doc.order_number || id;
    
    // Status mapping
    const statusRaw = (doc.status || '').toLowerCase();
    let statusLabel = doc.status || 'Đang xử lý';
    let statusClass = 'active';
    
    if (statusRaw.includes('pending')) {
      statusLabel = 'Đang chờ phản hồi';
      statusClass = 'pending';
    } else if (statusRaw.includes('active') || statusRaw.includes('busy') || statusRaw.includes('processing') || statusRaw.includes('confirmed')) {
      statusLabel = 'Đang xử lý';
      statusClass = 'processing';
    } else if (statusRaw.includes('shipping') || statusRaw.includes('delivering')) {
      statusLabel = 'Đang giao';
      statusClass = 'shipping';
    } else if (statusRaw.includes('delivered')) {
      statusLabel = 'Đã giao';
      statusClass = 'delivered';
    } else if (statusRaw.includes('cancelled') || statusRaw.includes('canceled') || statusRaw.includes('đã hủy')) {
      statusLabel = 'Đã hủy';
      statusClass = 'cancelled';
    } else if (statusRaw.includes('return_requested') || statusRaw.includes('return-requested')) {
      statusLabel = 'Yêu cầu trả hàng';
      statusClass = 'return_requested';
    } else if (statusRaw.includes('returned') || statusRaw.includes('return')) {
      statusLabel = 'Đã trả hàng';
      statusClass = 'returned';
    } else if (statusRaw.includes('closed') || statusRaw.includes('done') || statusRaw.includes('resolved')) {
      statusLabel = 'Đã kết thúc';
      statusClass = 'done';
    }

    // Customer info
    const customerName = doc.customerInfo?.name || doc.shippingAddress?.name || doc.customer?.name || 'Khách hàng';
    const customerPhone = doc.customerInfo?.phone || doc.shippingAddress?.phone || doc.customer?.phone || '';
    const customerEmail = doc.customerInfo?.email || doc.customer?.email || '';

    // Addresses
    const buildAddress = (addr: any): string[] => {
      if (!addr) return [];
      const lines: string[] = [];
      if (addr.addressLine || addr.address || addr.street) {
        lines.push(addr.addressLine || addr.address || addr.street);
      }
      const parts = [addr.ward, addr.district, addr.city, addr.province].filter(Boolean);
      if (parts.length) {
        lines.push(parts.join(', '));
      }
      return lines.filter(Boolean);
    };

    const shippingAddress = buildAddress(doc.shippingAddress);
    const billingAddress = buildAddress(doc.billingAddress);

    // Payment
    const paymentMethod = doc.paymentMethod || doc.payment_method || 'cod';
    const paymentMethodLabel = 
      paymentMethod === 'cod' ? 'Tiền mặt khi nhận hàng' :
      paymentMethod === 'card' ? 'Thẻ tín dụng/ghi nợ' :
      paymentMethod === 'bank' ? 'Chuyển khoản ngân hàng' :
      paymentMethod === 'atm' ? 'Thẻ ATM' :
      paymentMethod === 'qr' ? 'Quét mã QR' :
      paymentMethod;

    const paymentStatus = doc.paymentStatus || doc.payment_status || 'unpaid';
    const paymentStatusLabel =
      paymentStatus === 'paid' ? 'Đã thanh toán' :
      paymentStatus === 'unpaid' ? 'Chưa thanh toán' :
      paymentStatus === 'refunded' ? 'Đã hoàn tiền' :
      paymentStatus;

    const requireInvoice = doc.requireInvoice === true || doc.require_invoice === true;

    // Items
    const itemsSource = normalizeArray(doc.items ?? doc.products ?? doc.orderItems ?? doc.lineItems ?? doc.details);
    const items = itemsSource.map((item: any) => {
      const quantity = Math.max(1, toNumber(item.quantity));
      const unitPrice = toNumber(item.unitPrice ?? item.unit_price ?? item.price);
      const subtotal = toNumber(item.subtotal ?? item.total ?? unitPrice * quantity);
      return {
        productId: item.productId || item.product_id || '',
        productName: item.productName || item.product_name || item.name || '',
        productSlug: item.productSlug || item.product_slug || item.slug || '',
        productImage: item.productImage || item.product_image || item.image || '',
        quantity,
        unitPrice,
        discount: toNumber(item.discount),
        subtotal
      };
    });

    const computedItemSubtotal = items.reduce((sum: number, item: typeof items[number]) => sum + item.subtotal, 0);

    const subtotal = toNumber(doc.pricing?.subtotal ?? doc.subtotal ?? doc.pricing?.itemsSubtotal ?? computedItemSubtotal);
    const shipping = toNumber(doc.pricing?.shipping ?? doc.shippingFee ?? doc.shipping_fee ?? doc.deliveryFee ?? doc.delivery_fee);
    const taxAmount = toNumber(doc.pricing?.tax ?? doc.tax ?? doc.pricing?.vat ?? doc.vat ?? 0);
    const voucherDiscount = toNumber(
      doc.pricing?.voucherDiscount ??
      doc.pricing?.voucher ??
      doc.voucherDiscount ??
      doc.voucher?.discountValue ??
      doc.voucher?.discountAmount ??
      doc.appliedVoucher?.discountAmount ??
      0
    );
    const voucherCode = doc.voucher?.code || doc.voucherCode || doc.voucher?.voucherCode || doc.appliedVoucher?.code || '';
    const promotionalDiscount = toNumber(
      doc.pricing?.discount ??
      doc.discount ??
      0
    );
    const extraDiscount = toNumber(
      doc.pricing?.extraDiscount ??
      doc.extraDiscount ??
      doc.pricing?.promotionDiscount ??
      doc.promotionDiscount ??
      doc.pricing?.itemDiscount ??
      doc.itemDiscount ??
      0
    );

    const manualDiscount = Math.max(0, promotionalDiscount + extraDiscount);

    let total = toNumber(
      doc.pricing?.grandTotal ??
      doc.pricing?.total ??
      doc.total ??
      doc.pricing?.finalTotal ??
      doc.pricing?.final ??
      doc.payableTotal ??
      doc.payment?.total ??
      0
    );

    if (!total) {
      total = Math.max(subtotal - voucherDiscount - manualDiscount + shipping + taxAmount, 0);
    }

    const pricing = {
      subtotal,
      discount: manualDiscount,
      voucher: voucherDiscount,
      shipping,
      total
    };

    const pricingLines: OrderViewData['pricingLines'] = [
      { label: 'Tạm tính', amount: subtotal }
    ];

    if (voucherDiscount > 0) {
      pricingLines.push({
        label: `Giảm giá voucher${voucherCode ? ` (${voucherCode})` : ''}`,
        amount: -voucherDiscount,
        type: 'discount'
      });
    }

    if (manualDiscount > 0) {
      pricingLines.push({ label: 'Giảm giá khác', amount: -manualDiscount, type: 'discount' });
    }

    if (taxAmount > 0) {
      pricingLines.push({ label: 'Thuế', amount: taxAmount, type: 'charge' });
    }

    if (shipping !== 0) {
      pricingLines.push({
        label: shipping > 0 ? 'Phí vận chuyển' : 'Giảm phí vận chuyển',
        amount: shipping,
        type: shipping > 0 ? 'charge' : 'discount'
      });
    }

    const adjustmentsTotal = pricingLines.slice(1).reduce((sum, line) => sum + line.amount, 0);
    const recalculatedTotal = subtotal + adjustmentsTotal;
    if (Math.abs(recalculatedTotal - pricing.total) > 1) {
      pricing.total = Math.max(recalculatedTotal, 0);
    }

    const formatDate = (date: any) => {
      const resolved = resolveDate(date);
      return resolved ? (this.datePipe.transform(resolved, 'dd/MM/yyyy HH:mm') ?? '') : '';
    };
    const createdAt = formatDate(doc.createdAt);
    const updatedAt = formatDate(doc.updatedAt);

    // Spec list
    const specList: SpecListItem[] = [
      { label: 'Mã đơn hàng', value: orderNumber, mono: true, readonly: true },
      { label: 'Ngày đặt', value: createdAt, readonly: true },
      { label: 'Phương thức', value: paymentMethodLabel },
      { label: 'TT thanh toán', value: paymentStatusLabel },
      { label: 'Xuất hóa đơn', value: requireInvoice ? 'Có' : 'Không' }
    ];

    if (voucherCode) {
      specList.push({ label: 'Mã voucher', value: voucherCode, mono: true, readonly: true });
    }

    // Timeline
    const timeline: OrderViewData['timeline'] = [];
    if (createdAt) {
      timeline.push({ label: 'Đặt hàng', value: createdAt, icon: 'shopping_bag', class: 'pending' });
    }
    if (doc.confirmedAt) {
      const confirmed = formatDate(doc.confirmedAt);
      if (confirmed) {
        timeline.push({ label: 'Xác nhận', value: confirmed, icon: 'check_circle', class: 'processing' });
      }
    }
    if (doc.shippedAt || doc.shipped_at) {
      const shipped = formatDate(doc.shippedAt || doc.shipped_at);
      if (shipped) {
        timeline.push({ label: 'Bắt đầu giao', value: shipped, icon: 'local_shipping', class: 'shipping' });
      }
    }
    if (doc.deliveredAt || doc.delivered_at) {
      const delivered = formatDate(doc.deliveredAt || doc.delivered_at);
      if (delivered) {
        timeline.push({ label: 'Đã giao', value: delivered, icon: 'done_all', class: 'delivered' });
      }
    }
    // Get cancel reason from statusHistory
    let cancelReason: string | undefined;
    if (statusRaw === 'cancelled' || statusRaw.includes('cancelled')) {
      const statusHistory = normalizeArray(doc.statusHistory || doc.status_history || []);
      // Find the last cancelled entry in statusHistory
      const cancelledEntry = statusHistory
        .filter((entry: any) => (entry.status || '').toLowerCase() === 'cancelled')
        .sort((a: any, b: any) => {
          const timeA = resolveDate(a.timestamp || a.time || a.createdAt)?.getTime() || 0;
          const timeB = resolveDate(b.timestamp || b.time || b.createdAt)?.getTime() || 0;
          return timeB - timeA; // Sort descending to get the latest
        })[0];
      
      if (cancelledEntry) {
        cancelReason = cancelledEntry.note || cancelledEntry.reason || cancelledEntry.message || '';
      }
      
      // Fallback to direct cancelReason field if exists
      if (!cancelReason) {
        cancelReason = doc.cancelReason || doc.cancel_reason || doc.reason || '';
      }
    }

    // Get return reason from statusHistory or direct field
    let returnReason: string | undefined;
    let returnRequestedAt: string | undefined;
    if (statusRaw.includes('return_requested') || statusRaw.includes('return-requested') || statusRaw.includes('returned')) {
      const statusHistory = normalizeArray(doc.statusHistory || doc.status_history || []);
      // Find the last return_requested entry in statusHistory
      const returnEntry = statusHistory
        .filter((entry: any) => {
          const entryStatus = (entry.status || '').toLowerCase();
          return entryStatus === 'return_requested' || entryStatus === 'return-requested';
        })
        .sort((a: any, b: any) => {
          const timeA = resolveDate(a.timestamp || a.time || a.createdAt)?.getTime() || 0;
          const timeB = resolveDate(b.timestamp || b.time || b.createdAt)?.getTime() || 0;
          return timeB - timeA; // Sort descending to get the latest
        })[0];
      
      if (returnEntry) {
        returnReason = returnEntry.note || returnEntry.reason || returnEntry.message || '';
        returnRequestedAt = formatDate(returnEntry.timestamp || returnEntry.time || returnEntry.createdAt);
      }
      
      // Fallback to direct returnReason field if exists
      if (!returnReason) {
        returnReason = doc.returnReason || doc.return_reason || doc.reason || '';
      }
      
      // Get returnRequestedAt from direct field
      if (!returnRequestedAt) {
        returnRequestedAt = formatDate(doc.returnRequestedAt || doc.return_requested_at);
      }
    }

    if (doc.cancelledAt || doc.cancelled_at) {
      const cancelled = formatDate(doc.cancelledAt || doc.cancelled_at);
      if (cancelled) {
        timeline.push({ label: 'Đã hủy', value: cancelled, icon: 'cancel', class: 'cancelled' });
      }
    }
    if (doc.returnRequestedAt || doc.return_requested_at) {
      const returnRequested = formatDate(doc.returnRequestedAt || doc.return_requested_at);
      if (returnRequested) {
        timeline.push({ label: 'Yêu cầu trả hàng', value: returnRequested, icon: 'assignment_return', class: 'return_requested' });
      }
    }
    if (doc.returnedAt || doc.returned_at) {
      const returned = formatDate(doc.returnedAt || doc.returned_at);
      if (returned) {
        timeline.push({ label: 'Đã trả hàng', value: returned, icon: 'assignment_returned', class: 'returned' });
      }
    }
    if (updatedAt) {
      timeline.push({ label: 'Cập nhật', value: updatedAt, icon: 'update', class: 'info' });
    }

    const expectedDeliveryAtRaw = doc.expectedDeliveryAt || doc.expectedDelivery || doc.estimatedDeliveryAt || doc.delivery?.expectedAt || doc.delivery?.estimatedAt || doc.autoCompleteAt;
    const expectedDeliveryAt = formatDate(expectedDeliveryAtRaw);
    if (expectedDeliveryAt) {
      timeline.push({ label: 'Dự kiến giao', value: expectedDeliveryAt, icon: 'schedule', class: 'info' });
      specList.push({ label: 'Giao dự kiến', value: expectedDeliveryAt, readonly: true });
    }

    return {
      id,
      orderNumber,
      status: doc.status,
      statusClass,
      statusLabel,
      createdAt,
      updatedAt,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentMethodLabel,
      paymentStatus,
      paymentStatusLabel,
      requireInvoice,
      items,
      pricing,
      notes: doc.notes || doc.customerNotes || '',
      adminNotes: doc.adminNotes || doc.admin_notes || '',
      cancelReason: cancelReason || undefined,
      returnReason: returnReason || undefined,
      returnRequestedAt: returnRequestedAt || undefined,
      specList,
      timeline,
      pricingLines,
      expectedDeliveryAt
    };
  });

  readonly pharmacistChatView = computed<PharmacistChatViewData | null>(() => {
    if (!this.isPharmacistChatCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const resolveDate = (value: any): Date | null => {
      if (!value) {
        return null;
      }
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
      }
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

    const statusRaw = (doc.status || '').toLowerCase();
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

    const messagesSource = Array.isArray(doc.messages) ? doc.messages : (Array.isArray(doc.history) ? doc.history : []);
    const messagesSorted = messagesSource
      .map((message: any, index: number): PharmacistChatMessageMeta => {
        const sender: 'user' | 'pharmacist' | 'system' = (message.sender === 'pharmacist' || message.sender === 'system') ? message.sender : 'user';
        const resolved = resolveDate(message.timestamp || message.createdAt || message.time || message.sentAt || message.created_at);
        return {
          raw: message,
          id: message._id?.toString?.() || message.id || `msg-${index}`,
          sender,
          content: message.content || message.message || '',
          timestamp: resolved ? (this.datePipe.transform(resolved, 'HH:mm dd/MM/yyyy') ?? '') : '',
          senderLabel: sender === 'pharmacist' ? (message.pharmacistName || 'Dược sĩ') : (sender === 'system' ? 'Hệ thống' : (doc.customerInfo?.name || doc.username || 'Khách hàng')),
          isPharmacist: sender === 'pharmacist',
          isSystem: sender === 'system',
          timeValue: resolved?.getTime() ?? index
        };
      })
      .sort((a: PharmacistChatMessageMeta, b: PharmacistChatMessageMeta) => a.timeValue - b.timeValue);

    const messages: PharmacistChatMessageView[] = messagesSorted.map((meta: PharmacistChatMessageMeta) => {
      const { raw: _raw, timeValue: _timeValue, ...rest } = meta;
      return rest;
    });
    const lastMessageMeta = messagesSorted.length ? messagesSorted[messagesSorted.length - 1] : null;
    const lastMessageTimestamp = lastMessageMeta?.raw?.timestamp || lastMessageMeta?.raw?.createdAt || null;

    return {
      id: doc._id?.toString?.() || doc.id || this.documentId(),
      status: doc.status || 'pending',
      statusLabel,
      statusClass,
      customerName: doc.customerInfo?.name || doc.username || 'Khách hàng',
      customerPhone: doc.customerInfo?.phone || doc.phone || '',
      createdAt: formatDate(doc.createdAt),
      updatedAt: formatDate(doc.updatedAt),
      messages,
      lastMessageAt: formatDate(lastMessageTimestamp)
    };
  });

  readonly tuvanThuocView = computed<TuvanThuocViewData | null>(() => {
    if (!this.isTuvanThuocCollection()) {
      return null;
    }

    const doc = this.document();
    if (!doc) {
      return null;
    }

    const resolveDate = (value: any): Date | null => {
      if (!value) {
        return null;
      }
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
      }
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

    const statusRaw = (doc.status || 'pending').toLowerCase();
    let statusLabel = 'Đang chờ xử lý';
    let statusClass: 'pending' | 'processing' | 'completed' | 'cancelled' = 'pending';

    if (statusRaw.includes('pending') || statusRaw === 'pending') {
      statusLabel = 'Đang chờ xử lý';
      statusClass = 'pending';
    } else if (statusRaw.includes('processing') || statusRaw.includes('active')) {
      statusLabel = 'Đang xử lý';
      statusClass = 'processing';
    } else if (statusRaw.includes('completed') || statusRaw.includes('done') || statusRaw.includes('resolved')) {
      statusLabel = 'Đã hoàn thành';
      statusClass = 'completed';
    } else if (statusRaw.includes('cancelled') || statusRaw.includes('canceled')) {
      statusLabel = 'Đã hủy';
      statusClass = 'cancelled';
    }

    const prescriptionImages = Array.isArray(doc.prescriptionImages) 
      ? doc.prescriptionImages.filter((img: any) => img && typeof img === 'string')
      : [];
    
    const medicineNames = Array.isArray(doc.medicineNames)
      ? doc.medicineNames.filter((name: any) => name && typeof name === 'string')
      : [];

    const specList: SpecListItem[] = [
      { label: 'ID Người dùng', value: doc.userId || '—', field: 'userId', mono: true, readonly: true },
      { label: 'Họ và tên', value: doc.fullName || '—', field: 'fullName' },
      { label: 'Số điện thoại', value: doc.phoneNumber || '—', field: 'phoneNumber' },
      { label: 'Ghi chú', value: doc.notes || '—', field: 'notes' },
      { label: 'Trạng thái', value: statusLabel, field: 'status', readonly: true }
    ];

    const timeline: Array<{ label: string; value: string; icon: string }> = [
      { label: 'Ngày tạo', value: formatDate(doc.createdAt), icon: 'event' },
      { label: 'Cập nhật lần cuối', value: formatDate(doc.updatedAt), icon: 'update' }
    ];

    return {
      id: doc._id?.toString?.() || doc.id || this.documentId(),
      userId: doc.userId,
      fullName: doc.fullName || '—',
      phoneNumber: doc.phoneNumber || '—',
      notes: doc.notes || '',
      prescriptionImages,
      medicineNames,
      status: doc.status || 'pending',
      statusLabel,
      statusClass,
      createdAt: formatDate(doc.createdAt),
      updatedAt: formatDate(doc.updatedAt),
      specList,
      timeline
    };
  });

  readonly highlightedFields = computed(() => {
    const doc = this.document();
    if (!doc) {
      return [] as Array<{ key: string; value: any }>;
    }

    if (this.isOrderCollection() || this.isPharmacistChatCollection()) {
      return [];
    }

    const priority = ['_id', 'orderNumber', 'name', 'title', 'slug', 'email', 'phone', 'status', 'createdAt', 'updatedAt'];
    const highlight: Array<{ key: string; value: any }> = [];

    priority.forEach(key => {
      if (doc[key] !== undefined) {
        highlight.push({ key, value: doc[key] });
      }
    });

    if (highlight.length === 0) {
      Object.entries(doc)
        .slice(0, 8)
        .forEach(([key, value]) => highlight.push({ key, value }));
    }

    return highlight;
  });

  constructor() {
    effect(() => {
      void this.initialize();
    });

    // Auto open edit drawer if query param ?edit=1
    effect(() => {
      if (this.openEditSignal() && !this.isCreate()) {
        this.toggleEditDrawer(true);
      }
    });

    effect(() => {
      // Trigger scroll when messages change
      const chat = this.pharmacistChatView();
      if (chat && this.isPharmacistChatCollection()) {
        setTimeout(() => this.scrollChatToBottom(), 100);
      }
    });

    // Load categories for create mode
    effect(() => {
      if (this.isCreate() && this.isCategoryCollection()) {
        void this.loadAvailableCategories();
      }
    });
  }

  // Inline section edit helpers
  isEditing(field: string): boolean {
    return !!this.sectionEdit()[field];
  }

  startEdit(field: string, initialValue?: string): void {
    const current = { ...this.sectionEdit() };
    current[field] = true;
    this.sectionEdit.set(current);

    // Initialize draft with current document value
    const draft = { ...this.sectionDraft() };
    const doc: any = this.document();
    if (initialValue !== undefined) {
      draft[field] = initialValue;
    } else if (doc && typeof doc[field] === 'string') {
      draft[field] = doc[field];
    } else if (doc && Array.isArray(doc[field])) {
      draft[field] = doc[field]
        .map((item: any) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object') {
            if (typeof item.text === 'string') {
              return item.text;
            }
            const firstValue = Object.values(item).find((value) => typeof value === 'string');
            return firstValue ? String(firstValue) : JSON.stringify(item);
          }
          return String(item ?? '');
        })
        .filter(Boolean)
        .join('\n');
    } else if (doc && doc[field] && typeof doc[field] === 'object') {
      const value = doc[field];
      if (typeof value.text === 'string') {
        draft[field] = value.text;
      } else {
        draft[field] = JSON.stringify(value, null, 2);
      }
    } else if (doc && doc[field] !== undefined && doc[field] !== null) {
      draft[field] = String(doc[field]);
    } else {
      draft[field] = '';
    }
    this.sectionDraft.set(draft);
  }

  cancelEdit(field: string): void {
    const current = { ...this.sectionEdit() };
    delete current[field];
    this.sectionEdit.set(current);
  }

  applyEdit(field: InlineEditableField, value: string): void {
    const doc = this.document();
    if (!doc) return;
    const patched = { ...doc, [field]: value };
    this.document.set(patched);
    this.jsonValue.set(JSON.stringify(patched, null, 2));
    const current = { ...this.sectionEdit() };
    delete current[field];
    this.sectionEdit.set(current);
  }

  getDraft(field: string): string {
    return this.sectionDraft()[field] ?? '';
  }

  setDraft(field: string, value: string): void {
    const draft = { ...this.sectionDraft() };
    draft[field] = value;
    this.sectionDraft.set(draft);
  }

  // Image gallery management
  readonly imageGalleryList = computed(() => {
    const gallery = this.galleryArray();
    return Array.isArray(gallery) ? gallery.filter(url => url && url.trim() !== '') : [];
  });

  updateNewImageUrl(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newImageUrl.set(input.value);
  }

  addImageUrl(): void {
    const url = this.newImageUrl().trim();
    if (!url) return;

    const current = [...this.galleryArray()];
    if (!current.includes(url)) {
      current.push(url);
      this.galleryArray.set(current);
      this.newImageUrl.set('');
    }
  }

  removeImageUrl(index: number): void {
    const current = [...this.galleryArray()];
    current.splice(index, 1);
    this.galleryArray.set(current);
  }

  updateImageUrl(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const url = input.value.trim();
    const current = [...this.galleryArray()];
    if (index >= 0 && index < current.length) {
      current[index] = url;
      this.galleryArray.set(current.filter(u => u !== ''));
    }
  }

  setMainImage(url: string): void {
    this.productForm.patchValue({ image: url });
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const errorDiv = img.nextElementSibling as HTMLElement;
      if (errorDiv) {
        errorDiv.style.display = 'flex';
      }
    }
  }

  trackByGalleryIndex(index: number, img: string): string {
    return `${index}-${img}`;
  }

  // Spec fields inline editing
  isEditingSpecs(): boolean {
    return this.specEditMode();
  }

  isEditingSpec(field: string): boolean {
    return this.isEditingSpecs() && !!this.specEditFields()[field];
  }

  toggleSpecEditMode(): void {
    if (this.specEditMode()) {
      this.cancelSpecEdit();
    } else {
      this.specEditMode.set(true);
      // Initialize all spec fields for editing
      const doc = this.document();
      if (doc) {
        if (this.isProductCollection()) {
          const drafts: { [key: string]: string | number | boolean | null } = {
            stock: typeof doc.stock === 'number' ? doc.stock : (typeof doc.quantity === 'number' ? doc.quantity : null),
            unit: doc.unit || '',
            country: doc.country || '',
            slug: doc.slug || ''
          };
          this.specDrafts.set(drafts);
          this.specEditFields.set({ stock: true, unit: true, country: true, slug: true });
        } else if (this.isCategoryCollection()) {
          const drafts: { [key: string]: string | number | boolean | null } = {
            slug: doc.slug || '',
            displayOrder: typeof doc.display_order === 'number' ? doc.display_order : (typeof doc.displayOrder === 'number' ? doc.displayOrder : null)
          };
          this.specDrafts.set(drafts);
          this.specEditFields.set({ slug: true, displayOrder: true });
        } else if (this.isBannerCollection()) {
          // Initialize banner spec fields
          const drafts: { [key: string]: string | number | boolean | null } = {
            name: doc.name || '',
            type: doc.type || 'hero',
            position: doc.position || 'homepage',
            order: typeof doc.order === 'number' ? doc.order : 0,
            status: doc.status || 'active',
            image: doc.image || '',
            backgroundImage: doc.backgroundImage || '',
            slideImage: doc.slideImage || '',
            title: doc.title || '',
            subtitle: doc.subtitle || '',
            buttonText: doc.buttonText || '',
            dateRange: doc.dateRange || '',
            productId: doc.productId || '',
            link: doc.link || ''
          };
          this.specDrafts.set(drafts);
          this.specEditFields.set({
            name: true,
            type: true,
            position: true,
            order: true,
            status: true,
            image: true,
            backgroundImage: true,
            slideImage: true,
            title: true,
            subtitle: true,
            buttonText: true,
            dateRange: true,
            productId: true,
            link: true
          });
        } else if (this.isPromotionCollection()) {
          // Initialize voucher spec fields
          const drafts: { [key: string]: string | number | boolean | null } = {
            code: doc.code || '',
            discountPercent: typeof doc.discountPercent === 'number' ? doc.discountPercent : (typeof doc.discount_percent === 'number' ? doc.discount_percent : 0),
            discount: typeof doc.discount === 'number' ? doc.discount : null,
            minOrderAmount: typeof doc.minOrderAmount === 'number' ? doc.minOrderAmount : (typeof doc.min_order_amount === 'number' ? doc.min_order_amount : 0),
            maxUsage: typeof doc.maxUsage === 'number' ? doc.maxUsage : (typeof doc.max_usage === 'number' ? doc.max_usage : null)
          };
          this.specDrafts.set(drafts);
          this.specEditFields.set({ code: true, discountPercent: true, discount: true, minOrderAmount: true, maxUsage: true });
        } else if (this.isBlogCollection()) {
          const drafts: { [key: string]: string | number | boolean | null } = {
            slug: doc.slug || doc.cleanSlug || '',
            status: doc.status || (doc.isVisible === false ? 'hidden' : 'published'),
            url: doc.url || doc.detailUrl || '',
            originalUrl: doc.originalUrl || doc.original_url || '',
            tags: Array.isArray(doc.tags) ? doc.tags.map((tag: any) => (typeof tag === 'string' ? tag : tag?.title || tag?.name || '')).filter(Boolean).join(', ') : Array.isArray(doc.hashtags) ? doc.hashtags.map((item: any) => (typeof item === 'string' ? item.replace(/^#/, '') : item?.title || '')).filter(Boolean).join(', ') : ''
          };
          this.specDrafts.set(drafts);
          this.specEditFields.set({ slug: true, status: true, url: true, originalUrl: true, tags: true });
        } else if (this.isDiseaseCollection()) {
          const drafts: { [key: string]: string | number | boolean | null } = {
            slug: doc.slug || '',
            isVisible: doc.isVisible === false ? 'false' : 'true',
            url: doc.url || '',
            originalUrl: doc.originalUrl || doc.original_url || ''
          };
          this.specDrafts.set(drafts);
          this.specEditFields.set({ slug: true, isVisible: true, url: true, originalUrl: true });
        } else if (this.isUserCollection()) {
          const drafts: { [key: string]: string | number | boolean | null } = {
            mail: doc.mail || doc.email || '',
            phone: doc.phone || doc.profile?.phone || '',
            roles: Array.isArray(doc.roles) ? doc.roles.join(', ') : (typeof doc.roles === 'string' ? doc.roles : ''),
            status: doc.status || '',
            gender: doc.profile?.gender || '',
            birthday: doc.profile?.birthday || doc.profile?.dob || doc.profile?.dateOfBirth || '',
            address: doc.profile?.address || doc.address || ''
          };
          this.specDrafts.set(drafts);
          this.specEditFields.set({ mail: true, phone: true, roles: true, status: true, gender: true, birthday: true, address: true });
        }
      }
    }
  }

  cancelSpecEdit(): void {
    this.specEditMode.set(false);
    this.specEditFields.set({});
    this.specDrafts.set({});
  }

  getSpecDraft(field: string): string | number | boolean | null {
    return this.specDrafts()[field] ?? '';
  }

  setSpecDraft(field: string, value: string | number | boolean | null): void {
    const drafts = { ...this.specDrafts() };
    if (field === 'stock') {
      drafts[field] = value === '' || value === null ? null : Number(value);
    } else if (field === 'discountPercent' || field === 'discount' || field === 'minOrderAmount' || field === 'maxUsage') {
      // Voucher numeric fields
      drafts[field] = value === '' || value === null ? null : (typeof value === 'number' ? value : Number(value));
    } else if (field === 'isVisible') {
      const normalized = typeof value === 'string' ? value : (value ? 'true' : 'false');
      drafts[field] = normalized === 'false' ? 'false' : 'true';
    } else if (field === 'roles') {
      drafts[field] = typeof value === 'string' ? value : '';
    } else if (field === 'status') {
      drafts[field] = typeof value === 'string' ? value : '';
    } else {
      drafts[field] = value === '' ? '' : value;
    }
    this.specDrafts.set(drafts);
  }

  async saveSpecs(): Promise<void> {
    const key = this.collectionKey();
    if (!key || this.isCreate()) {
      return;
    }

    // Try to get ID from document first, fallback to route param
    const doc = this.document();
    let id = doc?._id ? String(doc._id) : this.documentId();
    
    // Trim and validate ID
    id = id?.trim();
    if (!id || id === 'new' || id === 'create' || id.length < 12) {
      this.notifier.showError('ID sản phẩm không hợp lệ');
      return;
    }

    const drafts = this.specDrafts();
    const payload: any = {};
    
    // Product fields
    if ('stock' in drafts && this.isProductCollection()) {
      payload.stock = drafts['stock'] === null ? null : Number(drafts['stock']);
    }
    if ('unit' in drafts && this.isProductCollection()) {
      payload.unit = drafts['unit'] || '';
    }
    if ('country' in drafts && this.isProductCollection()) {
      payload.country = drafts['country'] || '';
    }
    
    // Common fields
    if ('slug' in drafts) {
      payload.slug = drafts['slug'] || '';
    }
    
    // Category fields
    if ('displayOrder' in drafts && this.isCategoryCollection()) {
      payload.display_order = drafts['displayOrder'] === null ? null : Number(drafts['displayOrder']);
    }
    
    // Banner fields
    if (this.isBannerCollection()) {
      if ('name' in drafts) payload.name = drafts['name'] || '';
      if ('type' in drafts) payload.type = drafts['type'] || 'hero';
      if ('position' in drafts) payload.position = drafts['position'] || 'homepage';
      if ('order' in drafts) payload.order = drafts['order'] === null ? 0 : Number(drafts['order']);
      if ('status' in drafts) payload.status = drafts['status'] || 'active';
      if ('image' in drafts) payload.image = drafts['image'] || '';
      if ('backgroundImage' in drafts) payload.backgroundImage = drafts['backgroundImage'] || '';
      if ('slideImage' in drafts) payload.slideImage = drafts['slideImage'] || '';
      if ('title' in drafts) payload.title = drafts['title'] || '';
      if ('subtitle' in drafts) payload.subtitle = drafts['subtitle'] || '';
      if ('buttonText' in drafts) payload.buttonText = drafts['buttonText'] || '';
      if ('dateRange' in drafts) payload.dateRange = drafts['dateRange'] || '';
      if ('productId' in drafts) payload.productId = drafts['productId'] || '';
      if ('link' in drafts) payload.link = drafts['link'] || '';
      
      // Handle badge1 and badge2
      if ('badge1Text' in drafts || 'badge1Discount' in drafts) {
        const badge1Text = drafts['badge1Text'] || '';
        const badge1Discount = drafts['badge1Discount'] || '';
        if (badge1Text || badge1Discount) {
          payload.badge1 = { text: badge1Text, discount: badge1Discount };
        } else {
          payload.badge1 = null;
        }
      }
      if ('badge2Text' in drafts || 'badge2Discount' in drafts) {
        const badge2Text = drafts['badge2Text'] || '';
        const badge2Discount = drafts['badge2Discount'] || '';
        if (badge2Text || badge2Discount) {
          payload.badge2 = { text: badge2Text, discount: badge2Discount };
        } else {
          payload.badge2 = null;
        }
      }
      
      payload.isActive = payload.status === 'active';
      payload.updatedAt = new Date();
    }
    
    // Voucher fields
    if ('code' in drafts && this.isPromotionCollection()) {
      payload.code = drafts['code'] || '';
    }
    if ('discountPercent' in drafts && this.isPromotionCollection()) {
      payload.discountPercent = Number(drafts['discountPercent'] || 0);
    }
    if ('discount' in drafts && this.isPromotionCollection()) {
      payload.discount = drafts['discount'] === null ? undefined : Number(drafts['discount']);
    }
    if ('minOrderAmount' in drafts && this.isPromotionCollection()) {
      payload.minOrderAmount = Number(drafts['minOrderAmount'] || 0);
    }
    if ('maxUsage' in drafts && this.isPromotionCollection()) {
      payload.maxUsage = drafts['maxUsage'] === null ? undefined : Number(drafts['maxUsage']);
    }

    // Blog fields
    if (this.isBlogCollection()) {
      if ('status' in drafts) {
        payload.status = drafts['status'] || '';
      }
      if ('url' in drafts) {
        payload.url = drafts['url'] || '';
      }
      if ('originalUrl' in drafts) {
        const original = drafts['originalUrl'] || '';
        payload.originalUrl = original;
        payload.original_url = original;
      }
      if ('tags' in drafts) {
        const rawTags = drafts['tags'];
        if (typeof rawTags === 'string') {
          payload.tags = rawTags.split(',').map(tag => tag.trim()).filter(Boolean);
        }
      }
    }

    // Disease fields
    if (this.isDiseaseCollection()) {
      if ('isVisible' in drafts) {
        payload.isVisible = drafts['isVisible'] === 'false' ? false : true;
      }
      if ('url' in drafts) {
        payload.url = drafts['url'] || '';
      }
      if ('originalUrl' in drafts) {
        const original = drafts['originalUrl'] || '';
        payload.originalUrl = original;
        payload.original_url = original;
      }
    }

    // User fields
    if (this.isUserCollection()) {
      if ('mail' in drafts) {
        payload.mail = drafts['mail'] || '';
      }
      if ('phone' in drafts) {
        payload.phone = drafts['phone'] || '';
      }
      if ('status' in drafts) {
        payload.status = drafts['status'] || '';
      }
      if ('roles' in drafts) {
        const rawRoles = drafts['roles'];
        if (typeof rawRoles === 'string') {
          payload.roles = rawRoles.split(',').map(role => role.trim()).filter(Boolean);
        }
      }
      if ('gender' in drafts || 'birthday' in drafts || 'address' in drafts) {
        payload.profile = { ...(doc?.profile || {}) };
        if ('gender' in drafts) {
          payload.profile.gender = drafts['gender'] || '';
        }
        if ('birthday' in drafts) {
          payload.profile.birthday = drafts['birthday'] || '';
        }
        if ('address' in drafts) {
          payload.profile.address = drafts['address'] || '';
        }
      }
    }

    // Optimistic update - update local state immediately
    const currentDoc = this.document();
    if (currentDoc) {
      const updatedDoc = { ...currentDoc, ...payload };
      this.document.set(updatedDoc);
      this.jsonValue.set(JSON.stringify(updatedDoc, null, 2));
    }

    // Try to save with multiple ID formats
    const idAttempts = [
      id, // Original ID
      doc?._id ? String(doc._id) : id, // From document._id
      this.documentId() // From route
    ].filter((attemptId, index, self) => attemptId && self.indexOf(attemptId) === index); // Remove duplicates

    let saved = false;
    let lastError: any = null;

    for (const attemptId of idAttempts) {
      if (saved) break;
      
      try {
        const response = await firstValueFrom(this.api.updateDocument<any>(key, attemptId.trim(), payload));
        this.document.set(response.data);
        this.jsonValue.set(JSON.stringify(response.data, null, 2));
        saved = true;
        this.notifier.showSuccess('Đã cập nhật thông số sản phẩm');
        this.cancelSpecEdit();
      } catch (error: any) {
        lastError = error;
        // Continue to next attempt
      }
    }

    // If all attempts failed, show warning but keep optimistic update
    if (!saved) {
      this.notifier.showWarning('Đã cập nhật local nhưng không thể đồng bộ với server. Vui lòng tải lại trang để kiểm tra.');
    }
  }

  async applyInline(field: InlineEditableField): Promise<void> {
    const value = this.sectionDraft()[field] ?? '';
    const key = this.collectionKey();
    
    // Try to get ID from document first, fallback to route param
    const doc = this.document();
    let id = doc?._id ? String(doc._id) : this.documentId();
    
    // Trim and validate ID
    id = id?.trim();
    if (!id || id === 'new' || id === 'create' || id.length < 12) {
      this.notifier.showError('ID sản phẩm không hợp lệ');
      return;
    }

    // Optimistic update locally
    this.applyEdit(field, value);

    // Try to save with multiple ID formats
    const idAttempts = [
      id, // Original ID
      doc?._id ? String(doc._id) : id, // From document._id
      this.documentId() // From route
    ].filter((attemptId, index, self) => attemptId && self.indexOf(attemptId) === index); // Remove duplicates

    let saved = false;
    let lastError: any = null;

    for (const attemptId of idAttempts) {
      if (saved) break;
      
      try {
        const payload: any = { [field]: value };
        const response = await firstValueFrom(this.api.updateDocument<any>(key, attemptId.trim(), payload));
        this.document.set(response.data);
        this.jsonValue.set(JSON.stringify(response.data, null, 2));
        saved = true;
        this.notifier.showSuccess('Đã lưu thay đổi');
      } catch (error: any) {
        lastError = error;
        // Continue to next attempt
      }
    }

    // If all attempts failed, show warning but keep optimistic update
    if (!saved) {
      this.notifier.showWarning('Đã cập nhật local nhưng không thể đồng bộ với server. Vui lòng tải lại trang để kiểm tra.');
    }
  }

  async applyInlineOrder(field: InlineEditableField): Promise<void> {
    const value = this.sectionDraft()[field] ?? '';

    const doc = this.document();
    const idCandidates = [doc?.orderNumber, doc?._id, doc?.id, this.documentId()]
      .map(candidate => this.normalizeId(candidate))
      .filter((candidate, index, self) => candidate && self.indexOf(candidate) === index);

    if (idCandidates.length === 0) {
      this.notifier.showError('Không tìm thấy ID đơn hàng');
      return;
    }

    // Optimistic update locally
    this.applyEdit(field, value);

    const payload: any = { [field]: value };

    let saved = false;
    let lastError: any = null;

    for (const candidate of idCandidates) {
      if (saved) break;
      try {
        const response = await firstValueFrom(this.api.updateDocument<any>('orders', candidate, payload));
        this.document.set(response.data);
        this.jsonValue.set(JSON.stringify(response.data, null, 2));
        saved = true;
        this.notifier.showSuccess('Đã lưu ghi chú');
      } catch (error: any) {
        lastError = error;
      }
    }

    if (!saved) {
      console.error('[Order] applyInlineOrder error', lastError);
      this.notifier.showError('Không thể lưu ghi chú');
      await this.loadDocument();
    }
  }

  async approveReturnRequest(): Promise<void> {
    const order = this.orderView();
    if (!order) {
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn chấp nhận yêu cầu trả hàng này?')) {
      return;
    }

    try {
      const doc = this.document();
      const orderId = doc?.orderNumber || doc?._id || this.documentId();
      if (!orderId) {
        this.notifier.showError('Không tìm thấy ID đơn hàng');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(orderId)}/return/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.notifier.showSuccess('Đã chấp nhận yêu cầu trả hàng');
        await this.refresh();
      } else {
        this.notifier.showError(data.error || 'Không thể chấp nhận yêu cầu trả hàng');
      }
    } catch (error: any) {
      console.error('[Order] approveReturnRequest unexpected error', error);
      this.notifier.showError(error?.error?.message || error?.message || 'Không thể chấp nhận yêu cầu trả hàng');
    }
  }

  async rejectReturnRequest(): Promise<void> {
    const order = this.orderView();
    if (!order) {
      return;
    }

    const reason = prompt('Nhập lý do từ chối yêu cầu trả hàng:');
    if (reason === null) {
      return; // User cancelled
    }

    try {
      const doc = this.document();
      const orderId = doc?.orderNumber || doc?._id || this.documentId();
      if (!orderId) {
        this.notifier.showError('Không tìm thấy ID đơn hàng');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/orders/${encodeURIComponent(orderId)}/return/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || 'Yêu cầu trả hàng bị từ chối' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.notifier.showSuccess('Đã từ chối yêu cầu trả hàng');
        await this.refresh();
      } else {
        this.notifier.showError(data.error || 'Không thể từ chối yêu cầu trả hàng');
      }
    } catch (error: any) {
      console.error('[Order] rejectReturnRequest unexpected error', error);
      this.notifier.showError(error?.error?.message || error?.message || 'Không thể từ chối yêu cầu trả hàng');
    }
  }

  openConfirmOrderModal(): void {
    this.showConfirmOrderModal.set(true);
  }

  closeConfirmOrderModal(): void {
    if (this.confirmingOrder()) {
      return;
    }
    this.showConfirmOrderModal.set(false);
  }

  async confirmOrder(): Promise<void> {
    if (this.confirmingOrder()) {
      return;
    }

    const doc = this.document();
    const idCandidates = [doc?.orderNumber, doc?._id, doc?.id, this.documentId()]
      .map(candidate => this.normalizeId(candidate))
      .filter((candidate, index, self) => candidate && self.indexOf(candidate) === index);
    
    if (idCandidates.length === 0) {
      this.notifier.showError('Không tìm thấy ID đơn hàng');
      return;
    }

    this.confirmingOrder.set(true);

    try {
      const payload = {
        status: 'shipping',
        confirmedAt: new Date(),
        shippedAt: new Date(),
        expectedDeliveryAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      };

      let saved = false;
      let lastError: any = null;

      for (const candidate of idCandidates) {
        if (saved) break;
        try {
          const response = await firstValueFrom(this.api.updateDocument<any>('orders', candidate, payload));
          this.document.set(response.data);
          this.jsonValue.set(JSON.stringify(response.data, null, 2));
          saved = true;
          this.notifier.showSuccess('Đã xác nhận đơn hàng. Hệ thống sẽ tự động chuyển sang "Đã giao" sau 2 ngày.');
        } catch (error: any) {
          lastError = error;
        }
      }

      if (!saved) {
        console.error('[Order] confirmOrder error', lastError);
        this.notifier.showError('Không thể xác nhận đơn hàng');
      }
    } catch (error: any) {
      console.error('[Order] confirmOrder unexpected error', error);
      this.notifier.showError('Không thể xác nhận đơn hàng');
    } finally {
      this.confirmingOrder.set(false);
      this.showConfirmOrderModal.set(false);
    }
  }

  get title(): string {
    if (this.isCreate()) {
      return `Tạo ${this.collectionMeta()?.label || this.collectionKey()}`;
    }
    return `Chi tiết ${this.collectionMeta()?.label || this.collectionKey()}`;
  }

  toggleEditDrawer(open: boolean): void {
    this.showEditDrawer.set(open);
    if (open) {
      this.patchFormFromDocument();
      // Load categories for parent dropdown if editing category
      if (this.isCategoryCollection()) {
        void this.loadAvailableCategories();
      }
    }
  }

  async submitProductForm(): Promise<void> {
    if (!this.productForm.valid) {
      this.productForm.markAllAsTouched();
      this.notifier.showWarning('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    const doc = this.document();
    if (!doc) {
      this.notifier.showError('Chưa tải xong dữ liệu');
      return;
    }

    try {
      let patch: any;

      if (this.isPromotionCollection()) {
        // Voucher form submission
        const formValue = this.productForm.getRawValue();
        patch = {
          ...doc,
          code: formValue.code,
          title: formValue.title,
          description: formValue.voucherDescription || '', // Use voucherDescription for vouchers
          discountPercent: Number(formValue.discountPercent || 0),
          discount: formValue.voucherDiscount ? Number(formValue.voucherDiscount) : undefined,
          minOrderAmount: Number(formValue.minOrderAmount || 0),
          maxUsage: formValue.maxUsage ? Number(formValue.maxUsage) : undefined,
          isActive: formValue.isActive === true
        };

        // Handle datetime-local inputs
        if (formValue.startsAt) {
          patch.startsAt = new Date(formValue.startsAt);
        } else {
          patch.startsAt = undefined;
        }

        if (formValue.expiresAt) {
          patch.expiresAt = new Date(formValue.expiresAt);
        } else {
          patch.expiresAt = undefined;
        }
      } else if (this.isProductCollection()) {
        // Product form submission
        const formValue = this.productForm.getRawValue();
        
        // Convert tags string to array
        const tagsArray = formValue.tags 
          ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
          : [];

        patch = {
          ...doc,
          name: formValue.name,
          brand: formValue.brand || '',
          sku: formValue.sku || '',
          slug: formValue.slug || '',
          price: Number(formValue.price || 0),
          discount: Number(formValue.discount || 0),
          stock: formValue.stock === null ? doc.stock : Number(formValue.stock),
          unit: formValue.unit || 'Hộp',
          country: formValue.country || '',
          status: formValue.status || '',
          image: formValue.image || '',
          gallery: this.imageGalleryList(),
          // Product detail fields
          description: formValue.description || '',
          usage: formValue.usage || '',
          ingredients: formValue.ingredients || '',
          warnings: formValue.warnings || '',
          tags: tagsArray
        };
      } else {
        // Generic form submission
        patch = {
          ...doc,
          ...this.productForm.getRawValue()
        };
      }

      this.jsonValue.set(JSON.stringify(patch, null, 2));
      await this.save();
      this.toggleEditDrawer(false);
      await this.refresh();
    } catch (error: any) {
      this.notifier.showError(error?.message || 'Không thể lưu thông tin');
    }
  }

  formatDate(value: string | Date | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = value instanceof Date ? value : new Date(value);
    return this.datePipe.transform(date, 'dd/MM/yyyy HH:mm') ?? String(value);
  }

  async refresh(): Promise<void> {
    await this.loadDocument();
  }

  openImageInNewTab(imageUrl: string): void {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  }

  async save(): Promise<void> {
    if (this.saving()) {
      return;
    }

    const key = this.collectionKey();
    if (!key) {
      return;
    }

    if (this.isCreate()) {
      if (!this.collectionMeta()?.allowCreate) {
        this.notifier.showError('Collection này không cho phép tạo mới');
        return;
      }
    } else if (!this.collectionMeta()?.allowUpdate) {
      this.notifier.showError('Collection này không cho phép cập nhật');
      return;
    }

    let payload: any;
    try {
      payload = this.parseJson();
    } catch (error: any) {
      this.notifier.showError(error?.message || 'JSON không hợp lệ');
      return;
    }

    this.saving.set(true);
    try {
      if (this.isCreate()) {
        const response = await firstValueFrom(this.api.createDocument(key, payload));
        this.notifier.showSuccess('Tạo bản ghi thành công');
        const newId = response?.data?._id || response?.data?.orderNumber;
        if (newId) {
          await this.router.navigate(['../', newId], { relativeTo: this.route });
        } else {
          await this.refresh();
        }
      } else {
        // Try to get ID from document first, fallback to route param
        const doc = this.document();
        let id = doc?._id ? String(doc._id) : this.documentId();
        
        // Trim and validate ID
        id = id?.trim();
        if (!id || id === 'new' || id === 'create' || id.length < 12) {
          this.notifier.showError('ID sản phẩm không hợp lệ');
          return;
        }

        // Optimistic update - update local state immediately
        const currentDoc = this.document();
        if (currentDoc) {
          const updatedDoc = { ...currentDoc, ...payload };
          this.document.set(updatedDoc);
          this.jsonValue.set(JSON.stringify(updatedDoc, null, 2));
        }

        // Try to save with multiple ID formats
        const idAttempts = [
          id, // Original ID
          doc?._id ? String(doc._id) : id, // From document._id
          this.documentId() // From route
        ].filter((attemptId, index, self) => attemptId && self.indexOf(attemptId) === index); // Remove duplicates

        let saved = false;
        let lastError: any = null;

        for (const attemptId of idAttempts) {
          if (saved) break;
          
          try {
            const response = await firstValueFrom(this.api.updateDocument(key, attemptId.trim(), payload));
            this.document.set(response.data);
            this.jsonValue.set(JSON.stringify(response.data, null, 2));
            saved = true;
            this.notifier.showSuccess('Cập nhật thành công');
          } catch (error: any) {
            lastError = error;
            // Continue to next attempt
          }
        }

        // If all attempts failed, show warning but keep optimistic update
        if (!saved) {
          this.notifier.showWarning('Đã cập nhật local nhưng không thể đồng bộ với server. Vui lòng tải lại trang để kiểm tra.');
        }
      }
    } catch (error: any) {
      console.error('[CollectionDetail] save error', error);
      this.notifier.showError(error?.message || 'Không thể lưu dữ liệu');
    } finally {
      this.saving.set(false);
    }
  }

  async delete(): Promise<void> {
    if (this.deleting() || this.isCreate()) {
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
      return;
    }

    const key = this.collectionKey();
    const id = this.documentId();
    if (!key || !id) {
      return;
    }

    this.deleting.set(true);
    try {
      await firstValueFrom(this.api.deleteDocument(key, id));
      this.notifier.showSuccess('Đã xóa bản ghi');
      await this.router.navigate(['../../', key], { relativeTo: this.route });
    } catch (error: any) {
      console.error('[CollectionDetail] delete error', error);
      this.notifier.showError(error?.message || 'Không thể xóa bản ghi');
    } finally {
      this.deleting.set(false);
    }
  }

  private parseJson(): any {
    const value = this.jsonValue().trim();
    if (!value) {
      return {};
    }

    try {
      return JSON.parse(value);
    } catch (error: any) {
      throw new Error('JSON không hợp lệ. Vui lòng kiểm tra lại cấu trúc.');
    }
  }

  formatJson(): void {
    try {
      const parsed = this.parseJson();
      this.jsonValue.set(JSON.stringify(parsed, null, 2));
      this.notifier.showSuccess('Đã format JSON');
    } catch (error: any) {
      this.notifier.showError(error?.message || 'JSON không hợp lệ');
    }
  }

  toggleJsonModal(open: boolean): void {
    this.showJsonModal.set(open);
  }

  private patchFormFromDocument(): void {
    const doc = this.document();
    if (!doc) {
      return;
    }

    if (this.isCategoryCollection()) {
      this.patchCategoryFormFromDocument();
    } else if (this.isBlogCollection()) {
      this.patchBlogFormFromDocument();
    } else if (this.isDiseaseCollection()) {
      this.patchDiseaseFormFromDocument();
    } else if (this.isBannerCollection()) {
      this.patchBannerFormFromDocument();
    } else if (this.isProductCollection()) {
      // Convert tags array to comma-separated string
      const tagsString = Array.isArray(doc.tags) 
        ? doc.tags.join(', ') 
        : (typeof doc.tags === 'string' ? doc.tags : '');

      this.productForm.patchValue({
        name: doc.name ?? '',
        brand: doc.brand ?? '',
        sku: doc.sku ?? '',
        slug: doc.slug ?? '',
        price: Number(doc.price) || 0,
        discount: Number(doc.discount) || 0,
        stock: typeof doc.stock === 'number' ? doc.stock : (Number.isFinite(Number(doc.quantity)) ? Number(doc.quantity) : null),
        unit: doc.unit ?? 'Hộp',
        country: doc.country ?? '',
        status: doc.status ?? '',
        image: doc.image || doc.thumbnail || (Array.isArray(doc.gallery) && doc.gallery.length > 0 ? doc.gallery[0] : '') || '',
        // Product detail fields
        description: doc.description ?? '',
        usage: doc.usage ?? '',
        ingredients: doc.ingredients ?? '',
        warnings: doc.warnings ?? '',
        tags: tagsString
      }, { emitEvent: false });
    } else if (this.isPromotionCollection()) {
      // Format datetime for input[type="datetime-local"]
      const formatDateTimeLocal = (date: Date | string | undefined): string => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      this.productForm.patchValue({
        code: doc.code ?? '',
        title: (doc.title || doc.name) ?? '',
        voucherDescription: doc.description ?? '', // Use voucherDescription for vouchers
        discountPercent: typeof doc.discountPercent === 'number' ? doc.discountPercent : (typeof doc.discount_percent === 'number' ? doc.discount_percent : 0),
        voucherDiscount: typeof doc.discount === 'number' ? doc.discount : undefined,
        minOrderAmount: typeof doc.minOrderAmount === 'number' ? doc.minOrderAmount : (typeof doc.min_order_amount === 'number' ? doc.min_order_amount : 0),
        maxUsage: typeof doc.maxUsage === 'number' ? doc.maxUsage : (typeof doc.max_usage === 'number' ? doc.max_usage : undefined),
        startsAt: formatDateTimeLocal(doc.startsAt),
        expiresAt: formatDateTimeLocal(doc.expiresAt),
        isActive: doc.isActive === true || doc.is_active === true
      }, { emitEvent: false });
    }

    // Load gallery - handle both array and string formats
    let gallery: string[] = [];
    if (Array.isArray(doc.gallery)) {
      gallery = doc.gallery;
    } else if (typeof doc.gallery === 'string' && doc.gallery.trim() !== '') {
      try {
        const parsed = JSON.parse(doc.gallery);
        if (Array.isArray(parsed)) {
          gallery = parsed;
        }
      } catch (e) {
        // Try to parse as Python-style array string ['url1', 'url2']
        const match = doc.gallery.match(/'([^']+)'/g);
        if (match) {
          gallery = match.map((m: string) => m.replace(/'/g, ''));
        }
      }
    }
    
    if (gallery.length === 0 && Array.isArray(doc.images)) {
      gallery = doc.images;
    } else if (gallery.length === 0 && typeof doc.images === 'string' && doc.images.trim() !== '') {
      try {
        const parsed = JSON.parse(doc.images);
        if (Array.isArray(parsed)) {
          gallery = parsed;
        }
      } catch (e) {
        const match = doc.images.match(/'([^']+)'/g);
        if (match) {
          gallery = match.map((m: string) => m.replace(/'/g, ''));
        }
      }
    }
    
    this.galleryArray.set(gallery.filter((url: any) => url && typeof url === 'string' && url.trim() !== ''));
  }

  private async initialize(): Promise<void> {
    const key = this.collectionKey();
    if (!key) {
      return;
    }

    await this.store.ensureLoaded();
    if (!this.collectionMeta()) {
      this.error.set('Không tìm thấy tài nguyên hoặc bạn không có quyền truy cập.');
      return;
    }

    if (this.isCreate()) {
      if (!this.collectionMeta()?.allowCreate) {
        this.error.set('Collection không hỗ trợ tạo mới.');
        return;
      }
      this.document.set({});
      this.jsonValue.set(`{
  
}`);
      return;
    }

    await this.loadDocument();
  }

  private async loadDocument(): Promise<void> {
    const key = this.collectionKey();
    const id = this.documentId();
    if (!key || !id) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(this.api.getDocument<any>(key, id));
      this.document.set(response.data);
      this.jsonValue.set(JSON.stringify(response.data, null, 2));
      if (this.isPharmacistChatCollection()) {
        setTimeout(() => this.scrollChatToBottom(), 150);
      }
    } catch (error: any) {
      console.error('[CollectionDetail] loadDocument error', error);
      let message = 'Không thể tải dữ liệu';
      
      if (error?.status === 404) {
        message = `Không tìm thấy ${this.collectionMeta()?.label || 'tài nguyên'} với ID: ${id}`;
      } else if (error?.error?.message) {
        message = error.error.message;
      } else if (error?.message) {
        message = error.message;
      }
      
      this.error.set(message);
      this.notifier.showError(message);
    } finally {
      this.loading.set(false);
    }
  }

  private normalizeId(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'object') {
      if (typeof value.$oid === 'string') {
        return value.$oid.trim();
      }
      if (typeof value.id === 'string') {
        return value.id.trim();
      }
      if (typeof value._id === 'string') {
        return value._id.trim();
      }
      if (typeof value._id === 'object') {
        return this.normalizeId(value._id);
      }
    }
    return String(value).trim();
  }

  async sendPharmacistReply(): Promise<void> {
    const message = this.pharmacistReplyDraft().trim();
    if (!message) {
      this.notifier.showWarning('Vui lòng nhập nội dung trả lời');
      return;
    }
    if (this.sendingPharmacistReply()) {
      return;
    }

    const doc = this.document();
    const idCandidates = [doc?._id, doc?.id, this.documentId()]
      .map(candidate => this.normalizeId(candidate))
      .filter((candidate, index, self) => candidate && self.indexOf(candidate) === index);

    if (idCandidates.length === 0) {
      this.notifier.showError('Không tìm thấy ID phiên tư vấn');
      return;
    }

    this.sendingPharmacistReply.set(true);

    let saved = false;
    let lastError: any = null;

    try {
      for (const candidate of idCandidates) {
        if (saved) break;
        try {
          await firstValueFrom(this.api.respondPharmacistChat(candidate, message));
          saved = true;
        } catch (error: any) {
          lastError = error;
        }
      }

      if (!saved) {
        throw lastError || new Error('Không thể gửi phản hồi');
      }

      this.pharmacistReplyDraft.set('');
      this.notifier.showSuccess('Đã gửi phản hồi tới khách hàng');
      await this.loadDocument();
      setTimeout(() => this.scrollChatToBottom(), 150);
    } catch (error: any) {
      console.error('[PharmacistChat] send reply error', error);
      this.notifier.showError('Không thể gửi phản hồi');
    } finally {
      this.sendingPharmacistReply.set(false);
    }
  }

  private scrollChatToBottom(): void {
    if (!this.isPharmacistChatCollection()) {
      return;
    }
    const container = this.pharmacistChatMessages?.nativeElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  // Auto-generate slug from name
  public generateSlug(): void {
    const name = this.productForm.get('name')?.value || '';
    if (!name.trim()) {
      this.notifier.showWarning('Vui lòng nhập tên trước');
      return;
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove multiple hyphens

    this.productForm.patchValue({ slug });
    this.notifier.showSuccess('Đã tạo slug tự động');
  }

  // Auto-generate slug for category
  public generateCategorySlug(): void {
    const name = this.categoryForm.get('name')?.value || '';
    if (!name.trim()) {
      this.notifier.showWarning('Vui lòng nhập tên trước');
      return;
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove multiple hyphens

    this.categoryForm.patchValue({ slug });
    this.notifier.showSuccess('Đã tạo slug tự động');
  }

  // Load available categories for parent dropdown
  async loadAvailableCategories(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.api.getCollectionItems('categories', { page: 1, limit: 1000 })
      );
      const categories = (response.data || []).map((cat: any) => ({
        _id: cat._id || '',
        name: cat.name || '',
        level: Number(cat.level) || 1
      }));
      this.availableCategories.set(categories);
    } catch (error) {
      console.error('[CategoryForm] Load categories error:', error);
    }
  }

  // Submit category form
  async submitCategoryForm(): Promise<void> {
    if (!this.categoryForm.valid) {
      this.categoryForm.markAllAsTouched();
      this.notifier.showWarning('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    const doc = this.document();
    if (!doc) {
      this.notifier.showError('Chưa tải xong dữ liệu');
      return;
    }

    try {
      const formValue = this.categoryForm.getRawValue();
      const patch: any = {
        ...doc,
        name: formValue.name,
        slug: formValue.slug || '',
        level: Number(formValue.level) || 1,
        parentId: formValue.parentId || undefined,
        displayOrder: formValue.displayOrder !== null ? Number(formValue.displayOrder) : undefined,
        icon: formValue.icon || '',
        isActive: formValue.isActive === true,
        is_active: formValue.isActive === true,
        description: formValue.description || ''
      };

      this.jsonValue.set(JSON.stringify(patch, null, 2));
      await this.save();
      this.toggleEditDrawer(false);
      await this.refresh();
    } catch (error: any) {
      this.notifier.showError(error?.message || 'Không thể lưu thông tin danh mục');
    }
  }

  // Load category data into form
  patchCategoryFormFromDocument(): void {
    const doc = this.document();
    if (!doc || !this.isCategoryCollection()) {
      return;
    }

    this.categoryForm.patchValue({
      name: doc.name ?? '',
      slug: doc.slug ?? '',
      level: Number(doc.level) || 1,
      parentId: doc.parentId || doc.parent_id || '',
      displayOrder: typeof doc.display_order === 'number' ? doc.display_order : (typeof doc.displayOrder === 'number' ? doc.displayOrder : null),
      icon: doc.icon || '',
      isActive: doc.is_active === true || doc.isActive === true,
      description: doc.description || ''
    }, { emitEvent: false });
  }

  // Auto-generate slug for disease
  public generateDiseaseSlug(): void {
    const name = this.diseaseForm.get('name')?.value || '';
    if (!name.trim()) {
      this.notifier.showWarning('Vui lòng nhập tên bệnh lý trước');
      return;
    }

    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    this.diseaseForm.patchValue({ slug });
    this.notifier.showSuccess('Đã tạo slug tự động');
  }

  // Auto-generate slug for blog
  public generateBlogSlug(): void {
    const title = this.blogForm.get('title')?.value || '';
    if (!title.trim()) {
      this.notifier.showWarning('Vui lòng nhập tiêu đề trước');
      return;
    }

    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Remove multiple hyphens

      this.blogForm.patchValue({ slug });
      this.notifier.showSuccess('Đã tạo slug tự động');
  }

  // Submit disease form
  async submitDiseaseForm(): Promise<void> {
    if (!this.diseaseForm.valid) {
      this.diseaseForm.markAllAsTouched();
      this.notifier.showWarning('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    const doc = this.document();
    const isCreate = this.isCreate();

    try {
      const formValue = this.diseaseForm.getRawValue();
      
      // Parse comma-separated strings to arrays
      const categoriesArray = formValue.categories 
        ? formValue.categories.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0)
        : [];
      const alternateNamesArray = formValue.alternateNames 
        ? formValue.alternateNames.split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0)
        : [];

      const patch: any = isCreate ? {} : { ...doc };
      Object.assign(patch, {
        name: formValue.name,
        code: formValue.code || undefined,
        slug: formValue.slug || '',
        headline: formValue.headline || undefined,
        summary: formValue.summary || undefined,
        symptoms: formValue.symptoms || undefined,
        causes: formValue.causes || undefined,
        treatment: formValue.treatment || undefined,
        prevention: formValue.prevention || undefined,
        notes: formValue.notes || undefined,
        coverImage: formValue.coverImage || undefined,
        primary_image: formValue.coverImage || undefined,
        primaryImage: formValue.coverImage || undefined,
        image: formValue.coverImage || undefined,
        url: formValue.url || undefined,
        originalUrl: formValue.originalUrl || undefined,
        original_url: formValue.originalUrl || undefined,
        categories: categoriesArray.length > 0 ? categoriesArray : undefined,
        category: categoriesArray.length > 0 ? categoriesArray : undefined,
        alternateNames: alternateNamesArray.length > 0 ? alternateNamesArray : undefined,
        alternate_names: alternateNamesArray.length > 0 ? alternateNamesArray : undefined,
        isVisible: formValue.isVisible === true,
        is_visible: formValue.isVisible === true,
        visibility: formValue.isVisible ? 'public' : 'hidden'
      });

      this.jsonValue.set(JSON.stringify(patch, null, 2));
      await this.save();
      this.toggleEditDrawer(false);
      await this.refresh();
    } catch (error: any) {
      this.notifier.showError(error?.message || 'Không thể lưu thông tin bệnh lý');
    }
  }

  // Load disease data into form
  patchDiseaseFormFromDocument(): void {
    const doc = this.document();
    if (!doc || !this.isDiseaseCollection()) {
      return;
    }

    const categoriesString = Array.isArray(doc.categories) 
      ? doc.categories.join(', ') 
      : (Array.isArray(doc.category) ? doc.category.join(', ') : '');
    const alternateNamesString = Array.isArray(doc.alternateNames) 
      ? doc.alternateNames.join(', ') 
      : (Array.isArray(doc.alternate_names) ? doc.alternate_names.join(', ') : '');

    this.diseaseForm.patchValue({
      name: doc.name || doc.title || '',
      code: doc.id ? String(doc.id) : (doc.code || ''),
      slug: doc.slug || '',
      headline: doc.headline || '',
      summary: doc.summary || '',
      symptoms: doc.symptoms || '',
      causes: doc.causes || '',
      treatment: doc.treatment || '',
      prevention: doc.prevention || '',
      notes: doc.notes || '',
      coverImage: doc.primary_image || doc.primaryImage || doc.image || doc.thumbnail || doc.coverImage || '',
      url: doc.url || '',
      originalUrl: doc.original_url || doc.originalUrl || '',
      categories: categoriesString,
      alternateNames: alternateNamesString,
      isVisible: doc.isVisible !== false && doc.is_visible !== false && doc.visibility !== 'hidden'
    }, { emitEvent: false });
  }

  // Submit banner form
  async submitBannerForm(): Promise<void> {
    if (!this.bannerForm.valid) {
      this.bannerForm.markAllAsTouched();
      this.notifier.showWarning('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    const doc = this.document();
    const isCreate = this.isCreate();

    try {
      const formValue = this.bannerForm.getRawValue();
      
      const patch: any = isCreate ? {} : { ...doc };
      
      // Clear old image if backgroundImage or slideImage is set
      // This prevents old images from showing when new theme images are added
      const hasBackgroundImage = !!(formValue.backgroundImage && formValue.backgroundImage.trim());
      const hasSlideImage = !!(formValue.slideImage && formValue.slideImage.trim());
      const shouldClearImage = hasBackgroundImage || hasSlideImage;
      
      Object.assign(patch, {
        name: formValue.name,
        type: formValue.type || 'hero',
        position: formValue.position || 'homepage',
        // Only set image if no backgroundImage or slideImage is provided
        image: shouldClearImage ? undefined : (formValue.image || undefined),
        backgroundImage: formValue.backgroundImage || undefined,
        background_image: formValue.backgroundImage || undefined,
        slideImage: formValue.slideImage || undefined,
        slide_image: formValue.slideImage || undefined,
        title: formValue.title || undefined,
        subtitle: formValue.subtitle || undefined,
        badge1: (formValue.badge1Text || formValue.badge1Discount) ? {
          text: formValue.badge1Text || '',
          discount: formValue.badge1Discount || ''
        } : undefined,
        badge2: (formValue.badge2Text || formValue.badge2Discount) ? {
          text: formValue.badge2Text || '',
          discount: formValue.badge2Discount || ''
        } : undefined,
        buttonText: formValue.buttonText || undefined,
        button_text: formValue.buttonText || undefined,
        dateRange: formValue.dateRange || undefined,
        date_range: formValue.dateRange || undefined,
        productId: formValue.productId || undefined,
        product_id: formValue.productId || undefined,
        link: formValue.link || undefined,
        order: Number(formValue.order) || 0,
        displayOrder: Number(formValue.order) || 0,
        isActive: formValue.isActive === true,
        is_active: formValue.isActive === true,
        status: formValue.isActive ? 'active' : 'inactive'
      });

      this.jsonValue.set(JSON.stringify(patch, null, 2));
      await this.save();
      this.toggleEditDrawer(false);
      await this.refresh();
    } catch (error: any) {
      this.notifier.showError(error?.message || 'Không thể lưu thông tin banner');
    }
  }

  // Load banner data into form
  patchBannerFormFromDocument(): void {
    const doc = this.document();
    if (!doc || !this.isBannerCollection()) {
      return;
    }

    this.bannerForm.patchValue({
      name: doc.name || '',
      type: (doc.type || 'hero') as 'hero' | 'feature' | 'sub' | 'marketing',
      position: doc.position || 'homepage',
      image: doc.image || '',
      backgroundImage: doc.backgroundImage || doc.background_image || '',
      slideImage: doc.slideImage || doc.slide_image || '',
      title: doc.title || '',
      subtitle: doc.subtitle || '',
      badge1Text: doc.badge1?.text || '',
      badge1Discount: doc.badge1?.discount || '',
      badge2Text: doc.badge2?.text || '',
      badge2Discount: doc.badge2?.discount || '',
      buttonText: doc.buttonText || doc.button_text || '',
      dateRange: doc.dateRange || doc.date_range || '',
      productId: doc.productId || doc.product_id || '',
      link: doc.link || '',
      order: typeof doc.order === 'number' ? doc.order : (typeof doc.displayOrder === 'number' ? doc.displayOrder : 0),
      isActive: doc.isActive !== false && doc.is_active !== false && doc.status !== 'inactive'
    }, { emitEvent: false });
  }

  // Toggle blog preview mode
  toggleBlogPreview(): void {
    this.blogPreviewMode.update(v => !v);
  }

  // Insert HTML tag helper
  insertHtmlTag(tag: string): void {
    const contentControl = this.blogForm.get('content');
    if (!contentControl) return;

    const textarea = document.querySelector('.content-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = contentControl.value || '';
    const selectedText = currentValue.substring(start, end);

    let newText = '';
    switch (tag) {
      case 'p':
        newText = currentValue.substring(0, start) + `<p>${selectedText || 'Đoạn văn'}</p>` + currentValue.substring(end);
        break;
      case 'h2':
        newText = currentValue.substring(0, start) + `<h2>${selectedText || 'Tiêu đề'}</h2>` + currentValue.substring(end);
        break;
      case 'h3':
        newText = currentValue.substring(0, start) + `<h3>${selectedText || 'Tiêu đề phụ'}</h3>` + currentValue.substring(end);
        break;
      case 'strong':
        newText = currentValue.substring(0, start) + `<strong>${selectedText || 'In đậm'}</strong>` + currentValue.substring(end);
        break;
      case 'em':
        newText = currentValue.substring(0, start) + `<em>${selectedText || 'In nghiêng'}</em>` + currentValue.substring(end);
        break;
      case 'ul':
        newText = currentValue.substring(0, start) + `<ul>\n  <li>${selectedText || 'Mục 1'}</li>\n  <li>Mục 2</li>\n</ul>` + currentValue.substring(end);
        break;
      case 'ol':
        newText = currentValue.substring(0, start) + `<ol>\n  <li>${selectedText || 'Bước 1'}</li>\n  <li>Bước 2</li>\n</ol>` + currentValue.substring(end);
        break;
      case 'link':
        newText = currentValue.substring(0, start) + `<a href="https://">${selectedText || 'Link text'}</a>` + currentValue.substring(end);
        break;
      case 'img':
        newText = currentValue.substring(0, start) + `<img src="https://" alt="${selectedText || 'Mô tả ảnh'}" />` + currentValue.substring(end);
        break;
      default:
        return;
    }

    contentControl.setValue(newText);
    
    // Restore focus
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + (newText.length - currentValue.length);
      textarea.setSelectionRange(newPosition, newPosition);
    }, 10);
  }

  // Submit blog form
  async submitBlogForm(): Promise<void> {
    if (!this.blogForm.valid) {
      this.blogForm.markAllAsTouched();
      this.notifier.showWarning('Vui lòng điền đầy đủ thông tin hợp lệ');
      return;
    }

    const doc = this.document();
    if (!doc) {
      this.notifier.showError('Chưa tải xong dữ liệu');
      return;
    }

    try {
      const formValue = this.blogForm.getRawValue();
      
      // Convert categories and tags from comma-separated strings to arrays
      const categoriesArray = formValue.categories 
        ? formValue.categories.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0)
        : [];
      
      const tagsArray = formValue.tags 
        ? formValue.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0)
        : [];

      // Format publishedAt date
      let publishedAtDate: Date | undefined;
      if (formValue.publishedAt) {
        publishedAtDate = new Date(formValue.publishedAt);
      }

      const patch: any = {
        ...doc,
        title: formValue.title,
        slug: formValue.slug || '',
        articleId: formValue.articleId || undefined,
        headline: formValue.headline || undefined,
        shortDescription: formValue.shortDescription || undefined,
        content: formValue.content || undefined,
        descriptionHtml: formValue.content || undefined,
        body: formValue.content || undefined, // Some APIs use 'body'
        html: formValue.content || undefined, // Some APIs use 'html'
        coverImage: formValue.coverImage || undefined,
        image: formValue.coverImage || undefined,
        thumbnail: formValue.coverImage || undefined,
        primaryImage: formValue.coverImage ? { 
          url: formValue.coverImage,
          src: formValue.coverImage,
          original: formValue.coverImage
        } : undefined,
        url: formValue.url || undefined,
        detailUrl: formValue.url || undefined,
        originalUrl: formValue.originalUrl || undefined,
        original_url: formValue.originalUrl || undefined,
        author: formValue.authorName ? {
          fullName: formValue.authorName,
          name: formValue.authorName,
          displayName: formValue.authorName,
          username: formValue.authorName,
          title: formValue.authorTitle || undefined,
          role: formValue.authorTitle || undefined,
          avatar: formValue.authorAvatar || undefined,
          avatarUrl: formValue.authorAvatar || undefined,
          image: formValue.authorAvatar || undefined
        } : undefined,
        status: formValue.status || 'published',
        isApproved: formValue.isApproved === true,
        isVisible: formValue.isVisible === true,
        visibility: formValue.isVisible ? 'public' : 'hidden',
        publishedAt: publishedAtDate,
        categories: categoriesArray.length > 0 ? categoriesArray : undefined,
        category: categoriesArray.length > 0 ? categoriesArray : undefined,
        parentCategory: categoriesArray.length > 0 ? categoriesArray[0] : undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        hashtags: tagsArray.length > 0 ? tagsArray.map(t => `#${t}`) : undefined,
        // SEO & Metadata
        metaTitle: formValue.metaTitle || formValue.title,
        metaDescription: formValue.metaDescription || formValue.shortDescription,
        metaKeywords: formValue.metaKeywords || formValue.tags,
        meta: {
          title: formValue.metaTitle || formValue.title,
          description: formValue.metaDescription || formValue.shortDescription,
          keywords: formValue.metaKeywords || formValue.tags
        },
        readTime: formValue.readTime || undefined,
        readingTime: formValue.readTime || undefined,
        featured: formValue.featured === true,
        isFeatured: formValue.featured === true,
        allowComments: formValue.allowComments === true,
        commentsEnabled: formValue.allowComments === true
      };

      this.jsonValue.set(JSON.stringify(patch, null, 2));
      await this.save();
      this.toggleEditDrawer(false);
      await this.refresh();
    } catch (error: any) {
      this.notifier.showError(error?.message || 'Không thể lưu thông tin bài viết');
    }
  }

  // Load blog data into form
  patchBlogFormFromDocument(): void {
    const doc = this.document();
    if (!doc || !this.isBlogCollection()) {
      return;
    }

    // Extract categories
    const categorySet = new Set<string>();
    if (Array.isArray(doc.category)) {
      doc.category.forEach((c: any) => {
        if (typeof c === 'string') categorySet.add(c);
        else if (c?.name) categorySet.add(c.name);
        else if (c?.title) categorySet.add(c.title);
      });
    }
    if (Array.isArray(doc.categories)) {
      doc.categories.forEach((c: any) => {
        if (typeof c === 'string') categorySet.add(c);
        else if (c?.name) categorySet.add(c.name);
        else if (c?.title) categorySet.add(c.title);
      });
    }
    const categoriesString = Array.from(categorySet).join(', ');

    // Extract tags
    const tagSet = new Set<string>();
    if (Array.isArray(doc.tags)) {
      doc.tags.forEach((tag: any) => {
        if (typeof tag === 'string') tagSet.add(tag);
        else if (tag?.title) tagSet.add(tag.title);
        else if (tag?.name) tagSet.add(tag.name);
      });
    }
    const tagsString = Array.from(tagSet).join(', ');

    // Format publishedAt for datetime-local input
    const formatDateTimeLocal = (date: Date | string | undefined): string => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    this.blogForm.patchValue({
      title: doc.title || doc.name || '',
      slug: doc.slug || doc.cleanSlug || '',
      articleId: doc.articleId ? String(doc.articleId) : (doc.id ? String(doc.id) : ''),
      headline: doc.headline || '',
      shortDescription: doc.shortDescription || doc.summary || '',
      content: doc.descriptionHtml || doc.content || doc.body || doc.html || doc.article || '',
      coverImage: doc.primaryImage?.url || doc.primaryImage?.src || doc.primaryImage?.original || doc.primaryImage || doc.thumbnail || doc.image || '',
      url: doc.url || doc.detailUrl || '',
      originalUrl: doc.originalUrl || doc.original_url || '',
      authorName: doc.author?.fullName || doc.author?.name || doc.author?.displayName || doc.author?.username || (typeof doc.author === 'string' ? doc.author : ''),
      authorTitle: doc.author?.title || doc.author?.role || '',
      authorAvatar: doc.author?.avatar || doc.author?.image || doc.author?.avatarUrl || '',
      status: doc.status || 'published',
      isApproved: doc.isApproved !== false,
      isVisible: doc.isVisible !== false && doc.visibility !== 'hidden',
      publishedAt: formatDateTimeLocal(doc.publishedAt),
      categories: categoriesString,
      tags: tagsString,
      // SEO & Metadata
      metaTitle: doc.metaTitle || doc.meta?.title || '',
      metaDescription: doc.metaDescription || doc.meta?.description || '',
      metaKeywords: doc.metaKeywords || doc.meta?.keywords || '',
      readTime: doc.readTime || doc.readingTime || null,
      featured: doc.featured === true || doc.isFeatured === true,
      allowComments: doc.allowComments !== false && doc.commentsEnabled !== false
    }, { emitEvent: false });
  }
}


