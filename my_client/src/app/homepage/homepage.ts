import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { CategoryService } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { ToastService } from '../toast.service';
import { environment } from '../../environments/environment';

interface Banner {
  id: string;
  image: string;
  title?: string;
  link?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  unit?: string;
}

interface FlashSaleTimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  status: 'active' | 'upcoming' | 'ended';
  products: Product[];
}

interface Brand {
  id: string;
  name: string;
  logo: string;
  link?: string;
}

interface Blog {
  id: string;
  title: string;
  image: string;
  excerpt?: string;
  link?: string;
}

interface BlogSummary {
  id: number | string | null;
  slug: string | null;
  cleanSlug: string | null;
  url: string | null;
  title: string;
  shortDescription?: string;
  headline?: string;
  publishedAt?: string | null;
  author?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  primaryImage?: string | null;
}

interface Article {
  url: string;
  slug: string;
  title: string;
  category: string | null;
  author: string | null;
  publishDate: string | null;
  summary: string | null;
  content: string | null;
  contentText: string | null;
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
    isFeatured?: boolean;
  }>;
  tags: string[];
  hashtags: string[];
  relatedArticles: any[];
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  scrapedAt?: string;
}

@Component({
  selector: 'app-homepage',
  imports: [CommonModule, RouterModule],
  templateUrl: './homepage.html',
  styleUrl: './homepage.css',
})
export class Homepage implements OnInit, OnDestroy {
  // Hero banner slides
  heroSlides = signal([
    {
      id: '1',
      backgroundImage: '/assets/images/theme_banner/Theme_HeroBanner3.webp',
      slideImage: '/assets/images/theme_banner/HeroBanner3.webp',
      title: 'xinh khỏe',
      subtitle: 'Đẹp từ trong ra ngoài',
      badge1: { text: 'DƯỢC MỸ PHẨM', discount: 'Giảm đến 30%' },
      badge2: { text: 'HÀNG ÂU - MỸ - NHẬT', discount: 'Giảm đến 30%' },
      buttonText: 'MUA NGAY',
      dateRange: '16.10 - 26.10.2025'
    },
    {
      id: '2',
      backgroundImage: '/assets/images/theme_banner/Theme_HeroBanner1.webp',
      slideImage: '/assets/images/theme_banner/HeroBanner1.webp',
      title: 'Promotion 2',
      subtitle: 'Subtitle 2',
      badge1: { text: 'Badge 1', discount: '30%' },
      badge2: { text: 'Badge 2', discount: '30%' },
      buttonText: 'MUA NGAY',
      dateRange: ''
    },
    {
      id: '3',
      backgroundImage: '/assets/images/theme_banner/Theme_HeroBanner2.webp',
      slideImage: '/assets/images/theme_banner/HeroBanner2.webp',
      title: 'Promotion 3',
      subtitle: 'Subtitle 3',
      badge1: { text: 'ƯU ĐÃI', discount: '20%' },
      badge2: { text: 'HOT', discount: 'MỚI' },
      buttonText: 'MUA NGAY',
      dateRange: ''
    },
    {
      id: '4',
      backgroundImage: '/assets/images/theme_banner/theme_herobanner5.webp',
      slideImage: '/assets/images/theme_banner/Herobanner5.webp',
      title: 'Promotion 4',
      subtitle: 'Subtitle 4',
      badge1: { text: 'KHUYẾN MÃI', discount: '25%' },
      badge2: { text: 'HOT', discount: 'MỚI' },
      buttonText: 'MUA NGAY',
      dateRange: ''
    }
  ]);
  
  currentSlideIndex = signal(0);
  // Crossfade backgrounds: two layers A/B and a visibility flag
  bgImageA = signal('');
  bgImageB = signal('');
  isBgAVisible = signal(true);

  // Crossfade slide images (hero banner image itself)
  slideImgA = signal('');
  slideImgB = signal('');
  isSlideAVisible = signal(true);
  
  // Feature images
  featureImages = signal({
    left: '/assets/images/theme_banner/feature_banner1.webp',
    right: '/assets/images/Dephiendai/feature2.webp',
    rightBottom: '/assets/images/Dephiendai/Slide.webp'
  });
  // Feature banner carousel (left card)
  featureBannerList = signal<string[]>([
    '/assets/images/theme_banner/feature_banner1.webp',
    '/assets/images/theme_banner/feature_banner2.webp',
    '/assets/images/theme_banner/feature_banner3.webp',
    '/assets/images/theme_banner/feature_banner4.webp'
  ]);
  featureIndex = signal(0);
  
  // Map banner images to product IDs (for click navigation)
  featureBannerProductMap: { [key: string]: string } = {
    '/assets/images/theme_banner/feature_banner1.webp': '68f1de3a44d747b5d5d88708',
    '/assets/images/theme_banner/feature_banner2.webp': '68f1de3b44d747b5d5d89728',
    '/assets/images/theme_banner/feature_banner3.webp': '68f1de3c44d747b5d5d8a395',
    '/assets/images/theme_banner/feature_banner4.webp': '68f1de3b44d747b5d5d898f3'
  };
  
  // Crossfade feature banners
  featureImgA = signal('/assets/images/theme_banner/feature_banner1.webp');
  featureImgB = signal('/assets/images/theme_banner/feature_banner1.webp');
  isFeatureImgAVisible = signal(true);
  
  subBanners = signal([
    {
      id: '1',
      title: 'Hỗ trợ, long đờm, giảm đau rát họng',
      discount: '',
      image: '/assets/images/Dephiendai/Storytelling.webp',
      buttonText: 'MUA NGAY'
    },
    {
      id: '2',
      title: 'Flash Sale',
      discount: '20%',
      image: '/assets/images/Dephiendai/Slide2.webp',
      buttonText: 'XEM NGAY'
    }
  ]);
  

  // Marketing banners (3 small banners below hero)
  marketingBanners = signal<Banner[]>([
    { id: '1', image: '/assets/images/theme_banner/Theme_HeroBanner1.webp', link: '/products' },
    { id: '2', image: '/assets/images/theme_banner/Theme_HeroBanner2.webp', link: '/products' },
    { id: '3', image: '/assets/images/theme_banner/Theme_HeroBanner3.webp', link: '/products' }
  ]);

  // Flash sale
  flashSaleBanner = signal('https://cdn.nhathuoclongchau.com.vn/unsafe/2560x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/D_Banner_Flashsale_1216x120_HP_acc3a4a7ac.png');
  mecaImage = signal('/assets/images/MECA/MECA_fly.PNG');
  
  // Flash sale time slots
  flashSaleTimeSlots = signal<FlashSaleTimeSlot[]>([]);
  currentFlashSaleSlot = signal<FlashSaleTimeSlot | null>(null);
  currentFlashSaleIndex = signal(0);
  flashSaleEndTime = signal(new Date(Date.now() + 24 * 60 * 60 * 1000));
  countdown = signal({ hours: 0, minutes: 0, seconds: 0 });
  timeSlotCountdown = signal<{ [key: string]: { hours: number; minutes: number; seconds: number } }>({});

  // Products
  flashSaleProducts = signal<Product[]>([]);
  flashSaleLoading = signal<boolean>(false);
  allFlashSaleProducts = signal<Product[]>([]); // Store all flash sale products for reuse
  bestSellerProducts = signal<Product[]>([]);
  featuredProductsToday = signal<Product[]>([]);
  featuredProductsTodayLoading = signal<boolean>(false);
  bestSellerLoading = signal<boolean>(false);
  hotProducts = signal<Product[]>([]);
  
  // Recently Viewed Products
  recentlyViewed = signal<Product[]>([]);
  currentSlide = signal<number>(0);

  // Health Corner Articles
  healthCornerArticles = signal<BlogSummary[]>([]);
  healthCornerLoading = signal<boolean>(false);
  mainArticle = signal<BlogSummary | null>(null);
  sidebarArticles = signal<BlogSummary[]>([]);
  
  // Featured categories - matching the image design
  featuredCategories = signal<Array<{ id: string; name: string; icon: string; slug: string }>>([]);
  
