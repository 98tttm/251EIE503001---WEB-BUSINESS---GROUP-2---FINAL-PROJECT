import { Component, OnInit, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category, Product } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-listproduct',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './listproduct.html',
  styleUrl: './listproduct.css',
})
export class Listproduct implements OnInit, AfterViewInit, OnDestroy {
  // Current category
  currentCategory = signal<Category | null>(null);
  breadcrumb = signal<Category[]>([]);
  breadcrumbLinks = signal<Array<{name: string, path: string[]}>>([]); // Store full paths for breadcrumb
  subcategories = signal<Category[]>([]);
  subcategoryProductCounts = signal<Map<string, number>>(new Map());
  shouldShowSubcategories = signal<boolean>(true);
  
  // Products
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  loading = signal(false);
  
  // Pagination
  displayLimit = signal<number>(20); // Hiển thị 20 sản phẩm ban đầu
  displayedProducts = signal<Product[]>([]); // Sản phẩm đang hiển thị
  
  // Filters
  selectedAgeGroup = signal<string>('all');
  selectedBrand = signal<string>('all');
  selectedPrice = signal<string>('all');
  searchKeyword = signal<string>('');
  
  // New filter states
  selectedPriceRange = signal<string>('all'); // all, <100k, 100k-200k, 200k-500k, >500k
  selectedBrands = signal<Set<string>>(new Set()); // Set of selected brand names
  selectedCountries = signal<Set<string>>(new Set()); // Set of selected countries
  
  // Available options (extracted from products)
  availableBrands = signal<string[]>([]);
  availableCountries = signal<string[]>([]);
  
  // Filter expansion states
  filterExpanded = signal<Map<string, boolean>>(new Map([
    ['price', true],
    ['brand', false],
    ['country', false]
  ]));
  
  // Sorting
  sortBy = signal<string>('bestseller'); // bestseller, price-asc, price-desc
  priceSort = signal<'none' | 'asc' | 'desc'>('none'); // none, asc (thấp→cao), desc (cao→thấp)
  
  // View mode
  viewMode = signal<'grid' | 'list'>('grid');

