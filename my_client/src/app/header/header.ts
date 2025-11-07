import { Component, OnInit, AfterViewInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CategoryService, Category } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { ImageSearchService, ImageSearchDetail, ImageSearchResult } from '../services/image-search.service';
import { Login } from '../login/login';
import { LogoutConfirm } from '../logout-confirm/logout-confirm';
import { NotificationBellComponent } from '../shared/components/notification-bell/notification-bell.component';

interface ImageUploadItem {
  file: File;
  previewUrl: string;
  sizeLabel: string;
}

const IMAGE_SEARCH_MAX_FILES = 5;
const IMAGE_SEARCH_MAX_SIZE = 6 * 1024 * 1024; // 6MB

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterModule, FormsModule, Login, LogoutConfirm, NotificationBellComponent],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, AfterViewInit, OnDestroy {
  // Expose constants to template
  readonly IMAGE_SEARCH_MAX_FILES = IMAGE_SEARCH_MAX_FILES;
  readonly IMAGE_SEARCH_MAX_SIZE = IMAGE_SEARCH_MAX_SIZE;
  // UI state
  activeMenuId = signal<string | null>(null);
  activeSubmenuId = signal<string | null>(null);
  searchQuery = signal('');
  cartItemCount = signal(0); // No badge on cart icon
  showLogoutConfirm = signal(false);
  showSearchDropdown = signal(false);
  searchHistory = signal<string[]>([]);
  showImageSearchModal = signal(false);
  imageDropActive = signal(false);
  imageUploads = signal<ImageUploadItem[]>([]);
  imageSearchLoading = signal(false);
  imageSearchError = signal<string | null>(null);
  imageSearchMessage = signal<string | null>(null);
  imageSearchKeywords = signal<string[]>([]);
  imageSearchResults = signal<ImageSearchResult[]>([]);
  imageSearchDetails = signal<ImageSearchDetail[]>([]);
  imageSearchProcessingMs = signal<number | null>(null);
  
  // Typing effect for placeholder
  placeholderText = signal('');
  placeholderIndex = 0;
  typingSpeed = 100; // milliseconds per character
  deletingSpeed = 50;
  pauseTime = 2000; // pause after typing complete
  private typingInterval?: any;
  private placeholderPhrases = [
    'Tìm tên thuốc, bệnh lý,...',
    'Omega 3',
    'Canxi',
    'Dung dịch vệ sinh',
    'Sữa rửa mặt',
    'Thuốc nhỏ mắt',
    'Men vi sinh',
    'Kem chống nắng',
    'Thuốc đau đầu',
    'Vitamin D',
    'Bệnh tiểu đường',
    'Cảm cúm',
    'Đau dạ dày'
  ];

  // Popular search keywords
  popularKeywords = signal<string[]>([
    'Omega 3',
    'Canxi',
    'Dung dịch vệ sinh',
    'Sữa rửa mặt',
    'Thuốc nhỏ mắt',
    'Men vi sinh',
    'Kẽm',
    'Kem chống nắng'
  ]);

  // Running text for outside search bar
  runningTexts = signal<string[]>([
    'Miễn phí vận chuyển cho đơn hàng từ 300.000đ',
    'Ưu đãi đặc biệt cho khách hàng mới',
    'Cam kết chất lượng 100% từ nhà sản xuất',
    'Hỗ trợ tư vấn 24/7 từ đội ngũ dược sĩ chuyên nghiệp'
  ]);
  currentRunningTextIndex = signal(0);

  // Reference to Login component
  @ViewChild(Login) loginComponent!: Login;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('imageFileInput') imageFileInput?: ElementRef<HTMLInputElement>;

  constructor(
    public categoryService: CategoryService,
    public cartService: CartService,
    private router: Router,
    private imageSearchService: ImageSearchService
  ) {}

  // Get auth state from login component
  get isLoggedIn() {
    return this.loginComponent?.isLoggedIn || signal(false);
  }

  get currentUser() {
    return this.loginComponent?.currentUser || signal(null);
  }

  // Open login popup
  openLoginPopup() {
    this.loginComponent?.openLoginPopup();
  }

  // Logout - show confirmation popup
  onLogout() {
    this.showLogoutConfirm.set(true);
  }

  confirmLogout() {
    this.showLogoutConfirm.set(false);
    this.loginComponent?.onLogout();
    // Navigate to homepage
    this.router.navigate(['/']);
  }

  cancelLogout() {
    this.showLogoutConfirm.set(false);
  }

  // Categories from service - expose as getter property
  get categories() {
    return this.categoryService.categoriesTree();
  }

  async ngOnInit() {
    // Load categories from MongoDB (or mock data)
    await this.categoryService.fetchCategories();
    console.log('📋 Categories loaded:', this.categories.length);
    
    // Reload cart to ensure fresh data
    await this.cartService.loadCart();
    console.log('🛒 Cart items loaded:', this.cartService.cartItems().length);
    
    // Load search history from localStorage
    this.loadSearchHistory();
    
    // Start running text animation
    this.startRunningTextAnimation();
  }

  loadSearchHistory() {
    try {
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        const history = JSON.parse(stored);
        this.searchHistory.set(Array.isArray(history) ? history : []);
      }
    } catch (error) {
      console.error('Error loading search history:', error);
      this.searchHistory.set([]);
    }
  }

  saveSearchHistory(query: string) {
    try {
      const history = [...this.searchHistory()];
      // Remove if already exists
      const index = history.indexOf(query);
      if (index > -1) {
        history.splice(index, 1);
      }
      // Add to beginning
      history.unshift(query);
      // Keep only last 10
      const limitedHistory = history.slice(0, 10);
      this.searchHistory.set(limitedHistory);
      localStorage.setItem('searchHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  clearSearchHistory() {
    this.searchHistory.set([]);
    localStorage.removeItem('searchHistory');
  }

  removeSearchHistoryItem(query: string) {
    const history = [...this.searchHistory()];
    const index = history.indexOf(query);
    if (index > -1) {
      history.splice(index, 1);
      this.searchHistory.set(history);
      localStorage.setItem('searchHistory', JSON.stringify(history));
    }
  }

  private runningTextInterval?: any;
  
  startRunningTextAnimation() {
    // Change text every 5 seconds
    this.runningTextInterval = setInterval(() => {
      const currentIndex = this.currentRunningTextIndex();
      const nextIndex = (currentIndex + 1) % this.runningTexts().length;
      this.currentRunningTextIndex.set(nextIndex);
    }, 5000);
  }
  
  ngOnDestroy() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
    if (this.runningTextInterval) {
      clearInterval(this.runningTextInterval);
    }
    // Cleanup image preview URLs
    this.imageUploads().forEach(item => {
      URL.revokeObjectURL(item.previewUrl);
    });
  }

  ngAfterViewInit() {
    // Setup hover events cho sidebar items
    this.setupSubmenuHoverEvents();
    
    // Start typing effect for placeholder
    this.startTypingEffect();
  }

  private startTypingEffect() {
    // Clear any existing interval
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }

    let currentPhraseIndex = 0;
    let isDeleting = false;
    let currentCharIndex = 0;

    const type = () => {
      // Check if input has focus or has value - pause effect
      const input = this.searchInput?.nativeElement;
      if (input && (document.activeElement === input || this.searchQuery().trim().length > 0)) {
        this.placeholderText.set('');
        this.typingInterval = setTimeout(type, 1000); // Check again in 1 second
        return;
      }

      const currentPhrase = this.placeholderPhrases[currentPhraseIndex];
      
      if (isDeleting) {
        // Delete characters
        this.placeholderText.set(currentPhrase.substring(0, currentCharIndex - 1));
        currentCharIndex--;
        
        if (currentCharIndex === 0) {
          isDeleting = false;
          currentPhraseIndex = (currentPhraseIndex + 1) % this.placeholderPhrases.length;
          // Pause before typing next phrase
          setTimeout(type, 500);
          return;
        }
      } else {
        // Type characters
        this.placeholderText.set(currentPhrase.substring(0, currentCharIndex + 1));
        currentCharIndex++;
        
        if (currentCharIndex === currentPhrase.length) {
          // Pause at the end before deleting
          setTimeout(() => {
            isDeleting = true;
            type();
          }, this.pauseTime);
          return;
        }
      }
      
      this.typingInterval = setTimeout(type, isDeleting ? this.deletingSpeed : this.typingSpeed);
    };

    // Start typing effect after a short delay
    setTimeout(() => {
      type();
    }, 500);
  }

  private setupSubmenuHoverEvents() {
    // ✅ Mapping HOÀN CHỈNH giữa tên danh mục và ID popup cho TẤT CẢ menu
    const submenuMap: { [key: string]: string } = {
      // === THỰC PHẨM CHỨC NĂNG ===
      'Vitamin & Khoáng chất': 'popup-vitamin-khoang-chat',
      'Sinh lý - Nội tiết tố': 'popup-sinh-ly-noi-tiet-to',
      'Cải thiện tăng cường chức năng': 'popup-cai-thien-tang-cuong-chuc-nang',
      'Hỗ trợ điều trị': 'popup-ho-tro-dieu-tri',
      'Hỗ trợ tiêu hóa': 'popup-ho-tro-tieu-hoa',
      'Thần kinh não': 'popup-than-kinh-nao',
      'Hỗ trợ làm đẹp': 'popup-ho-tro-lam-dep',
      'Sức khoẻ tim mạch': 'popup-suc-khoe-tim-mach',
      'Dinh dưỡng': 'popup-dinh-duong',
      
      // === DƯỢC MỸ PHẨM ===
      'Chăm sóc da mặt': 'popup-cham-soc-da-mat',
      'Chăm sóc cơ thể': 'popup-cham-soc-co-the',
      'Giải pháp làn da': 'popup-giai-phap-lan-da',
      'Chăm sóc tóc - da đầu': 'popup-cham-soc-toc-da-dau',
      'Mỹ phẩm trang điểm': 'popup-my-pham-trang-diem',
      'Chăm sóc da vùng mắt': 'popup-cham-soc-da-vung-mat',
      'Sản phẩm từ thiên nhiên': 'popup-san-pham-tu-thien-nhien',
      
      // === THUỐC ===
      'Tra cứu thuốc': 'popup-tra-cuu-thuoc',
      'Tra cứu dược chất': 'popup-tra-cuu-duoc-chat',
      'Tra cứu dược liệu': 'popup-tra-cuu-duoc-lieu',
      
      // === CHĂM SÓC CÁ NHÂN ===
      'Chăm sóc răng miệng': 'popup-cham-soc-rang-mieng',
      'Hỗ trợ tình dục': 'popup-ho-tro-tinh-duc',
      'Vệ sinh cá nhân': 'popup-ve-sinh-ca-nhan',
      
      // === THIẾT BỊ Y TẾ ===
      'Dụng cụ theo dõi': 'popup-dung-cu-theo-doi',
      'Dụng cụ y tế': 'popup-dung-cu-y-te',
      'Dụng cụ cơ cứu': 'popup-dung-cu-co-cuu'
    };

    // Get tất cả nav-popup-item
    const navItems = document.querySelectorAll('.nav-popup-item');
    
    navItems.forEach(item => {
      item.addEventListener('mouseenter', (e) => {
        const target = e.currentTarget as HTMLElement;
        const subcategoryName = target.getAttribute('data-subcategory-name');
        
        if (subcategoryName && submenuMap[subcategoryName]) {
          // Ẩn tất cả submenu trong popup hiện tại
          const currentPopup = target.closest('.nav-popup');
          if (currentPopup) {
            currentPopup.querySelectorAll('.nav-popup-main').forEach(popup => {
              popup.classList.remove('show');
            });
          }
          
          // Remove active từ tất cả items trong sidebar hiện tại
          const currentSidebar = target.closest('.nav-popup-sidebar');
          if (currentSidebar) {
            currentSidebar.querySelectorAll('.nav-popup-item').forEach(i => {
              i.classList.remove('active');
            });
          }
          
          // Add active cho item hiện tại
          target.classList.add('active');
          
          // Hiển thị submenu tương ứng
          const popupId = submenuMap[subcategoryName];
          const targetPopup = document.getElementById(popupId);
          if (targetPopup) {
            targetPopup.classList.add('show');
          }
        }
      });
    });
  }

  // Menu interactions
  showMenu(categoryId: string) {
    this.activeMenuId.set(categoryId);
    this.activeSubmenuId.set(null);
  }

  hideMenu() {
    setTimeout(() => {
      this.activeMenuId.set(null);
      this.activeSubmenuId.set(null);
    }, 200);
  }

  keepMenuOpen() {
    // Keep menu open when hovering over popup
  }

  showSubmenu(subcategoryId: string) {
    this.activeSubmenuId.set(subcategoryId);
  }

  isMenuActive(categoryId: string): boolean {
    return this.activeMenuId() === categoryId;
  }

  isSubmenuActive(subcategoryId: string): boolean {
    return this.activeSubmenuId() === subcategoryId;
  }

  // Search
  onSearch(query?: string) {
    const searchTerm = (query || this.searchQuery().trim());
    if (searchTerm) {
      // Save to history
      this.saveSearchHistory(searchTerm);
      
      // Close dropdown
      this.showSearchDropdown.set(false);
      
      // Navigate to products page with search query
      this.router.navigate(['/products'], {
        queryParams: { search: searchTerm }
      });
    }
  }

  // Search on input change (optional - for real-time suggestions)
  onSearchInput() {
    // Pause typing effect while user is typing
    if (this.searchQuery().trim().length > 0) {
      this.placeholderText.set('');
    }
    // Keep dropdown open when typing
    this.showSearchDropdown.set(true);
  }

  onSearchFocus() {
    this.showSearchDropdown.set(true);
    this.placeholderText.set('');
  }

  onSearchBlur() {
    // Delay closing to allow clicks on dropdown items
    setTimeout(() => {
      this.showSearchDropdown.set(false);
      // Resume typing effect if input is empty
      if (!this.searchQuery().trim()) {
        setTimeout(() => {
          this.startTypingEffect();
        }, 300);
      }
    }, 200);
  }

  selectKeyword(keyword: string) {
    this.searchQuery.set(keyword);
    this.onSearch(keyword);
  }

  selectHistoryItem(historyItem: string) {
    this.searchQuery.set(historyItem);
    this.onSearch(historyItem);
  }

  // Voice search
  onVoiceSearch() {
    console.log('Voice search activated');
    // TODO: Implement voice search
  }

  // Image search
  onImageSearch() {
    this.showImageSearchModal.set(true);
    this.imageUploads.set([]);
    this.imageSearchError.set(null);
    this.imageSearchMessage.set(null);
    this.imageSearchResults.set([]);
    this.imageSearchDetails.set([]);
  }

  closeImageSearchModal() {
    this.showImageSearchModal.set(false);
    this.imageUploads.set([]);
    this.imageSearchError.set(null);
    this.imageSearchMessage.set(null);
    this.imageDropActive.set(false);
  }

  onImageDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.imageDropActive.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleImageFiles(Array.from(files));
    }
  }

  onImageDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.imageDropActive.set(true);
  }

  onImageDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.imageDropActive.set(false);
  }

  onImageFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleImageFiles(Array.from(input.files));
      input.value = ''; // Reset input để có thể chọn lại file cùng tên
    }
  }

  handleImageFiles(files: File[]) {
    const currentUploads = this.imageUploads();
    const validFiles: ImageUploadItem[] = [];

    for (const file of files) {
      // Kiểm tra số lượng
      if (currentUploads.length + validFiles.length >= IMAGE_SEARCH_MAX_FILES) {
        alert(`Chỉ có thể tải lên tối đa ${IMAGE_SEARCH_MAX_FILES} hình ảnh.`);
        break;
      }

      // Kiểm tra loại file
      if (!file.type.startsWith('image/')) {
        alert(`File "${file.name}" không phải là hình ảnh. Vui lòng chọn file hình ảnh (JPG, PNG, etc.)`);
        continue;
      }

      // Kiểm tra kích thước
      if (file.size > IMAGE_SEARCH_MAX_SIZE) {
        alert(`File "${file.name}" quá lớn (${(file.size / 1024 / 1024).toFixed(2)}MB). Kích thước tối đa: ${IMAGE_SEARCH_MAX_SIZE / 1024 / 1024}MB`);
        continue;
      }

      // Tạo preview URL
      const previewUrl = URL.createObjectURL(file);
      const sizeLabel = file.size < 1024
        ? `${file.size} B`
        : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / 1024 / 1024).toFixed(1)} MB`;

      validFiles.push({
        file,
        previewUrl,
        sizeLabel
      });
    }

    if (validFiles.length > 0) {
      this.imageUploads.set([...currentUploads, ...validFiles]);
    }
  }

  removeImage(index: number) {
    const uploads = this.imageUploads();
    const item = uploads[index];
    if (item) {
      URL.revokeObjectURL(item.previewUrl); // Giải phóng memory
      uploads.splice(index, 1);
      this.imageUploads.set([...uploads]);
    }
  }

  async submitImageSearch() {
    const uploads = this.imageUploads();
    if (uploads.length === 0) {
      alert('Vui lòng chọn ít nhất một hình ảnh để tìm kiếm.');
      return;
    }

    this.imageSearchLoading.set(true);
    this.imageSearchError.set(null);
    this.imageSearchMessage.set(null);
    this.imageSearchResults.set([]);
    this.imageSearchDetails.set([]);
    this.imageSearchProcessingMs.set(null);

    try {
      const files = uploads.map(u => u.file);
      const startTime = Date.now();
      
      const response = await firstValueFrom(this.imageSearchService.searchByImages(files));
      const endTime = Date.now();

      if (response.success) {
        this.imageSearchKeywords.set(response.keywords || []);
        this.imageSearchResults.set(response.results || []);
        this.imageSearchDetails.set(response.details || []);
        this.imageSearchProcessingMs.set(response.processingMs || (endTime - startTime));

        if (response.message) {
          this.imageSearchMessage.set(response.message);
        }

        // Nếu có kết quả, điều hướng đến trang products với keywords
        if (response.results && response.results.length > 0) {
          setTimeout(() => {
            this.closeImageSearchModal();
            // Điều hướng đến trang products với keywords từ image search
            const keywords = response.keywords?.join(' ') || '';
            this.router.navigate(['/products'], {
              queryParams: { search: keywords, imageSearch: 'true' }
            });
          }, 2000); // Đợi 2 giây để user xem kết quả
        } else {
          this.imageSearchMessage.set('Không tìm thấy sản phẩm phù hợp. Vui lòng thử với hình ảnh khác hoặc tìm kiếm bằng từ khóa.');
        }
      } else {
        this.imageSearchError.set(response.message || 'Không thể tìm kiếm bằng hình ảnh. Vui lòng thử lại.');
      }
    } catch (error: any) {
      console.error('[Header] Image search error', error);
      this.imageSearchError.set(
        error?.error?.message || 
        error?.message || 
        'Lỗi khi tìm kiếm bằng hình ảnh. Vui lòng thử lại sau.'
      );
    } finally {
      this.imageSearchLoading.set(false);
    }
  }

  // Format price
  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN') + 'đ';
  }

  // Remove from cart (prevent dropdown close)
  async removeFromCart(event: Event, itemId: string) {
    event.stopPropagation();
    event.preventDefault();
    
    if (confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      await this.cartService.removeFromCart(itemId);
    }
  }

  // Navigate to profile when clicking user button
  navigateToProfile(event: Event) {
    event.stopPropagation();
    this.router.navigate(['/profile']);
  }

  // Navigate to orders with login check
  navigateToOrders(event: Event) {
    event.stopPropagation();
    // Check if user is logged in
    if (!this.isLoggedIn() || !this.loginComponent?.isLoggedIn) {
      event.preventDefault();
      // Open login popup
      this.openLoginPopup();
      // Show message
      setTimeout(() => {
        alert('Vui lòng đăng nhập để xem đơn hàng của bạn');
      }, 100);
    } else {
      // User is logged in, navigate normally
      this.router.navigate(['/profile/orders']);
    }
  }

  // Navigate to blog list
  navigateToBlogList() {
    this.router.navigate(['/blogs']);
  }

  // Navigate to diseases list
  navigateToDiseasesList() {
    this.router.navigate(['/diseases']);
  }
}
