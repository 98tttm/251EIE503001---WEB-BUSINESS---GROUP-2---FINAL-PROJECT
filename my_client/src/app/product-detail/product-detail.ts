import { Component, OnInit, signal, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from '../services/category.service';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { Login } from '../login/login';
import { ToastService } from '../toast.service';
import { ChatbotService } from '../services/chatbot.service';
import { environment } from '../../environments/environment';

interface Product {
  _id: string;
  name: string;
  brand?: string;
  country?: string;
  description?: string;
  price: number;
  original_price?: number;
  discount?: number;
  stock: number;
  unit?: string;
  image: string;
  gallery?: string[];
  usage?: string;
  ingredients?: string;
  warnings?: string;
  prescriptionRequired?: boolean;
  createDate?: Date;
  expiredDate?: Date;
  categoryId?: string;
  activeIngredientIds?: string[];
  herbIds?: string[];
  isActive?: boolean;
  is_bestseller?: boolean;
  registration_number?: string;
  dosage_form?: string;
  manufacturer?: string;
}

interface ProductReviews {
  productId: string;
  averageRating: number;
  totalReviews: number;
  totalComments: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface Rating {
  _id?: string;
  productId: string;
  rating: number;
  userName: string;
  userId?: string;
  userComment: string;
  createdAt: Date;
  replies?: Reply[];
}

interface Comment {
  _id?: string;
  productId: string;
  userName: string;
  userId?: string;
  content: string;
  helpfulCount: number;
  helpfulBy?: string[];
  createdAt: Date;
  replies?: Reply[];
}

interface Reply {
  _id?: string;
  userName: string;
  userId?: string;
  content: string;
  createdAt: Date;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Login],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  product = signal<Product | null>(null);
  loading = signal(true);
  quantity = signal(1);
  selectedImage = signal(0);
  activeTab = signal<'ingredients' | 'usage' | 'sideEffects' | 'notes' | 'storage'>('ingredients');
  activeSection = signal<string>('overview');
  
  // Image gallery modal
  showImageModal = signal(false);
  modalImageIndex = signal(0);
  
  // Breadcrumb
  breadcrumb = signal<Category[]>([]);
  
  // Product details table expand/collapse
  showFullDetails = signal(false);
  
  // Reviews
  reviews = signal<ProductReviews | null>(null);
  ratings = signal<Rating[]>([]);
  comments = signal<Comment[]>([]);
  
  // Review forms
  showRatingForm = signal(false);
  showCommentForm = signal(false);
  selectedRating = signal(0);
  ratingUserName = signal('');
  ratingComment = signal('');
  commentUserName = signal('');
  commentContent = signal('');
  selectedRatingFilter = signal('all');
  
  // Pagination
  ratingsToShow = signal(5);
  commentsToShow = signal(5);
  
  // Reply functionality
  replyingToCommentId = signal<string | null>(null);
  replyingToRatingId = signal<string | null>(null);
  replyContent = signal('');
  ratingReplyContent = signal('');
  
  // Comment sorting
  commentSortBy = signal<'newest' | 'oldest' | 'helpful'>('newest');
  
  // Success popup
  showSuccessPopup = signal(false);
  successMessage = signal('');
  successType = signal<'rating' | 'comment'>('comment');
  
  // Recently viewed products
  recentlyViewed = signal<Product[]>([]);
  currentSlide = signal(0);
  
  // Related products
  relatedProducts = signal<Product[]>([]);
  currentSlideRelated = signal(0);

  // Login component reference
  @ViewChild(Login) loginComponent!: Login;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public categoryService: CategoryService,
    public authService: AuthService,
    private cartService: CartService,
    private chatbotService: ChatbotService
  ) {
    // Watch for login changes and handle pending actions
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        // User just logged in, check for pending action
        const pendingAction = localStorage.getItem('pendingAction');
        if (pendingAction) {
          setTimeout(() => {
            if (pendingAction === 'rating') {
              this.showRatingForm.set(true);
            } else if (pendingAction === 'comment') {
              this.showCommentForm.set(true);
            }
            localStorage.removeItem('pendingAction');
          }, 100);
        }
      }
    });
  }

  async ngOnInit() {
    // Load categories first
    await this.categoryService.fetchCategories();
    
    // Load recently viewed products
    this.loadRecentlyViewed();
    
    this.route.params.subscribe(async params => {
      const productId = params['id'];
      if (productId) {
        await this.loadProduct(productId);
      }
    });
  }

  async loadProduct(id: string) {
    this.loading.set(true);
    
    try {
      const response = await fetch(`${environment.apiUrl}/api/products/${id}`);
      const data = await response.json();
      
      if (data.success) {
        this.product.set(data.data);
        this.updateImages(); // Update images after product is loaded
        this.loadBreadcrumb(); // Load breadcrumb based on categoryId
        this.loadReviews(id); // Load reviews for product
        this.loadRelatedProducts(id); // Load related products
        this.addToRecentlyViewed(data.data); // Add to recently viewed
        console.log('✅ Product loaded:', data.data);
      } else {
        console.error('❌ Failed to load product');
      }
    } catch (error) {
      console.error('❌ Error loading product:', error);
    }
    
    this.loading.set(false);
  }

  async loadReviews(productId: string) {
    try {
      const response = await fetch(`${environment.apiUrl}/api/products/${productId}/reviews`);
      const data = await response.json();
      
      if (data.success) {
        this.reviews.set(data.data);
        console.log('✅ Reviews loaded:', data.data);
      }
      
      // Load ratings và comments
      await this.loadRatings(productId);
      await this.loadComments(productId);
    } catch (error) {
      console.error('❌ Error loading reviews:', error);
    }
  }

  async loadRelatedProducts(productId: string) {
    try {
      console.log('🔍 Loading related products for:', productId);
      const response = await fetch(`${environment.apiUrl}/api/products/${productId}/related`);
      const data = await response.json();
      
      console.log('📦 Related products API response:', data);
      
      if (data.success) {
        this.relatedProducts.set(data.data);
        console.log('✅ Related products loaded:', data.data.length, 'products');
        console.log('📋 Related products:', data.data);
      } else {
        console.log('⚠️ API returned success=false:', data);
      }
    } catch (error) {
      console.error('❌ Error loading related products:', error);
    }
  }

  async loadRatings(productId: string, filter = 'all') {
    try {
      const response = await fetch(`${environment.apiUrl}/api/products/${productId}/ratings?filter=${filter}`);
      const data = await response.json();
      
      if (data.success) {
        this.ratings.set(data.data);
        console.log('✅ Ratings loaded:', data.data.length);
      }
    } catch (error) {
      console.error('❌ Error loading ratings:', error);
    }
  }

  async loadComments(productId: string, sort = 'newest') {
    try {
      const response = await fetch(`${environment.apiUrl}/api/products/${productId}/comments?sort=${sort}`);
      const data = await response.json();
      
      if (data.success) {
        this.comments.set(data.data);
        console.log('✅ Comments loaded:', data.data.length);
      }
    } catch (error) {
      console.error('❌ Error loading comments:', error);
    }
  }

  // Open rating form with login check
  openRatingForm() {
    if (!this.authService.currentUser()) {
      // Save pending action
      localStorage.setItem('pendingAction', 'rating');
      // Open login popup
      this.loginComponent?.openLoginPopup();
      return;
    }
    // Toggle form if already logged in
    this.showRatingForm.set(!this.showRatingForm());
  }

  // Open comment form with login check
  openCommentForm() {
    if (!this.authService.currentUser()) {
      // Save pending action
      localStorage.setItem('pendingAction', 'comment');
      // Open login popup
      this.loginComponent?.openLoginPopup();
      return;
    }
    // Toggle form if already logged in
    this.showCommentForm.set(!this.showCommentForm());
  }

  async submitRating() {
    const product = this.product();
    const user = this.authService.currentUser();
    
    // Check authentication (should not happen if form is properly guarded)
    if (!user) {
      return;
    }
    
    if (!product || this.selectedRating() === 0) {
      alert('Vui lòng chọn số sao đánh giá');
      return;
    }

    try {
      const response = await fetch(`${environment.apiUrl}/api/products/${product._id}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating: this.selectedRating(),
          userName: user.name || user.email,
          userId: user.userId,
          userComment: this.ratingComment()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Reset form
        this.selectedRating.set(0);
        this.ratingComment.set('');
        this.showRatingForm.set(false);
        
        // Reload reviews
        await this.loadReviews(product._id);
        
        // Show success popup
        this.showSuccess('Đánh giá thành công!', 'rating');
      } else {
        alert('❌ Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error submitting rating:', error);
      alert('❌ Có lỗi xảy ra khi gửi đánh giá');
    }
  }

  async submitComment() {
    const product = this.product();
    const user = this.authService.currentUser();
    
    // Check authentication (should not happen if form is properly guarded)
    if (!user) {
      return;
    }
    
    if (!product || !this.commentContent().trim()) {
      alert('Vui lòng nhập nội dung bình luận');
      return;
    }

    try {
      const response = await fetch(`${environment.apiUrl}/api/products/${product._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userName: user.name || user.email,
          userId: user.userId,
          content: this.commentContent()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Reset form
        this.commentContent.set('');
        this.showCommentForm.set(false);
        
        // Reload comments
        await this.loadComments(product._id);
        await this.loadReviews(product._id);
        
        // Show success popup
        this.showSuccess('Bình luận đã được ghi nhận và sẽ cập nhật trong thời gian sớm nhất!', 'comment');
      } else {
        alert('❌ Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
      alert('❌ Có lỗi xảy ra khi gửi bình luận');
    }
  }

  async toggleHelpful(commentId: string) {
    const user = this.authService.currentUser();
    
    if (!user) {
      alert('Vui lòng đăng nhập để đánh dấu hữu ích');
      this.router.navigate(['/login']);
      return;
    }

    try {
      const response = await fetch(`${environment.apiUrl}/api/comments/${commentId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.userId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Reload comments to show updated count
        const product = this.product();
        if (product) {
          await this.loadComments(product._id);
        }
      } else {
        alert('❌ Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error toggling helpful:', error);
      alert('❌ Có lỗi xảy ra');
    }
  }

  isCommentHelpful(comment: Comment): boolean {
    const user = this.authService.currentUser();
    if (!user || !comment.helpfulBy) return false;
    return comment.helpfulBy.includes(user.userId);
  }

  filterRatings(filter: string) {
    this.selectedRatingFilter.set(filter);
    const product = this.product();
    if (product) {
      this.loadRatings(product._id, filter);
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hôm nay';
    if (days === 1) return 'Hôm qua';
    if (days < 7) return `${days} ngày trước`;
    if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
    return `${Math.floor(days / 30)} tháng trước`;
  }

  loadBreadcrumb() {
    const product = this.product();
    if (!product || !product.categoryId) {
      this.breadcrumb.set([]);
      return;
    }

    // Get breadcrumb from category service
    const breadcrumb = this.categoryService.getBreadcrumb(product.categoryId);
    this.breadcrumb.set(breadcrumb);
    console.log('📍 Breadcrumb loaded:', breadcrumb.map(c => c.name));
  }

  selectImage(index: number) {
    this.selectedImage.set(index);
  }

  openImageModal(index: number = 0) {
    this.modalImageIndex.set(index);
    this.showImageModal.set(true);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeImageModal() {
    this.showImageModal.set(false);
    document.body.style.overflow = '';
  }

  nextModalImage() {
    const current = this.modalImageIndex();
    const total = this.allImages().length;
    this.modalImageIndex.set((current + 1) % total);
  }

  prevModalImage() {
    const current = this.modalImageIndex();
    const total = this.allImages().length;
    this.modalImageIndex.set((current - 1 + total) % total);
  }

  selectModalImage(index: number) {
    this.modalImageIndex.set(index);
  }

  increaseQuantity() {
    const current = this.quantity();
    const stock = this.product()?.stock || 0;
    if (current < stock) {
      this.quantity.set(current + 1);
    }
  }

  decreaseQuantity() {
    const current = this.quantity();
    if (current > 1) {
      this.quantity.set(current - 1);
    }
  }
  
  toggleDetails() {
    this.showFullDetails.set(!this.showFullDetails());
  }

  async addToCart() {
    const product = this.product();
    if (!product) return;

    const qty = this.quantity();
    let addedCount = 0;
    
    // Add to cart multiple times based on quantity
    for (let i = 0; i < qty; i++) {
      const result = await this.cartService.addToCart({
        _id: product._id,
        name: product.name,
        price: product.discount ? product.price : product.price,
        discount: product.discount,
        image: product.image,
        unit: product.unit || 'Hộp',
        stock: product.stock || 999
      });
      
      if (!result.success) {
        if (addedCount > 0) {
          console.log('🍞 Toast Error:', `Đã thêm ${addedCount}/${qty} sản phẩm. ${result.message}`);
          ToastService.error(`Đã thêm ${addedCount}/${qty} sản phẩm. ${result.message}`);
        } else {
          console.log('🍞 Toast Error:', result.message || 'Không thể thêm sản phẩm vào giỏ hàng!');
          ToastService.error(result.message || 'Không thể thêm sản phẩm vào giỏ hàng!');
        }
        break;
      }
      addedCount++;
    }
    
    if (addedCount === qty) {
      const message = `Đã thêm ${qty} ${product.unit || 'sản phẩm'} vào giỏ hàng!`;
      console.log('🍞 Toast Success:', message);
      ToastService.success(message);
    }
    
    // Reset quantity to 1
    this.quantity.set(1);
  }

  // Add to cart quick (for related/recently viewed products)
  async addToCartQuick(product: Product) {
    const result = await this.cartService.addToCart({
      _id: product._id,
      name: product.name,
      price: product.discount ? product.price : product.price,
      discount: product.discount,
      image: product.image,
      unit: product.unit || 'Hộp',
      stock: product.stock || 999
    });

    if (result.success) {
      ToastService.success(result.message || `Đã thêm ${product.name} vào giỏ hàng!`);
    } else {
      ToastService.error(result.message || 'Sản phẩm đã hết hàng hoặc vượt quá số lượng trong kho!');
    }
  }

  findPharmacy() {
    console.log('Tư vấn với MeCa clicked');
    // Open chatbot with product context
    const product = this.product();
    console.log('Product:', product);
    if (product) {
      // Convert product to format expected by chatbot - include ALL relevant information
      const productForChat = {
        _id: product._id,
        name: product.name,
        price: product.price,
        original_price: product.original_price || (product.price + (product.discount || 0)),
        discount: product.discount,
        image: product.image,
        description: product.description,
        brand: product.brand,
        usage: product.usage,
        ingredients: product.ingredients,
        unit: product.unit,
        stock: product.stock,
        country: product.country,
        manufacturer: product.manufacturer,
        dosage_form: product.dosage_form,
        registration_number: product.registration_number
      };
      console.log('Opening chat with full product info:', productForChat);
      this.chatbotService.openChat(productForChat);
    } else {
      console.error('Product is null, cannot open chat');
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  calculateDiscountPercent(price: number, discount: number): number {
    const originalPrice = price + discount;
    return Math.round((discount / originalPrice) * 100);
  }

  calculateDiscount(price: number, originalPrice?: number): number {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  setActiveTab(tab: 'ingredients' | 'usage' | 'sideEffects' | 'notes' | 'storage') {
    this.activeTab.set(tab);
  }

  // Process HTML content to replace external links
  processHtmlContent(html: string | null | undefined): string {
    if (!html) return '';
    
    let processed = html;
    
    // Replace nhathuoclongchau.com links with internal links
    // Example: https://nhathuoclongchau.com.vn/thuc-pham-chuc-nang/chuc-nang-gan -> /products?category=chuc-nang-gan
    processed = processed.replace(
      /https?:\/\/nhathuoclongchau\.com\.vn\/[^\s"'<>]*/g, 
      (match) => {
        // Try to extract meaningful part and create internal link
        if (match.includes('/thuc-pham-chuc-nang/')) {
          const category = match.split('/thuc-pham-chuc-nang/')[1]?.split(/[/?#]/)[0];
          return category ? `/products?category=${category}` : '/products';
        }
        if (match.includes('/thuoc/')) {
          const productSlug = match.split('/thuoc/')[1]?.split(/[/?#]/)[0];
          return productSlug ? `/products?q=${productSlug}` : '/products';
        }
        if (match.includes('/benh/')) {
          return '/products'; // Link to products page
        }
        if (match.includes('/bai-viet/')) {
          return '#'; // Disable article links for now
        }
        if (match.includes('/thanh-phan/')) {
          return '#'; // Disable ingredient links for now
        }
        return '/products'; // Default to products page
      }
    );
    
    // Remove any remaining external links that might be harmful
    // processed = processed.replace(/https?:\/\/[^\s"'<>]*/g, '#');
    
    return processed;
  }

  // Scroll to section
  scrollToSection(sectionId: string) {
    this.activeSection.set(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Handle scroll event to update active section
  onContentScroll() {
    const sections = ['overview', 'ingredients', 'usage', 'howToUse', 'warnings', 'storage'];
    const scrollPosition = document.querySelector('.description-content')?.scrollTop || 0;
    
    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const rect = element.getBoundingClientRect();
        const contentRect = document.querySelector('.description-content')?.getBoundingClientRect();
        if (contentRect && rect.top <= contentRect.top + 100) {
          this.activeSection.set(sectionId);
        }
      }
    }
  }

  goBack() {
    this.router.navigate(['/products']);
  }

  // Recently Viewed Products Management
  loadRecentlyViewed() {
    try {
      const stored = localStorage.getItem('recentlyViewedProducts');
      if (stored) {
        const products = JSON.parse(stored);
        // Filter out current product and limit to 8 items
        const currentProductId = this.product()?._id;
        const filtered = products
          .filter((p: Product) => p._id !== currentProductId)
          .slice(0, 8);
        this.recentlyViewed.set(filtered);
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
  }

  addToRecentlyViewed(product: Product) {
    try {
      let recentlyViewed: Product[] = [];
      const stored = localStorage.getItem('recentlyViewedProducts');
      
      if (stored) {
        recentlyViewed = JSON.parse(stored);
      }
      
      // Remove product if already exists
      recentlyViewed = recentlyViewed.filter(p => p._id !== product._id);
      
      // Add to beginning
      recentlyViewed.unshift(product);
      
      // Keep only last 20 products
      recentlyViewed = recentlyViewed.slice(0, 20);
      
      // Save to localStorage
      localStorage.setItem('recentlyViewedProducts', JSON.stringify(recentlyViewed));
      
      // Update signal (exclude current product)
      this.recentlyViewed.set(recentlyViewed.filter(p => p._id !== product._id).slice(0, 8));
    } catch (error) {
      console.error('Error saving to recently viewed:', error);
    }
  }

  needsConsultation(price: number): boolean {
    return price > 300000;
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
      // Width of one product card (180px) + gap (20px) on mobile
      return 200;
    }
    // Width of one product card (240px) + gap (20px) on desktop
    return 260;
  }

  // Related products slider methods
  prevSlideRelated() {
    if (this.currentSlideRelated() > 0) {
      this.currentSlideRelated.set(this.currentSlideRelated() - 1);
    }
  }

  nextSlideRelated() {
    if (this.currentSlideRelated() < this.relatedProducts().length - 5) {
      this.currentSlideRelated.set(this.currentSlideRelated() + 1);
    }
  }

  getSlideWidthRelated(): number {
    // Same as recently viewed slider
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 200; // mobile
    }
    return 260; // desktop
  }

  // Use signal instead of getter
  allImages = signal<string[]>([]);

  // Update allImages when product changes
  updateImages() {
    const product = this.product();
    if (!product) {
      this.allImages.set([]);
      return;
    }
    
    const images: string[] = [];
    
    // Add main image if it exists and is valid
    if (product.image && 
        typeof product.image === 'string' && 
        product.image.trim() !== '' && 
        product.image !== 'null' && 
        product.image !== 'undefined') {
      images.push(product.image);
    }
    
    // Add gallery images, but skip if they're the same as main image
    if (product.gallery && product.gallery.length > 0) {
      product.gallery.forEach(img => {
        if (img && 
            typeof img === 'string' && 
            img.trim() !== '' && 
            img !== 'null' && 
            img !== 'undefined' &&
            img !== product.image && 
            !images.includes(img)) {
          images.push(img);
        }
      });
    }
    
    // If no images found, add fallback
    if (images.length === 0) {
      images.push('https://via.placeholder.com/400x400?text=MediCare');
      console.warn('⚠️ Product has no valid images, using fallback');
    }
    
    this.allImages.set(images);
    console.log('📸 Total images loaded:', images.length);
  }

  showSuccess(message: string, type: 'rating' | 'comment') {
    this.successMessage.set(message);
    this.successType.set(type);
    this.showSuccessPopup.set(true);
    
    // Auto close after 3 seconds
    setTimeout(() => {
      this.closeSuccessPopup();
    }, 3000);
  }

  closeSuccessPopup() {
    this.showSuccessPopup.set(false);
  }

  // Computed: visible ratings
  get visibleRatings() {
    return this.ratings().slice(0, this.ratingsToShow());
  }

  // Computed: visible comments
  get visibleComments() {
    return this.comments().slice(0, this.commentsToShow());
  }

  // Computed: has more ratings
  get hasMoreRatings() {
    return this.ratings().length > this.ratingsToShow();
  }

  // Computed: has more comments
  get hasMoreComments() {
    return this.comments().length > this.commentsToShow();
  }

  // Load more ratings
  loadMoreRatings() {
    this.ratingsToShow.set(this.ratingsToShow() + 5);
  }

  // Load more comments
  loadMoreComments() {
    this.commentsToShow.set(this.commentsToShow() + 5);
  }

  // Sort comments
  sortComments(sortBy: 'newest' | 'oldest' | 'helpful') {
    this.commentSortBy.set(sortBy);
    const product = this.product();
    if (product) {
      this.loadComments(product._id, sortBy);
    }
  }

  // Reply to comment
  showReplyForm(commentId: string) {
    this.replyingToCommentId.set(commentId);
    this.replyContent.set('');
  }

  cancelReply() {
    this.replyingToCommentId.set(null);
    this.replyContent.set('');
  }

  // Reply to rating
  showRatingReplyForm(ratingId: string) {
    this.replyingToRatingId.set(ratingId);
    this.ratingReplyContent.set('');
  }

  cancelRatingReply() {
    this.replyingToRatingId.set(null);
    this.ratingReplyContent.set('');
  }

  async submitRatingReply(ratingId: string, ratingUserName: string) {
    const user = this.authService.currentUser();
    
    if (!user) {
      alert('Vui lòng đăng nhập để trả lời');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.ratingReplyContent().trim()) {
      alert('Vui lòng nhập nội dung trả lời');
      return;
    }

    try {
      const response = await fetch(`${environment.apiUrl}/api/ratings/${ratingId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userName: user.name || user.email,
          userId: user.userId,
          content: this.ratingReplyContent()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Reset form
        this.ratingReplyContent.set('');
        this.replyingToRatingId.set(null);
        
        // Reload ratings
        const product = this.product();
        if (product) {
          await this.loadRatings(product._id, this.selectedRatingFilter());
        }
        
        // Show success
        this.showSuccess('Trả lời đã được gửi thành công!', 'rating');
      } else {
        alert('❌ Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error submitting rating reply:', error);
      alert('❌ Có lỗi xảy ra khi gửi trả lời');
    }
  }

  async submitReply(commentId: string, commentUserName: string) {
    const user = this.authService.currentUser();
    
    if (!user) {
      alert('Vui lòng đăng nhập để trả lời');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.replyContent().trim()) {
      alert('Vui lòng nhập nội dung trả lời');
      return;
    }

    try {
      const response = await fetch(`${environment.apiUrl}/api/comments/${commentId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userName: user.name || user.email,
          userId: user.userId,
          content: this.replyContent()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Reset form
        this.replyContent.set('');
        this.replyingToCommentId.set(null);
        
        // Reload comments
        const product = this.product();
        if (product) {
          await this.loadComments(product._id, this.commentSortBy());
        }
        
        // Show success
        this.showSuccess('Trả lời đã được gửi thành công!', 'comment');
      } else {
        alert('❌ Lỗi: ' + data.error);
      }
    } catch (error) {
      console.error('❌ Error submitting reply:', error);
      alert('❌ Có lỗi xảy ra khi gửi trả lời');
    }
  }
}