  // Specialized Disease Groups
  specializedGroups = signal<Array<{ id: string; name: string; icon: string; image?: string | null; count: number }>>([]);
  specializedGroupsLoading = signal<boolean>(false);
  private readonly specializedGroupImageMap: Record<string, string> = {
    'ung thu': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Ung_thu_637f743959.png',
    'tim mach': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tim_mach_f058f1eba6.png',
    'noi tiet - chuyen hoa': '/assets/images/icon/Noi_tiet_Chuyen_hoa.png',
    'co - xuong - khop': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Co_Xuong_Khop_5ae32d7e8c.png',
    'da - toc - mong': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Da_Toc_Mong_5e78940b9b.png',
    'mau': '/assets/images/icon/Mau_cfd65af040.png',
    'ho hap': '/assets/images/icon/Hohap.png',
    'di ung': '/assets/images/icon/Di_ung_aee305cf33.png',
    'mat': '/assets/images/icon/Than_tiet_nieu.png',
    'rang - ham - mat': '/assets/images/icon/Rang_Ham_Mat_ce54f37000.png',
    'suc khoe gioi tinh': '/assets/images/icon/Suc_khoe_gioi_tinh_38600ad2ff.png',
    'suc khoe sinh san': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Suc_khoe_sinh_san_14716c7662.png',
    'tai - mui - hong': '/assets/images/icon/Tai_Mui_Hong.png',
    'tam than': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tam_than_ef11f87348.png',
    'than - tiet nieu': '/assets/images/icon/Than_tiet_nieu.png',
    'than kinh - tinh than': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Than_kinh_Tinh_than_fix_7b3acc213f.png',
    'tieu hoa': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tieu_hoa_703881d880.png',
    'truyen nhiem': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Truyen_nhiem_87bd778b6d.png'
  };
  private readonly excludedSpecializedGroupNames = new Set<string>([
    'dau',
    'bung',
    'tu chi',
    'nguc',
    'da',
    'sinh duc',
    'co',
    'benh tre em',
    'benh thuong gap',
    'benh nu gioi',
    'nhom benh',
    'xem theo bo phan co the',
    'benh nam gioi',
    'benh nguoi gia',
    'benh theo mua'
  ]);

  private normalizeSpecializedGroupName(name: string): string {
    if (!name) {
      return '';
    }

    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  private getSpecializedGroupImage(name: string, id?: string): string | null {
    const normalizedName = this.normalizeSpecializedGroupName(name);
    let imageUrl: string | null = null;
    
    if (normalizedName && this.specializedGroupImageMap[normalizedName]) {
      imageUrl = this.specializedGroupImageMap[normalizedName];
    } else if (id) {
      // Try to match by ID if name doesn't match
      const normalizedFromId = this.normalizeSpecializedGroupName(id.replace(/-/g, ' '));
      if (normalizedFromId && this.specializedGroupImageMap[normalizedFromId]) {
        imageUrl = this.specializedGroupImageMap[normalizedFromId];
      }
    }
    
    // Clean CDN wrapper from URL if present
    if (imageUrl) {
      return this.cleanImageUrl(imageUrl);
    }
    
    return null;
  }

  // Clean CDN wrapper from image URLs
  private cleanImageUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return url;
    }
    