  // Recently viewed products
  recentlyViewed = signal<Product[]>([]);
  currentSlide = signal(0);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public categoryService: CategoryService,
    private cartService: CartService
  ) {}

  async ngOnInit() {
    console.log('🚀 ListProduct ngOnInit started');
    
    try {
      // ALWAYS load categories first and wait
      console.log('📥 Loading categories...');
      await this.categoryService.fetchCategories();
      console.log('✅ Categories loaded:', this.categoryService.categories().length);
      
      // Load recently viewed products
      this.loadRecentlyViewed();
      
      // Watch for route changes AFTER categories are loaded
      this.route.params.subscribe(async params => {
        console.log('🔄 Route params changed:', params);
        const slug = params['slug'];
        const routePath = this.route.snapshot.url.map(segment => segment.path).join('/');
        
        // Check if this is a duoc-chat or duoc-lieu route
        if (routePath.startsWith('duoc-chat/') && slug) {
          await this.loadProductsByIngredient(slug, 'duoc-chat');
        } else if (routePath.startsWith('duoc-lieu/') && slug) {
          await this.loadProductsByIngredient(slug, 'duoc-lieu');
        } else if (slug) {
          await this.loadCategoryData(slug);
        } else {
          // Load all products if no category specified
          await this.loadAllProducts();
        }
      });

      // Watch for search query params
      this.route.queryParams.subscribe(async queryParams => {
        const searchQuery = queryParams['search'];
        if (searchQuery) {
          this.searchKeyword.set(searchQuery);
          await this.performSearch(searchQuery);
        }
      });
    } catch (error) {
      console.error('❌ Error in ngOnInit:', error);
    }
  }

  async loadCategoryData(slug: string) {
    this.loading.set(true);
    
    console.log('🔍 Loading category with slug:', slug);
    console.log('📂 Total categories loaded:', this.categoryService.categories().length);
    
    // Find category by slug
    const category = this.categoryService.getCategoryBySlug(slug);
    
    console.log('✅ Found category:', category);
    
    if (category) {
      this.currentCategory.set(category);
      
      // Get breadcrumb
      const breadcrumb = this.categoryService.getBreadcrumb(category._id);
      this.breadcrumb.set(breadcrumb);
      
      // Set breadcrumb links for category routes
      this.breadcrumbLinks.set([
        { name: 'Trang chủ', path: ['/'] },
        ...breadcrumb.map(cat => ({ name: cat.name, path: ['/category', cat.slug] }))
      ]);
      
      console.log('🍞 Breadcrumb:', breadcrumb.map(c => c.name));
      
      // Get subcategories
      const subcats = this.categoryService.getChildren(category._id);
      this.subcategories.set(subcats);
      console.log('📁 Subcategories:', subcats.length);
      
      // Show subcategories if any exist
      this.shouldShowSubcategories.set(subcats.length > 0);
      console.log('👁️ Should show subcategories:', subcats.length > 0);
      
      // Count products for each subcategory
      await this.countProductsForSubcategories(subcats);
      
      // Load products by slug
      const products = await this.categoryService.fetchProductsByCategorySlug(slug);
      this.products.set(products);
      console.log('📦 Products loaded:', products.length);
      
      // Extract filter options from loaded products
      this.extractFilterOptions();
      
      this.applyFilters();
    } else {
      console.error('❌ Category not found for slug:', slug);
    }
    
    this.loading.set(false);
  }

  async countProductsForSubcategories(subcats: Category[]) {
    const counts = new Map<string, number>();
    
    for (const subcat of subcats) {
      if (subcat.slug) {
        const products = await this.categoryService.fetchProductsByCategorySlug(subcat.slug);
        counts.set(subcat._id, products.length);
      }
    }
    
    this.subcategoryProductCounts.set(counts);
  }

  getProductCount(categoryId: string): number {
    return this.subcategoryProductCounts().get(categoryId) || 0;
  }

  async performSearch(query: string) {
    this.loading.set(true);
    this.currentCategory.set(null);
    this.breadcrumb.set([]);
    this.breadcrumbLinks.set([]);
    this.shouldShowSubcategories.set(false);
    
    try {
      const response = await fetch(`http://localhost:3000/api/products/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const products = await response.json();
      this.products.set(products || []);
      this.extractFilterOptions();
      this.applyFilters();
    } catch (error) {
      console.error('Error searching products:', error);
      this.products.set([]);
      this.filteredProducts.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async loadProductsByIngredient(slug: string, type: 'duoc-chat' | 'duoc-lieu') {
    this.loading.set(true);
    
    try {
      // Convert slug to search terms (handle both English and Vietnamese names)
      const searchTerms = this.getSearchTermsFromSlug(slug);
      
      // Fetch all products
      const response = await fetch('http://localhost:3000/api/products');
      if (response.ok) {
        const data = await response.json();
        const allProducts = data.data || data.products || [];
        
        // Filter products that contain the ingredient/herbal medicine
        const filtered = allProducts.filter((p: Product) => {
          const searchText = [
            p.name,
            p.description,
            p.brand
          ].filter(Boolean).join(' ').toLowerCase();
          
          // Check if any search term matches
          return searchTerms.some(term => searchText.includes(term.toLowerCase()));
        });
        
        this.products.set(filtered);
        this.extractFilterOptions();
        this.applyFilters();
        
        // Set breadcrumb and title
        const typeName = type === 'duoc-chat' ? 'Dược chất' : 'Dược liệu';
        const ingredientName = this.formatIngredientName(slug);
        
        // Set breadcrumb with proper paths
        this.breadcrumbLinks.set([
          { name: 'Trang chủ', path: ['/'] },
          { name: typeName, path: ['/', type] },
          { name: ingredientName, path: ['/', type, slug] }
        ]);
        
        // Also set breadcrumb for compatibility
        this.breadcrumb.set([
          { _id: '1', name: 'Trang chủ', slug: '' } as Category,
          { _id: '2', name: typeName, slug: type } as Category,
          { _id: '3', name: ingredientName, slug: slug } as Category
        ]);
        
        // Set a virtual category for display
        this.currentCategory.set({
          _id: slug,
          name: `${typeName}: ${ingredientName}`,
          slug: slug,
          level: 2,
          is_active: true,
          display_order: 0
        } as Category);
      }
    } catch (error) {
      console.error('Error loading products by ingredient:', error);
    } finally {
      this.loading.set(false);
    }
  }

  getSearchTermsFromSlug(slug: string): string[] {
    // Convert slug to search terms
    // e.g., "acetylsalicylic-acid" -> ["acetylsalicylic", "acid", "acetylsalicylic acid"]
    const words = slug.split('-');
    const terms = [slug.replace(/-/g, ' '), slug.replace(/-/g, '')];
    
    // Add individual words
    words.forEach(word => {
      if (word.length > 2) {
        terms.push(word);
      }
    });
    
    // Add Vietnamese names mapping
    const vietnameseMap: { [key: string]: string[] } = {
      'acetaminophen': ['paracetamol', 'acetaminophen'],
      'ibuprofen': ['ibuprofen'],
      'calcium': ['canxi', 'calcium'],
      'hoa-cuc': ['hoa cúc', 'chrysanthemum'],
      'cam-thao': ['cam thảo', 'licorice'],
      'nhan-sam': ['nhân sâm', 'ginseng'],
      'linh-chi': ['linh chi', 'reishi'],
      'dong-trung-ha-thao': ['đông trùng hạ thảo', 'cordyceps']
    };
    
    if (vietnameseMap[slug]) {
      terms.push(...vietnameseMap[slug]);
    }
    
    return [...new Set(terms)]; // Remove duplicates
  }

  formatIngredientName(slug: string): string {
    // Convert slug to readable name
    // e.g., "acetylsalicylic-acid" -> "Acetylsalicylic Acid"
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async loadAllProducts() {
    this.loading.set(true);
    this.currentCategory.set(null);
    this.breadcrumb.set([]);
    this.breadcrumbLinks.set([]);
    this.subcategories.set([]);
    this.shouldShowSubcategories.set(false);
    
    try {
      const response = await fetch('http://localhost:3000/api/products');
      const data = await response.json();
      this.products.set(data.data || []);
      
      // Extract filter options from loaded products
      this.extractFilterOptions();
      
      this.applyFilters();
    } catch (err) {
      console.error('Error loading products:', err);
    }
    
    this.loading.set(false);
  }

  applyFilters() {
    let filtered = [...this.products()];
    
    // Filter by search keyword (client-side filtering for search query)
    const keyword = this.searchKeyword().toLowerCase().trim();
    if (keyword) {
      filtered = filtered.filter(p => {
        const nameMatch = p.name?.toLowerCase().includes(keyword);
        const brandMatch = p.brand?.toLowerCase().includes(keyword);
        const descMatch = p.description?.toLowerCase().includes(keyword);
        return nameMatch || brandMatch || descMatch;
      });
    }
    
    // Filter by price range
    const priceRange = this.selectedPriceRange();
    if (priceRange !== 'all') {
      filtered = filtered.filter(p => {
        const price = p.price || 0;
        switch (priceRange) {
          case '<100k': return price < 100000;
          case '100k-200k': return price >= 100000 && price < 200000;
          case '200k-500k': return price >= 200000 && price < 500000;
          case '>500k': return price >= 500000;
          default: return true;
        }
      });
    }
    
    // Filter by brands
    const selectedBrands = this.selectedBrands();
    if (selectedBrands.size > 0) {
      filtered = filtered.filter(p => p.brand && selectedBrands.has(p.brand));
    }
    
    // Filter by countries
    const selectedCountries = this.selectedCountries();
    if (selectedCountries.size > 0) {
      filtered = filtered.filter(p => p.country && selectedCountries.has(p.country));
    }
    
    // Apply sorting
    filtered = this.sortProducts(filtered);
    
    this.filteredProducts.set(filtered);
    
    // Reset display limit và update displayed products
    this.displayLimit.set(20);
    this.updateDisplayedProducts();
  }
  
  updateDisplayedProducts() {
    const limit = this.displayLimit();
    const filtered = this.filteredProducts();
    this.displayedProducts.set(filtered.slice(0, limit));
  }
  
  loadMore() {
    const currentLimit = this.displayLimit();
    this.displayLimit.set(currentLimit + 10); // Tăng thêm 10 sản phẩm
    this.updateDisplayedProducts();
  }
  
  getRemainingProductsCount(): number {
    return Math.max(0, this.filteredProducts().length - this.displayLimit());
  }
  
  hasMoreProducts(): boolean {
    return this.displayLimit() < this.filteredProducts().length;
  }

  sortProducts(products: Product[]): Product[] {
    const sortBy = this.sortBy();
    
    if (sortBy === 'bestseller') {
      return products.sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0));
    } else if (sortBy === 'price-asc') {
      return products.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      return products.sort((a, b) => b.price - a.price);
    }
    
    return products;
  }

  onSortChange(value: string) {
    this.sortBy.set(value);
    // Reset priceSort khi chọn bestseller
    if (value === 'bestseller') {
      this.priceSort.set('none');
    }
    this.applyFilters();
  }

  // Toggle price sort: asc ↔ desc (chỉ 2 trạng thái)
  togglePriceSort() {
    const current = this.priceSort();
    
    if (current === 'asc') {
      this.priceSort.set('desc');
      this.sortBy.set('price-desc');
    } else {
      // Mặc định hoặc từ desc → asc
      this.priceSort.set('asc');
      this.sortBy.set('price-asc');
    }
    
    this.applyFilters();
  }

  // Toggle view mode: grid ↔ list
  toggleViewMode() {
    const current = this.viewMode();
    this.viewMode.set(current === 'grid' ? 'list' : 'grid');
  }

  onFilterChange() {
    this.applyFilters();
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  // Kiểm tra xem có cần hiển thị giá hay "Cần được tư vấn"
  needsConsultation(price: number): boolean {
    return !price || price === 0;
  }

  calculateDiscount(price: number, originalPrice?: number): number {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  calculateDiscountPercent(price: number, discount: number): number {
    if (!discount || discount <= 0) return 0;
    const originalPrice = price + discount;
    return Math.round((discount / originalPrice) * 100);
  }

  toggleFilter(filterName: string) {
    // Toggle filter visibility (implement if needed)
    console.log('Toggle filter:', filterName);
  }

  // Extract unique brands and countries from products
  extractFilterOptions() {
    const products = this.products();
    
    // Extract unique brands
    const brandsSet = new Set<string>();
    products.forEach(p => {
      if (p.brand && p.brand.trim()) {
        brandsSet.add(p.brand.trim());
      }
    });
    const brands = Array.from(brandsSet).sort();
    this.availableBrands.set(brands);
    
    // Extract unique countries
    const countriesSet = new Set<string>();
    products.forEach(p => {
      if (p.country && p.country.trim()) {
        countriesSet.add(p.country.trim());
      }
    });
    const countries = Array.from(countriesSet).sort();
    this.availableCountries.set(countries);
    
    console.log('📊 Extracted filters:', {
      brands: brands.length,
      countries: countries.length
    });
  }

  // Toggle filter section expansion
  toggleFilterSection(sectionName: string) {
    const current = this.filterExpanded();
    const isExpanded = current.get(sectionName) || false;
    current.set(sectionName, !isExpanded);
    this.filterExpanded.set(new Map(current));
  }

  isFilterExpanded(sectionName: string): boolean {
    return this.filterExpanded().get(sectionName) || false;
  }

  // Price range filter
  onPriceRangeChange(range: string) {
    this.selectedPriceRange.set(range);
    this.applyFilters();
  }

  isPriceRangeSelected(range: string): boolean {
    return this.selectedPriceRange() === range;
  }

  // Brand filter
  toggleBrand(brand: string) {
    const selected = this.selectedBrands();
    const newSet = new Set(selected);
    
    if (brand === 'all') {
      // Nếu chọn "Tất cả", xóa hết selections
      newSet.clear();
    } else {
      // Nếu chọn brand cụ thể
      if (newSet.has(brand)) {
        newSet.delete(brand);
      } else {
        newSet.add(brand);
      }
    }
    
    this.selectedBrands.set(newSet);
    this.applyFilters();
  }

  isBrandSelected(brand: string): boolean {
    if (brand === 'all') {
      // "Tất cả" được chọn khi không có brand nào được chọn
      return this.selectedBrands().size === 0;
    }
    return this.selectedBrands().has(brand);
  }

  // Country filter
  toggleCountry(country: string) {
    const selected = this.selectedCountries();
    const newSet = new Set(selected);
    
    if (country === 'all') {
      // Nếu chọn "Tất cả", xóa hết selections
      newSet.clear();
    } else {
      // Nếu chọn country cụ thể
      if (newSet.has(country)) {
        newSet.delete(country);
      } else {
        newSet.add(country);
      }
    }
    
    this.selectedCountries.set(newSet);
    this.applyFilters();
  }

  isCountrySelected(country: string): boolean {
    if (country === 'all') {
      // "Tất cả" được chọn khi không có country nào được chọn
      return this.selectedCountries().size === 0;
    }
    return this.selectedCountries().has(country);
  }

  // Reset all filters
  resetFilters() {
    this.selectedPriceRange.set('all');
    this.selectedBrands.set(new Set());
    this.selectedCountries.set(new Set());
    this.applyFilters();
  }

  // Recently Viewed Products Management
  loadRecentlyViewed() {
    try {
      const stored = localStorage.getItem('recentlyViewedProducts');
      if (stored) {
        const products = JSON.parse(stored);
        this.recentlyViewed.set(products.slice(0, 8));
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error);
    }
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
      return 200; // 180px card + 20px gap
    }
    return 260; // 240px card + 20px gap
  }

  ngAfterViewInit() {
    // Sticky filter sẽ tự động dừng lại khi hết không gian - không cần JavaScript!
    console.log('✅ Sticky filter ready');
  }

  // Add to cart
  async addToCart(product: Product) {
    const result = await this.cartService.addToCart({
      _id: product._id,
      name: product.name,
      price: product.discount ? product.price : product.price,
      discount: product.discount,
      image: product.image || 'https://via.placeholder.com/400x400?text=MediCare',
      unit: product.unit || 'Hộp',
      stock: product.stock || 999
    });

    if (result.success) {
      const message = result.message || `Đã thêm ${product.name} vào giỏ hàng!`;
      console.log('🍞 Toast Success:', message);
      ToastService.success(message);
    } else {
      const message = result.message || 'Sản phẩm đã hết hàng hoặc vượt quá số lượng trong kho!';
      console.log('🍞 Toast Error:', message);
      ToastService.error(message);
    }
  }

  ngOnDestroy() {
    // Cleanup nếu có listeners trong tương lai
  }
}