    // Pattern to match: https://cdn.nhathuoclongchau.com.vn/unsafe/.../filters:quality(...)/https://...
    const cdnPattern = /^https:\/\/cdn\.nhathuoclongchau\.com\.vn\/unsafe\/[^/]+\/filters:quality\([^)]+\)\/(https?:\/\/.+)$/;
    const match = url.trim().match(cdnPattern);
    
    if (match && match[1]) {
      // Return the original URL (the part after the CDN wrapper)
      return match[1];
    }
    
    // If no match, return original URL
    return url;
  }

  showAllSpecializedGroups = signal<boolean>(false);

  filteredSpecializedGroups = computed(() => {
    const groups = this.specializedGroups();
    if (!groups || groups.length === 0) {
      return [] as Array<{ id: string; name: string; icon: string; image?: string | null; count: number }>;
    }
    return groups.filter(group => {
      const normalized = this.normalizeSpecializedGroupName(group.name);
      return !this.excludedSpecializedGroupNames.has(normalized);
    });
  });

  displayedSpecializedGroups = computed(() => {
    const groups = this.filteredSpecializedGroups();
    if (!groups || groups.length === 0) {
      return [] as Array<{ id: string; name: string; icon: string; image?: string | null; count: number }>;
    }
    return this.showAllSpecializedGroups()
      ? groups
      : groups.slice(0, 8);
  });

  remainingSpecializedGroupCount = computed(() => {
    const total = this.filteredSpecializedGroups().length;
    const displayed = this.displayedSpecializedGroups().length;
    return total > displayed ? total - displayed : 0;
  });

  showMoreSpecializedGroupsVisible = computed(() => this.filteredSpecializedGroups().length > 8);

  showMoreSpecializedGroupsLabel = computed(() => {
    if (this.showAllSpecializedGroups()) {
      return 'Thu gọn';
    }
    const remaining = this.remainingSpecializedGroupCount();
    return remaining > 0 ? `Xem thêm ${remaining} nhóm bệnh` : '';
  });
  
  // Featured category definitions - will be matched with database categories
  private featuredCategoryNames = [
    'Thần kinh não',
    'Vitamin & Khoáng chất',
    'Sức khỏe tim mạch',
    'Tăng sức đề kháng, miễn dịch',
    'Hỗ trợ tiêu hóa',
    'Sinh lý - Nội tiết tố',
    'Dinh dưỡng',
    'Giải pháp làn da',
    'Chăm sóc da mặt',
    'Hỗ trợ làm đẹp'
  ];
  
  private featuredCategoryIcons: { [key: string]: string } = {
    'Thần kinh não': '/assets/images/icon/ThanKinhNao.png',
    'Vitamin & Khoáng chất': '/assets/images/icon/Vitamin.png',
    'Sức khỏe tim mạch': '/assets/images/icon/Tim.png',
    'Tăng sức đề kháng, miễn dịch': '/assets/images/icon/DeKhang.png',
    'Hỗ trợ tiêu hóa': '/assets/images/icon/Tieuhoa.png',
    'Sinh lý - Nội tiết tố': '/assets/images/icon/SinhLy.png',
    'Dinh dưỡng': '/assets/images/icon/DinhDuong.png',
    'Giải pháp làn da': '/assets/images/icon/giaiphaplanda.png',
    'Chăm sóc da mặt': '/assets/images/icon/chamsocdamat.png',
    'Hỗ trợ làm đẹp': '/assets/images/icon/lamdep.png'
  };
  
  // Quick Access Icons
  quickAccess = signal([
    { id: '1', name: 'Cần mua thuốc', icon: '/assets/images/icon/tracuuthuoc.png', link: '/products' },
    { id: '2', name: 'Tư vấn với Dược sĩ', icon: '/assets/images/icon/duocsiThinh.jpg', link: '/contact' },
    { id: '3', name: 'Đổi trả hàng', icon: '/assets/images/icon/trade.png', link: '/returns' },
    { id: '4', name: 'Tra cứu đơn thuốc', icon: '/assets/images/icon/document.png', link: '/prescription' }
  ]);

  // Brands
  brands = signal<Brand[]>([
    { id: '1', name: 'Jpanwell', logo: '/assets/images/thuonghieu/Jpanwell.webp', link: '/brands/jpanwell' },
    { id: '2', name: 'VKENKO', logo: '/assets/images/thuonghieu/VKENKO.webp', link: '/brands/vkenko' },
    { id: '3', name: 'Vitamins For Life', logo: '/assets/images/thuonghieu/Vitamins_For_Life.webp', link: '/brands/vitamins-for-life' },
    { id: '4', name: 'Brauer', logo: '/assets/images/thuonghieu/brauer.webp', link: '/brands/brauer' }
  ]);

  // Blogs
  blogs = signal<Blog[]>([
    { id: '1', title: 'Góc sức khỏe 1', image: '/assets/images/blog/gocsuckhoe1.webp', excerpt: 'Mẹo chăm sóc sức khỏe hàng ngày', link: '/blogs/1' },
    { id: '2', title: 'Góc sức khỏe 2', image: '/assets/images/blog/gocsuckhoe2.webp', excerpt: 'Dinh dưỡng hợp lý cho cơ thể', link: '/blogs/2' },
    { id: '3', title: 'Góc sức khỏe 3', image: '/assets/images/blog/gocsuckhoe3.webp', excerpt: 'Vitamin thiết yếu cho sức khỏe', link: '/blogs/3' },
    { id: '4', title: 'Góc sức khỏe 4', image: '/assets/images/blog/gocsuckhoe4.webp', excerpt: 'Cách phòng ngừa bệnh tật', link: '/blogs/4' },
    { id: '5', title: 'Góc sức khỏe 5', image: '/assets/images/blog/gocsuckhoe5.webp', excerpt: 'Chăm sóc sức khỏe mùa đông', link: '/blogs/5' },
    { id: '6', title: 'Góc sức khỏe 6', image: '/assets/images/blog/gocsuckhoe6.webp', excerpt: 'Tips làm đẹp từ thiên nhiên', link: '/blogs/6' }
  ]);

  constructor(
    public categoryService: CategoryService,
    private cartService: CartService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Load categories
    await this.categoryService.fetchCategories();
    
    // Load featured categories from database
    this.loadFeaturedCategories();
    
    // Load banners from API
    await this.loadBanners();
    
    // Load products from API
    await this.loadFlashSaleProducts();
      // Load best sellers after flash sale products are loaded
      setTimeout(() => {
        this.loadBestSellerProducts();
        this.loadFeaturedProductsToday();
      }, 500);
      this.loadHotProducts();
      
      // Load recently viewed products
      this.loadRecentlyViewed();

    // Load health corner articles
    this.loadHealthCornerArticles();
    
    // Load specialized disease groups
    this.loadSpecializedGroups();

    // Initialize background layers
    const initialBg = this.heroSlides()[this.currentSlideIndex()].backgroundImage;
    this.bgImageA.set(initialBg);
    this.bgImageB.set(initialBg);

    const initialSlideImg = this.heroSlides()[this.currentSlideIndex()].slideImage;
    this.slideImgA.set(initialSlideImg);
    this.slideImgB.set(initialSlideImg);

    // Initialize feature banner images
    const initialFeatureImg = this.featureBannerList()[this.featureIndex()];
    this.featureImgA.set(initialFeatureImg);
    this.featureImgB.set(initialFeatureImg);
    this.featureImages.set({
      left: initialFeatureImg,
      right: this.featureImages().right,
      rightBottom: this.featureImages().rightBottom
    });

    // Start countdown timer
    this.startCountdown();
    
    // Start time slot countdown
    this.startTimeSlotCountdown();

    // Start slide rotation
    this.startSlideRotation();
    
    // Start feature banner auto-play
    this.startFeatureBannerAutoPlay();
  }

  // Slide rotation
  private slideRotationInterval?: any;
  private featureBannerInterval?: any;

  startSlideRotation() {
    // Clear existing interval if any
    if (this.slideRotationInterval) {
      clearInterval(this.slideRotationInterval);
    }
    
    this.slideRotationInterval = setInterval(() => {
      const current = this.currentSlideIndex();
      const total = this.heroSlides().length;
      this.changeSlideWithFade((current + 1) % total);
    }, 5000); // 5 seconds
  }

  // Feature banner auto-play
  startFeatureBannerAutoPlay() {
    // Clear existing interval if any
    if (this.featureBannerInterval) {
      clearInterval(this.featureBannerInterval);
    }
    
    this.featureBannerInterval = setInterval(() => {
      const next = (this.featureIndex() + 1) % this.featureBannerList().length;
      this.nextFeatureBanner();
    }, 4000); // 4 seconds
  }

  // Pause feature banner auto-play (call on hover)
  pauseFeatureBannerAutoPlay() {
    if (this.featureBannerInterval) {
      clearInterval(this.featureBannerInterval);
      this.featureBannerInterval = undefined;
    }
  }

  // Resume feature banner auto-play (call on mouse leave)
  resumeFeatureBannerAutoPlay() {
    if (!this.featureBannerInterval) {
      this.startFeatureBannerAutoPlay();
    }
  }

  nextSlide() {
    const current = this.currentSlideIndex();
    const total = this.heroSlides().length;
    this.changeSlideWithFade((current + 1) % total);
  }

  prevSlide() {
    const current = this.currentSlideIndex();
    const total = this.heroSlides().length;
    this.changeSlideWithFade((current - 1 + total) % total);
  }

  goToSlide(index: number) {
    this.changeSlideWithFade(index);
  }

  // Change slide with crossfade animation
  changeSlideWithFade(index: number) {
    if (index === this.currentSlideIndex()) return;

    // Put next background image onto the hidden layer
    if (this.isBgAVisible()) {
      this.bgImageB.set(this.heroSlides()[index].backgroundImage);
    } else {
      this.bgImageA.set(this.heroSlides()[index].backgroundImage);
    }

    // Put next slide image onto the hidden layer
    if (this.isSlideAVisible()) {
      this.slideImgB.set(this.heroSlides()[index].slideImage);
    } else {
      this.slideImgA.set(this.heroSlides()[index].slideImage);
    }

    // Update slide index (for slide content)
    this.currentSlideIndex.set(index);

    // Toggle visibility to trigger crossfade (background + slide image)
    this.isBgAVisible.set(!this.isBgAVisible());
    this.isSlideAVisible.set(!this.isSlideAVisible());
  }

  // ========== Feature banner (left) navigation ==========
  nextFeatureBanner() {
    const next = (this.featureIndex() + 1) % this.featureBannerList().length;
    
    // Put next image on hidden layer
    if (this.isFeatureImgAVisible()) {
      this.featureImgB.set(this.featureBannerList()[next]);
    } else {
      this.featureImgA.set(this.featureBannerList()[next]);
    }
    
    // Update index
    this.featureIndex.set(next);
    
    // Update featureImages for compatibility
    this.featureImages.set({
      left: this.featureBannerList()[next],
      right: this.featureImages().right,
      rightBottom: this.featureImages().rightBottom
    });
    
    // Toggle visibility to trigger crossfade
    this.isFeatureImgAVisible.set(!this.isFeatureImgAVisible());
    
    // Reset auto-play timer when user manually navigates
    this.startFeatureBannerAutoPlay();
  }

  prevFeatureBanner() {
    const total = this.featureBannerList().length;
    const prev = (this.featureIndex() - 1 + total) % total;
    
    // Put prev image on hidden layer
    if (this.isFeatureImgAVisible()) {
      this.featureImgB.set(this.featureBannerList()[prev]);
    } else {
      this.featureImgA.set(this.featureBannerList()[prev]);
    }
    
    // Update index
    this.featureIndex.set(prev);
    
    // Update featureImages for compatibility
    this.featureImages.set({
      left: this.featureBannerList()[prev],
      right: this.featureImages().right,
      rightBottom: this.featureImages().rightBottom
    });
    
    // Toggle visibility to trigger crossfade
    this.isFeatureImgAVisible.set(!this.isFeatureImgAVisible());
    
    // Reset auto-play timer when user manually navigates
    this.startFeatureBannerAutoPlay();
  }

  goToFeatureBanner(index: number) {
    if (index === this.featureIndex()) return;
    
    // Put target image on hidden layer
    if (this.isFeatureImgAVisible()) {
      this.featureImgB.set(this.featureBannerList()[index]);
    } else {
      this.featureImgA.set(this.featureBannerList()[index]);
    }
    
    // Update index
    this.featureIndex.set(index);
    
    // Update featureImages for compatibility
    this.featureImages.set({
      left: this.featureBannerList()[index],
      right: this.featureImages().right,
      rightBottom: this.featureImages().rightBottom
    });
    
    // Toggle visibility to trigger crossfade
    this.isFeatureImgAVisible.set(!this.isFeatureImgAVisible());
    
    // Reset auto-play timer when user manually navigates
    this.startFeatureBannerAutoPlay();
  }

  // Countdown timer
  startCountdown() {
    setInterval(() => {
      const now = new Date().getTime();
      const end = this.flashSaleEndTime().getTime();
      const distance = end - now;

      if (distance > 0) {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        this.countdown.set({ hours, minutes, seconds });
      }
    }, 1000);
  }

  // Calculate and update time slot countdowns in realtime
  startTimeSlotCountdown() {
    setInterval(() => {
      const slots = this.flashSaleTimeSlots();
      const countdowns: { [key: string]: { hours: number; minutes: number; seconds: number } } = {};
      const now = new Date();
      const currentYear = now.getFullYear();
      let needsUpdate = false;
      let updatedSlots: FlashSaleTimeSlot[] = [...slots];
      
      slots.forEach((slot, index) => {
        const [day, month] = slot.date.split('/').map(Number);
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        
        // Create date objects for start and end times
        const slotDate = new Date(currentYear, month - 1, day);
        const startTime = new Date(slotDate);
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date(slotDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        // Handle year rollover for dates in the past
        if (slotDate < now && (slotDate.getMonth() < now.getMonth() || (slotDate.getMonth() === now.getMonth() && slotDate.getDate() < now.getDate()))) {
          slotDate.setFullYear(currentYear + 1);
          startTime.setFullYear(currentYear + 1);
          endTime.setFullYear(currentYear + 1);
        }
        
        // Update slot status
        let newStatus: 'active' | 'upcoming' | 'ended' = slot.status;
        if (now >= startTime && now < endTime) {
          newStatus = 'active';
          // Calculate time until end
          const distance = endTime.getTime() - now.getTime();
          
          if (distance > 0) {
            // Calculate total hours (not just remainder of day)
            const totalHours = Math.floor(distance / (1000 * 60 * 60));
            const hours = totalHours % 24; // Hours in current day
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            // For display, show total hours if > 24, otherwise show hours within day
            countdowns[slot.id] = { 
              hours: totalHours >= 24 ? totalHours : hours, 
              minutes, 
              seconds 
            };
          } else {
            countdowns[slot.id] = { hours: 0, minutes: 0, seconds: 0 };
          }
        } else if (now < startTime) {
          newStatus = 'upcoming';
          // Calculate time until start
          const distance = startTime.getTime() - now.getTime();
          
          if (distance > 0) {
            // Calculate total hours (not just remainder of day)
            const totalHours = Math.floor(distance / (1000 * 60 * 60));
            const hours = totalHours % 24; // Hours in current day
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            // For display, show total hours if > 24, otherwise show hours within day
            countdowns[slot.id] = { 
              hours: totalHours >= 24 ? totalHours : hours, 
              minutes, 
              seconds 
            };
          }
        } else {
          // Slot has ended
          newStatus = 'ended';
        }
        
        // Update slot status if changed
        if (newStatus !== slot.status) {
          updatedSlots[index] = { ...slot, status: newStatus };
          needsUpdate = true;
        }
        
        // Mark for removal if slot has ended
        if (now >= endTime) {
          needsUpdate = true;
        }
      });
      
      // Remove ended slots and add new ones
      if (needsUpdate) {
        // Filter out ended slots
        const activeSlots = updatedSlots.filter(slot => {
          const [day, month] = slot.date.split('/').map(Number);
          const [endHour, endMinute] = slot.endTime.split(':').map(Number);
          const slotDate = new Date(currentYear, month - 1, day);
          const endTime = new Date(slotDate);
          endTime.setHours(endHour, endMinute, 0, 0);
          
          // Handle year rollover
          if (slotDate < now && (slotDate.getMonth() < now.getMonth() || (slotDate.getMonth() === now.getMonth() && slotDate.getDate() < now.getDate()))) {
            endTime.setFullYear(currentYear + 1);
          }
          
          return now < endTime; // Keep slots that haven't ended
        });
        
        // Add new slots to maintain 3 slots
        const allProducts = this.allFlashSaleProducts();
        while (activeSlots.length < 3 && allProducts.length > 0) {
          // Find the latest date from existing slots
          let latestDate = new Date();
          if (activeSlots.length > 0) {
            const lastSlot = activeSlots[activeSlots.length - 1];
            const [day, month] = lastSlot.date.split('/').map(Number);
            latestDate = new Date(currentYear, month - 1, day);
            // If date is in the past, assume next year
            if (latestDate < now) {
              latestDate.setFullYear(currentYear + 1);
            }
            // Add 1 day
            latestDate.setDate(latestDate.getDate() + 1);
          }
          
          // Create new slot
          const newSlotId = String(activeSlots.length + 1);
          const productStartIndex = (activeSlots.length * 3) % allProducts.length;
          const newSlot: FlashSaleTimeSlot = {
            id: newSlotId,
            startTime: '08:00',
            endTime: '22:00',
            date: this.formatDate(latestDate),
            status: this.calculateSlotStatus(latestDate, '08:00', '22:00'),
            products: allProducts.slice(productStartIndex, productStartIndex + 6)
          };
          
          activeSlots.push(newSlot);
        }
        
        // Update slots
        this.flashSaleTimeSlots.set(activeSlots);
        
        // Update current slot if it was removed
        const currentSlot = this.currentFlashSaleSlot();
        if (currentSlot) {
          const stillExists = activeSlots.find(s => s.id === currentSlot.id);
          if (!stillExists) {
            // Current slot ended, switch to first active slot
            if (activeSlots.length > 0) {
              this.currentFlashSaleIndex.set(0);
              this.currentFlashSaleSlot.set(activeSlots[0]);
              this.flashSaleProducts.set(activeSlots[0].products);
            }
          }
        }
      }
      
      this.timeSlotCountdown.set(countdowns);
    }, 1000);
  }

  // Load banners from API
  async loadBanners() {
    try {
      const response = await fetch(`${environment.apiUrl}/api/banners?position=homepage`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Banners API Response:', data);
      
      if (data.success && data.data && Array.isArray(data.data)) {
        // Load hero banners
        const heroBanners = data.data.filter((banner: any) => banner.type === 'hero');
        if (heroBanners.length > 0) {
          const heroSlides = heroBanners.map((banner: any) => {
            // Logic to prevent old images from showing:
            // - If backgroundImage exists, use it (don't fallback to image)
            // - If slideImage exists, use it (don't fallback to image)
            // - Only use image if both backgroundImage and slideImage are empty
            const backgroundImage = banner.backgroundImage || banner.background_image || '';
            const slideImage = banner.slideImage || banner.slide_image || '';
            const fallbackImage = banner.image || '';
            
            // Determine final values
            let finalBackgroundImage = '';
            let finalSlideImage = '';
            
            if (backgroundImage) {
              // If backgroundImage exists, use it (don't use image)
              finalBackgroundImage = backgroundImage;
            } else if (!slideImage && fallbackImage) {
              // Only use image if no backgroundImage and no slideImage
              finalBackgroundImage = fallbackImage;
            }
            
            if (slideImage) {
              // If slideImage exists, use it (don't use image)
              finalSlideImage = slideImage;
            } else if (!backgroundImage && fallbackImage) {
              // Only use image if no slideImage and no backgroundImage
              finalSlideImage = fallbackImage;
            }
            
            return {
              id: banner.id,
              backgroundImage: finalBackgroundImage,
              slideImage: finalSlideImage,
              title: banner.title || '',
              subtitle: banner.subtitle || '',
              badge1: banner.badge1 || null,
              badge2: banner.badge2 || null,
              buttonText: banner.buttonText || banner.button_text || 'MUA NGAY',
              dateRange: banner.dateRange || banner.date_range || ''
            };
          });
          this.heroSlides.set(heroSlides);
          
          // Initialize background layers with first hero banner
          if (heroSlides.length > 0) {
            const initialBg = heroSlides[0].backgroundImage;
            this.bgImageA.set(initialBg);
            this.bgImageB.set(initialBg);
            
            const initialSlideImg = heroSlides[0].slideImage;
            this.slideImgA.set(initialSlideImg);
            this.slideImgB.set(initialSlideImg);
          }
        }
        
        // Load feature banners
        const featureBanners = data.data.filter((banner: any) => banner.type === 'feature');
        if (featureBanners.length > 0) {
          const featureBannerImages = featureBanners.map((banner: any) => banner.image || '');
          this.featureBannerList.set(featureBannerImages);
          
          // Update product map for feature banners
          const newProductMap: { [key: string]: string } = { ...this.featureBannerProductMap }; // Keep default mappings
          featureBanners.forEach((banner: any, index: number) => {
            if (banner.image) {
              // Banner đầu tiên (index 0) luôn điều hướng đến product ID 68f1de3a44d747b5d5d88708
              if (index === 0) {
                newProductMap[banner.image] = '68f1de3a44d747b5d5d88708';
              }
              // Banner thứ 3 (index 2) luôn điều hướng đến product ID 68f1de3c44d747b5d5d8a395
              else if (index === 2) {
                newProductMap[banner.image] = '68f1de3c44d747b5d5d8a395';
              }
              else if (banner.productId) {
                newProductMap[banner.image] = banner.productId;
              }
            }
          });
          this.featureBannerProductMap = newProductMap;
          
          // Initialize feature banner images
          if (featureBannerImages.length > 0) {
            const initialFeatureImg = featureBannerImages[0];
            this.featureImgA.set(initialFeatureImg);
            this.featureImgB.set(initialFeatureImg);
            this.featureImages.set({
              left: initialFeatureImg,
              right: this.featureImages().right,
              rightBottom: this.featureImages().rightBottom
            });
          }
        }
        
        // Load sub banners
        const subBanners = data.data.filter((banner: any) => banner.type === 'sub');
        if (subBanners.length > 0) {
          const subBannerList = subBanners.map((banner: any) => ({
            id: banner.id,
            title: banner.title || '',
            discount: banner.discount || '',
            image: banner.image || '',
            buttonText: banner.buttonText || 'MUA NGAY'
          }));
          this.subBanners.set(subBannerList);
        }
        
        // Load marketing banners
        const marketingBanners = data.data.filter((banner: any) => banner.type === 'marketing');
        if (marketingBanners.length > 0) {
          const marketingBannerList = marketingBanners.map((banner: any) => ({
            id: banner.id,
            image: banner.image || '',
            link: banner.link || banner.productId ? `/product/${banner.productId}` : '/products',
            title: banner.title || ''
          }));
          this.marketingBanners.set(marketingBannerList);
        }
        
        console.log(`✅ Loaded ${heroBanners.length} hero banners, ${featureBanners.length} feature banners, ${subBanners.length} sub banners, ${marketingBanners.length} marketing banners`);
      }
    } catch (error) {
      console.error('❌ Error loading banners:', error);
      // Keep default banners if API fails
    }
  }

  // Load Flash Sale products from API
  async loadFlashSaleProducts() {
    this.flashSaleLoading.set(true);
    
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Limit to 500 products for better performance
      const response = await fetch(`${environment.apiUrl}/api/products?limit=500`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Flash Sale API Response:', data);
      
      if (data.success && data.data && Array.isArray(data.data)) {
        console.log(`📊 Total products from API: ${data.data.length}`);
        
        // Log sample products to see structure
        if (data.data.length > 0) {
          console.log('📦 Sample product structure (first 3):', data.data.slice(0, 3).map((p: any) => ({
            _id: p._id,
            name: p.name,
            price: p.price,
            original_price: p.original_price,
            discount: p.discount,
            is_flashsale: p.is_flashsale,
            hasDiscount: !!p.discount,
            hasOriginalPrice: !!p.original_price,
            priceDiff: p.original_price && p.price ? p.original_price - p.price : 0
          })));
          
          // Count products with different conditions
          const withDiscount = data.data.filter((p: any) => p.discount && p.discount > 0).length;
          const withOriginalPrice = data.data.filter((p: any) => p.original_price && p.price && p.original_price > p.price).length;
          const withFlashsaleFlag = data.data.filter((p: any) => p.is_flashsale === true).length;
          
          console.log('📊 Product statistics:', {
            total: data.data.length,
            withDiscount: withDiscount,
            withOriginalPriceGreater: withOriginalPrice,
            withFlashsaleFlag: withFlashsaleFlag
          });
        }
        
        // Filter and map products with discount - more flexible approach
        let flashSaleProductsData = data.data
          .map((p: any) => {
            // Calculate discount percentage
            let discountPercent = 0;
            let hasValidDiscount = false;
            
            // Priority 1: If discount field exists (even if > 100, we'll recalculate)
            if (p.discount && typeof p.discount === 'number' && p.discount > 0) {
              if (p.discount <= 100) {
                // Valid percentage, use it directly
                discountPercent = Math.round(p.discount);
                hasValidDiscount = true;
              } else if (p.original_price && p.price && p.original_price > p.price) {
                // Discount > 100, recalculate from prices
                discountPercent = Math.round(((p.original_price - p.price) / p.original_price) * 100);
                discountPercent = Math.max(0, Math.min(100, discountPercent));
                hasValidDiscount = discountPercent > 0;
              } else {
                // Has discount but can't calculate, use a default small discount
                discountPercent = Math.min(10, Math.round(p.discount / 1000)); // Approximate
                hasValidDiscount = discountPercent > 0;
              }
            }
            
            // Priority 2: Calculate from original_price and price
            if (!hasValidDiscount && p.original_price && p.price && p.original_price > p.price) {
              discountPercent = Math.round(((p.original_price - p.price) / p.original_price) * 100);
              discountPercent = Math.max(0, Math.min(100, discountPercent));
              hasValidDiscount = discountPercent > 0;
            }
            
            // Priority 3: If is_flashsale flag is true, try to show it
            if (!hasValidDiscount && p.is_flashsale === true) {
              if (p.original_price && p.price && p.original_price > p.price) {
                // Calculate from prices
                discountPercent = Math.round(((p.original_price - p.price) / p.original_price) * 100);
                discountPercent = Math.max(0, Math.min(100, discountPercent));
                hasValidDiscount = discountPercent > 0;
              } else {
                // Has flashsale flag but no price difference, set a default discount
                discountPercent = 10; // Default 10% discount
                hasValidDiscount = true;
              }
            }
            
            // Only return products that qualify for flash sale
            if (!hasValidDiscount) {
              return null;
            }
            
            return {
              id: p._id,
              name: p.name,
              price: p.price,
              originalPrice: p.original_price || p.price,
              discount: discountPercent,
              image: p.image || '',
              unit: p.unit
            };
          })
          // Filter out null values
          .filter((p: Product | null): p is Product => p !== null);
        
        // If still no products, take first products with any discount or is_flashsale flag
        if (flashSaleProductsData.length === 0) {
          console.log('⚠️ No products with calculated discount, using products with is_flashsale flag or discount field');
          flashSaleProductsData = data.data
            .filter((p: any) => {
              // Take products with is_flashsale flag or discount field (even if > 100)
              return (p.is_flashsale === true) || 
                     (p.discount && p.discount > 0) ||
                     (p.original_price && p.price && p.original_price > p.price);
            })
            .slice(0, 20) // Limit to first 20
            .map((p: any) => {
              let discountPercent = 0;
              
              // Try to calculate discount
              if (p.discount && typeof p.discount === 'number' && p.discount > 0 && p.discount <= 100) {
                discountPercent = Math.round(p.discount);
              } else if (p.original_price && p.price && p.original_price > p.price) {
                discountPercent = Math.round(((p.original_price - p.price) / p.original_price) * 100);
                discountPercent = Math.max(0, Math.min(100, discountPercent));
              } else {
                // Default discount for flash sale products
                discountPercent = 15;
              }
              
              return {
                id: p._id,
                name: p.name,
                price: p.price,
                originalPrice: p.original_price || p.price,
                discount: discountPercent,
                image: p.image || '',
                unit: p.unit
              };
            });
        }
        
        // Final fallback: if still no products, take first 20 products and assign default discount
        if (flashSaleProductsData.length === 0) {
          console.log('⚠️ Still no products found, using first 20 products with default discount');
          flashSaleProductsData = data.data
            .slice(0, 20)
            .map((p: any) => {
              let discountPercent = 20; // Default 20% discount
              
              // Try to calculate if possible
              if (p.original_price && p.price && p.original_price > p.price) {
                discountPercent = Math.round(((p.original_price - p.price) / p.original_price) * 100);
                discountPercent = Math.max(10, Math.min(100, discountPercent)); // At least 10%
              } else if (p.discount && typeof p.discount === 'number' && p.discount > 0) {
                if (p.discount <= 100) {
                  discountPercent = Math.round(p.discount);
                } else {
                  discountPercent = 20; // Use default if discount > 100
                }
              }
              
              return {
                id: p._id,
                name: p.name,
                price: p.price,
                originalPrice: p.original_price || Math.round(p.price * 1.25), // Create original price if missing
                discount: discountPercent,
                image: p.image || '',
                unit: p.unit
              };
            });
        }
        
        console.log(`✅ Found ${flashSaleProductsData.length} flash sale products after filtering`);
        
        // Log first few products for debugging
        if (flashSaleProductsData.length > 0) {
          console.log('📦 First 3 flash sale products:', flashSaleProductsData.slice(0, 3));
        } else {
          // Log detailed analysis of why products were filtered out
          const sampleAnalysis = data.data.slice(0, 10).map((p: any) => {
            let reason = '';
            if (!p.discount || p.discount <= 0) {
              reason += 'No discount field or <= 0; ';
            }
            if (!p.original_price || !p.price || p.original_price <= p.price) {
              reason += 'No original_price > price; ';
            }
            if (p.is_flashsale !== true) {
              reason += 'Not flagged as flashsale; ';
            }
            if (p.discount && p.discount > 100) {
              reason += `Discount too high (${p.discount}), need recalculation; `;
            }
            
            return {
              name: p.name?.substring(0, 50) || 'No name',
              price: p.price,
              original_price: p.original_price,
              discount: p.discount,
              is_flashsale: p.is_flashsale,
              reason: reason || 'Unknown reason'
            };
          });
          console.log('⚠️ Detailed analysis of filtered products (first 10):', sampleAnalysis);
          
          // Try to find products that should qualify
          const potentialProducts = data.data.filter((p: any) => {
            return (p.discount && p.discount > 0 && p.discount <= 100) ||
                   (p.original_price && p.price && p.original_price > p.price) ||
                   (p.is_flashsale === true && p.original_price && p.price && p.original_price > p.price);
          });
          console.log(`🔍 Found ${potentialProducts.length} products that should qualify (before discount calculation)`);
        }
        
        // Set products immediately if we have any
        if (flashSaleProductsData.length > 0) {
          // Create time slots with real flash sale products
    const today = new Date();
    const timeSlots: FlashSaleTimeSlot[] = [
      {
        id: '1',
        startTime: '08:00',
        endTime: '22:00',
        date: this.formatDate(today),
              status: this.calculateSlotStatus(today, '08:00', '22:00'),
              products: flashSaleProductsData.slice(0, Math.min(6, flashSaleProductsData.length))
      },
      {
        id: '2',
        startTime: '08:00',
        endTime: '22:00',
        date: this.formatDate(new Date(today.getTime() + 24 * 60 * 60 * 1000)),
              status: this.calculateSlotStatus(new Date(today.getTime() + 24 * 60 * 60 * 1000), '08:00', '22:00'),
              products: flashSaleProductsData.slice(3, Math.min(9, flashSaleProductsData.length))
      },
      {
        id: '3',
        startTime: '08:00',
        endTime: '22:00',
        date: this.formatDate(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000)),
              status: this.calculateSlotStatus(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), '08:00', '22:00'),
              products: flashSaleProductsData.slice(6, Math.min(9, flashSaleProductsData.length))
      }
    ];

    // Store all products for reuse when creating new slots
    this.allFlashSaleProducts.set(flashSaleProductsData);
    
    this.flashSaleTimeSlots.set(timeSlots);
    this.currentFlashSaleSlot.set(timeSlots[0]);
          // Set products immediately
    this.flashSaleProducts.set(timeSlots[0].products);
          console.log(`✅ Set ${timeSlots[0].products.length} products to flash sale`);
        } else {
          console.warn('⚠️ No flash sale products found');
          this.flashSaleProducts.set([]);
        }
      } else {
        console.warn('⚠️ Invalid API response structure:', data);
        this.flashSaleProducts.set([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading flash sale products:', error);
      if (error.name === 'AbortError') {
        console.error('⏱️ Request timeout - API took too long to respond');
      }
      // Fallback to empty products if API fails
      this.flashSaleProducts.set([]);
    } finally {
      this.flashSaleLoading.set(false);
    }
  }

  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  calculateSlotStatus(slotDate: Date, startTime: string, endTime: string): 'active' | 'upcoming' | 'ended' {
    const now = new Date();
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const slotDateCopy = new Date(slotDate);
    const startDateTime = new Date(slotDateCopy);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(slotDateCopy);
    endDateTime.setHours(endHour, endMinute, 0, 0);
    
    if (now >= startDateTime && now < endDateTime) {
      return 'active';
    } else if (now < startDateTime) {
      return 'upcoming';
    } else {
      return 'ended';
    }
  }

  // Load featured categories from database and match with predefined list
  loadFeaturedCategories() {
    const allCategories = this.categoryService.categories();
    const featured: Array<{ id: string; name: string; icon: string; slug: string }> = [];
    
    // Try to find categories from database that match featured category names
    this.featuredCategoryNames.forEach((categoryName, index) => {
      // Try exact name match first
      let category = allCategories.find(cat => 
        cat.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
      );
      
      // If not found, try partial match
      if (!category) {
        category = allCategories.find(cat => 
          cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
          categoryName.toLowerCase().includes(cat.name.toLowerCase())
        );
      }
      
      // If found, use database category with slug; otherwise use fallback
      if (category && category.slug) {
        // Use icon from featuredCategoryIcons mapping first, then fallback to database icon
        const iconPath = this.featuredCategoryIcons[categoryName] || category.icon || '/assets/images/icon/Vitamin.png';
        featured.push({
          id: category._id,
          name: category.name,
          icon: iconPath,
          slug: category.slug
        });
        console.log(`✅ Found category: ${category.name} → slug: ${category.slug}, icon: ${iconPath}`);
      } else {
        // Fallback: use predefined slug mapping
        const fallbackSlugs: { [key: string]: string } = {
          'Thần kinh não': 'nao-bo',
          'Vitamin & Khoáng chất': 'vitamin',
          'Sức khỏe tim mạch': 'tim-mach',
          'Tăng sức đề kháng, miễn dịch': 'mien-dich',
          'Hỗ trợ tiêu hóa': 'tieu-hoa',
          'Sinh lý - Nội tiết tố': 'sinh-ly',
          'Dinh dưỡng': 'dinh-duong',
          'Giải pháp làn da': 'cham-soc-da',
          'Chăm sóc da mặt': 'cham-soc-da-mat',
          'Hỗ trợ làm đẹp': 'lam-dep'
        };
        
        featured.push({
          id: `fallback-${index + 1}`,
          name: categoryName,
          icon: this.featuredCategoryIcons[categoryName] || '/assets/images/icon/Vitamin.png',
          slug: fallbackSlugs[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-')
        });
        console.log(`⚠️ Using fallback for: ${categoryName} → slug: ${fallbackSlugs[categoryName]}`);
      }
    });
    
    this.featuredCategories.set(featured);
    console.log(`✅ Loaded ${featured.length} featured categories`);
    console.log('📋 Featured categories with icons:', featured.map(c => ({ name: c.name, icon: c.icon })));
  }

  selectFlashSaleSlot(index: number) {
    const slots = this.flashSaleTimeSlots();
    if (index >= 0 && index < slots.length) {
      this.currentFlashSaleIndex.set(index);
      this.currentFlashSaleSlot.set(slots[index]);
      this.flashSaleProducts.set(slots[index].products);
    }
  }

  // Load best seller products from the already loaded 500 products
  loadBestSellerProducts() {
    this.bestSellerLoading.set(true);
    
    try {
      // Use the products already loaded for flash sale (allFlashSaleProducts)
      const allProducts = this.allFlashSaleProducts();
      
      if (allProducts.length === 0) {
        // If not loaded yet, wait a bit and try again
        setTimeout(() => {
          this.loadBestSellerProducts();
        }, 1000);
        return;
      }
      
      // Map and calculate discount for all products (similar to flash sale logic)
      const productsWithDiscount = allProducts.map(p => {
        let discountPercent = 0;
        let originalPrice = p.originalPrice || p.price;
        
        // Calculate discount if originalPrice exists and is greater than price
        if (p.originalPrice && p.originalPrice > p.price) {
          discountPercent = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
          discountPercent = Math.max(0, Math.min(100, discountPercent));
        } else if (p.discount && typeof p.discount === 'number' && p.discount > 0 && p.discount <= 100) {
          discountPercent = Math.round(p.discount);
        }
        
        return {
          ...p,
          discount: discountPercent > 0 ? discountPercent : undefined,
          originalPrice: discountPercent > 0 ? originalPrice : undefined
        };
      });
      
      // Sort by sales or popularity (prioritize products with discount, then by price)
      const sortedProducts = productsWithDiscount
        .sort((a, b) => {
          // Prioritize products with discount
          const aHasDiscount = (a.discount && a.discount > 0);
          const bHasDiscount = (b.discount && b.discount > 0);
          
          if (aHasDiscount && !bHasDiscount) return -1;
          if (!aHasDiscount && bHasDiscount) return 1;
          
          // Then sort by price (higher price = more popular)
          return b.price - a.price;
        })
        .slice(0, 10); // Take top 10
      
      this.bestSellerProducts.set(sortedProducts);
      console.log(`✅ Loaded ${sortedProducts.length} best seller products`);
    } catch (error) {
      console.error('❌ Error loading best seller products:', error);
      // Fallback to mock data if error
      const mockProducts: Product[] = [
        {
          id: '6',
          name: 'Viên uống JP Lady Jpanwell',
          price: 1300000,
          image: '/assets/images/sp/DSC_01916_d9fd6ed671.webp',
          unit: 'Hộp'
        },
        {
          id: '7',
          name: 'Viên uống LéAna Ocavill',
          price: 680000,
          image: '/assets/images/sp/DSC_04296_5a6bfce13c.webp',
          unit: 'Hộp'
        },
        {
          id: '8',
          name: 'Viên uống Tổ Nữ Vương Royal Care',
          price: 145000,
          image: '/assets/images/sp/DSC_07330_24931f6918.webp',
          unit: 'Hộp'
        },
        {
          id: '9',
          name: 'Viên nang cứng Vương Nữ Khang',
          price: 195000,
          image: '/assets/images/sp/DSC_08507_dda074fe01.webp',
          unit: 'Hộp'
        },
        {
          id: '10',
          name: 'Viên uống Sâm Nhung Bổ Thận NV',
          price: 125000,
          image: '/assets/images/sp/DSC_08550_a755c970a2.webp',
          unit: 'Hộp'
        }
      ];
      this.bestSellerProducts.set(mockProducts);
    } finally {
      this.bestSellerLoading.set(false);
    }
  }
  
  scrollBestSellerProducts(amount: number) {
    const element = document.getElementById('bestSellerProducts');
    if (element) {
      element.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  loadFeaturedProductsToday() {
    this.featuredProductsTodayLoading.set(true);
    
    try {
      // Use the products already loaded for flash sale (allFlashSaleProducts)
      const allProducts = this.allFlashSaleProducts();
      
      if (allProducts.length === 0) {
        // If not loaded yet, wait a bit and try again
        setTimeout(() => {
          this.loadFeaturedProductsToday();
        }, 1000);
        return;
      }
      
      // Map and calculate discount for all products
      const productsWithDiscount = allProducts.map(p => {
        let discountPercent = 0;
        let originalPrice = p.originalPrice || p.price;
        
        // Calculate discount if originalPrice exists and is greater than price
        if (p.originalPrice && p.originalPrice > p.price) {
          discountPercent = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
          discountPercent = Math.max(0, Math.min(100, discountPercent));
        } else if (p.discount && typeof p.discount === 'number' && p.discount > 0 && p.discount <= 100) {
          discountPercent = Math.round(p.discount);
        }
        
        return {
          ...p,
          discount: discountPercent > 0 ? discountPercent : undefined,
          originalPrice: discountPercent > 0 ? originalPrice : undefined
        };
      });
      
      // Sort by discount percentage (highest discount first), then by price
      const sortedProducts = productsWithDiscount
        .sort((a, b) => {
          const aDiscount = a.discount || 0;
          const bDiscount = b.discount || 0;
          
          // Prioritize products with higher discount
          if (bDiscount !== aDiscount) {
            return bDiscount - aDiscount;
          }
          
          // If same discount, sort by price (higher price first)
          return b.price - a.price;
        })
        .slice(0, 15); // Take top 15 featured products
      
      this.featuredProductsToday.set(sortedProducts);
      console.log(`✅ Loaded ${sortedProducts.length} featured products today`);
    } catch (error) {
      console.error('❌ Error loading featured products today:', error);
      // Fallback to mock data if error
      const mockProducts: Product[] = [
        {
          id: '11',
          name: 'Viên uống Glucosamine And Chondroitin Jpanwell',
          price: 960000,
          originalPrice: 1000000,
          image: '/assets/images/sp/DSC_01916_d9fd6ed671.webp',
          unit: 'Hộp'
        },
        {
          id: '12',
          name: 'Dung dịch LineaBon K2+D3 ErgoPharm',
          price: 295000,
          image: '/assets/images/sp/DSC_04296_5a6bfce13c.webp',
          unit: 'Hộp'
        }
      ];
      this.featuredProductsToday.set(mockProducts);
    } finally {
      this.featuredProductsTodayLoading.set(false);
    }
  }

  scrollFeaturedProductsToday(amount: number) {
    const element = document.getElementById('featuredProductsToday');
    if (element) {
      element.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  loadHotProducts() {
    const mockProducts: Product[] = [
      {
        id: '11',
        name: 'Viên uống Glucosamine',
        price: 680000,
        image: '/assets/images/sp/DSC_08647_3632b2e5df.webp',
        unit: 'Hộp'
      },
      {
        id: '12',
        name: 'Viên uống sinh lý Level 3',
        price: 580000,
        image: '/assets/images/sp/sinh_ly_nam_level_3_f76dc0b6c6.webp',
        unit: 'Hộp'
      },
      {
        id: '13',
        name: 'Viên uống sinh lý nữ Level 3',
        price: 590000,
        image: '/assets/images/sp/sinh_ly_nu_level_3_a1988dcde7.webp',
        unit: 'Hộp'
      },
      {
        id: '14',
        name: 'Viên uống hỗ trợ mãn kinh',
        price: 650000,
        image: '/assets/images/sp/ho_tro_man_kinh_level_3_273d1706e6.webp',
        unit: 'Hộp'
      },
      {
        id: '15',
        name: 'Viên uống cân bằng nội tiết tố',
        price: 590000,
        image: '/assets/images/sp/can_bang_noi_tiet_to_level_3_7fad40d671.webp',
        unit: 'Hộp'
      }
    ];
    this.hotProducts.set(mockProducts);
  }

  // Helper for price formatting
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  // Calculate discount percentage
  calculateDiscount(original: number, current: number): number {
    return Math.round(((original - current) / original) * 100);
  }
  
  // Add to cart
  async addToCart(product: Product) {
    const result = await this.cartService.addToCart({
      _id: product.id,
      name: product.name,
      price: product.price,
      discount: product.discount,
      image: product.image,
      unit: product.unit,
      stock: 999
    });

    if (result.success) {
      ToastService.success(result.message || `Đã thêm ${product.name} vào giỏ hàng!`);
    } else {
      ToastService.error(result.message || 'Sản phẩm đã hết hàng hoặc vượt quá số lượng trong kho!');
    }
  }
  
  // Scroll functions for carousel
  scrollProducts(section: string, amount: number) {
    const element = document.getElementById(section + (section === 'flashSale' ? 'Products' : ''));
    if (element) {
      element.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }
  
  scrollFlashSaleProducts(amount: number) {
    setTimeout(() => {
      const element = document.getElementById('flashSaleProducts');
      if (element) {
        // Calculate scroll amount: width of one product card (200px min-width) + gap (20px) = 220px
        const cardWidth = 220;
        const scrollAmount = amount > 0 ? cardWidth : -cardWidth;
        element.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      } else {
        console.error('Element flashSaleProducts not found');
      }
    }, 50);
  }
  
  navigateToProduct(productId: string) {
    this.router.navigate(['/product', productId]);
  }
  
  navigateToCategory(slug: string) {
    this.router.navigate(['/category', slug]);
  }
  
  scrollBrands(amount: number) {
    const element = document.querySelector('.brands-list');
    if (element) {
      (element as HTMLElement).scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  scrollFavoriteBrands(amount: number) {
    const element = document.getElementById('favoriteBrandsCarousel');
    if (element) {
      element.scrollBy({ left: amount, behavior: 'smooth' });
    }
  }

  navigateToBrand(brandSlug: string) {
    this.router.navigate(['/brand', brandSlug]);
  }

  // Recently Viewed Products Management
  loadRecentlyViewed() {
    try {
      const stored = localStorage.getItem('recentlyViewedProducts');
      if (stored) {
        const products = JSON.parse(stored);
        // Convert _id to id for homepage Product interface
        const convertedProducts: Product[] = products.slice(0, 8).map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          price: p.price,
          originalPrice: p.originalPrice || (p.discount ? p.price + p.discount : undefined),
          image: p.image || '/assets/images/icon/logo_tròn.png',
          discount: p.discount,
          unit: p.unit
        }));
        this.recentlyViewed.set(convertedProducts);
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
  }

  // Slider navigation for recently viewed
  prevSlideRecentlyViewed() {
    if (this.currentSlide() > 0) {
      this.currentSlide.set(this.currentSlide() - 1);
    }
  }

  nextSlideRecentlyViewed() {
    if (this.currentSlide() < this.recentlyViewed().length - 5) {
      this.currentSlide.set(this.currentSlide() + 1);
    }
  }

  getSlideWidth(): number {
    // Each product card is approximately 200px wide + gap
    return 220;
  }

  calculateDiscountPercent(price: number, discount: number): number {
    if (discount && discount > 0) {
      return Math.round((discount / (price + discount)) * 100);
    }
    return 0;
  }

  // Load Health Corner Articles
  async loadHealthCornerArticles() {
    this.healthCornerLoading.set(true);
    try {
      const response = await fetch(`${environment.apiUrl}/api/blogs/overview?heroLimit=1&latestLimit=5`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Use heroArticles for main article
        const heroArticles = result.data.heroArticles || [];
        const latestArticles = result.data.latestArticles || [];
        
        // Set main article (first hero article)
        if (heroArticles.length > 0) {
          this.mainArticle.set(heroArticles[0]);
        } else if (latestArticles.length > 0) {
          this.mainArticle.set(latestArticles[0]);
        }
        
        // Set sidebar articles (from latest articles, excluding main article)
        const sidebarArticlesList = latestArticles.filter((article: BlogSummary) => {
          const mainSlug = this.mainArticle()?.cleanSlug || this.mainArticle()?.slug;
          const articleSlug = article.cleanSlug || article.slug;
          return articleSlug !== mainSlug;
        }).slice(0, 5);
        
        this.sidebarArticles.set(sidebarArticlesList);
        
        // Combine all articles for reference
        const allArticles = [...heroArticles, ...latestArticles];
        this.healthCornerArticles.set(allArticles);
        
        console.log('✅ Loaded', allArticles.length, 'articles for Health Corner');
      } else {
        console.error('❌ Failed to load articles:', result);
      }
    } catch (error) {
      console.error('❌ Error loading articles:', error);
    } finally {
      this.healthCornerLoading.set(false);
    }
  }

  navigateToArticle(slug: string | null) {
    if (!slug) return;
    const cleanSlug = slug.replace(/^bai-viet\//, '').replace(/\.html$/, '');
    this.router.navigate(['/blog', cleanSlug]);
  }

  formatBlogDate(dateString?: string | null): string {
    if (!dateString) {
      return '';
    }
    try {
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(dateString));
    } catch {
      return '';
    }
  }

  getArticleImage(article: BlogSummary | null): string {
    if (!article) {
      return '/assets/images/icon/logo_tròn.png';
    }
    
    const primaryImage = article.primaryImage;
    
    // Validate image URL - check for null, empty, or invalid values
    if (!primaryImage || 
        typeof primaryImage !== 'string' ||
        primaryImage.trim() === '' || 
        primaryImage === 'null' || 
        primaryImage === 'undefined') {
      return '/assets/images/icon/logo_tròn.png';
    }
    
    return primaryImage;
  }

  getArticleDescription(article: BlogSummary | null): string {
    if (!article) {
      return '';
    }
    return article.shortDescription || article.headline || '';
  }

  truncate(text: string | undefined, maxLength = 220): string {
    if (!text) {
      return '';
    }
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  navigateToBlogList() {
    this.router.navigate(['/blogs']);
  }

  // Load Specialized Disease Groups
  async loadSpecializedGroups() {
    this.specializedGroupsLoading.set(true);
    try {
      const response = await fetch(`${environment.apiUrl}/api/diseases/specialized-groups`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const filteredGroups = result.data
          .filter((group: { name: string }) => {
            const normalized = this.normalizeSpecializedGroupName(group.name || '');
            return !this.excludedSpecializedGroupNames.has(normalized);
          })
          .map((group: { id: string; name: string; icon: string; image?: string | null }) => {
            const mappedImage = this.getSpecializedGroupImage(group.name, group.id);
            const finalImage = mappedImage || group.image || null;
            // Clean CDN wrapper from image URL if present
            return {
              ...group,
              image: finalImage ? this.cleanImageUrl(finalImage) : null
            };
          });

        this.specializedGroups.set(filteredGroups);
        this.showAllSpecializedGroups.set(false);
        console.log(`✅ Loaded ${filteredGroups.length} specialized groups from MongoDB (filtered):`, filteredGroups);
      } else {
        console.error('❌ Failed to load specialized groups:', result);
        this.specializedGroups.set([]);
      }
    } catch (error) {
      console.error('❌ Error loading specialized groups:', error);
      this.specializedGroups.set([]);
    } finally {
      this.specializedGroupsLoading.set(false);
    }
  }

  toggleSpecializedGroups() {
    this.showAllSpecializedGroups.set(!this.showAllSpecializedGroups());
  }

  navigateToSpecializedGroup(groupId: string) {
    // Navigate to diseases page with category filter
    this.router.navigate(['/diseases'], { queryParams: { category: groupId } });
  }

  navigateToAllDiseases() {
    this.router.navigate(['/diseases']);
  }

  navigateToOrders() {
    this.router.navigate(['/profile/orders']);
  }

  navigateToDrugSearch() {
    this.router.navigate(['/thuoc/tra-cuu-thuoc']);
  }

  navigateToPharmacistChat() {
    this.router.navigate(['/pharmacist-chat']);
  }

  navigateToMedicineRequest() {
    this.router.navigate(['/medicine-request']);
  }

  // Handle image error - show emoji fallback
  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
      const nextElement = img.nextElementSibling as HTMLElement;
      if (nextElement) {
        nextElement.style.display = 'flex';
      }
    }
  }

  // Navigate to product detail when clicking on feature banner
  onFeatureBannerClick() {
    const currentIndex = this.featureIndex();
    const currentBanner = this.featureBannerList()[currentIndex];
    
    // Banner đầu tiên (index 0) luôn điều hướng đến product ID 68f1de3a44d747b5d5d88708
    // Banner thứ 3 (index 2) luôn điều hướng đến product ID 68f1de3c44d747b5d5d8a395
    let productId: string | undefined;
    if (currentIndex === 0) {
      productId = '68f1de3a44d747b5d5d88708';
    } else if (currentIndex === 2) {
      productId = '68f1de3c44d747b5d5d8a395';
    } else {
      productId = this.featureBannerProductMap[currentBanner];
    }
    
    if (productId) {
      this.router.navigate(['/product', productId]);
    } else {
      console.warn('No product ID found for banner:', currentBanner);
    }
  }

  ngOnDestroy() {
    // Cleanup intervals
    if (this.slideRotationInterval) {
      clearInterval(this.slideRotationInterval);
    }
    if (this.featureBannerInterval) {
      clearInterval(this.featureBannerInterval);
    }
  }
}
