import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CategoryService, Product } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { ToastService } from '../toast.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-drug-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './drug-search.html',
  styleUrl: './drug-search.css',
})
export class DrugSearch implements OnInit {
  // Search
  searchQuery = signal<string>('');
  
  // Alphabet filter (A-Z and numbers)
  selectedAlphabet = signal<string>('A');
  alphabetList = signal<string[]>(['5', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']);
  
  // Products
  allProducts = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  displayedProducts = signal<Product[]>([]);
  loading = signal(false);
  
  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = 12; // 12 items per page (3 columns x 4 rows)
  totalPages = computed(() => Math.ceil(this.filteredProducts().length / this.itemsPerPage));
  
  // Recently viewed
  recentlyViewed = signal<Product[]>([]);
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private categoryService: CategoryService,
    private cartService: CartService
  ) {}

  async ngOnInit() {
    // Load recently viewed
    this.loadRecentlyViewed();
    
    // Load all drug products
    await this.loadDrugProducts();
    
    // Watch for search query params
    this.route.queryParams.subscribe(params => {
      const search = params['search'];
      if (search) {
        this.searchQuery.set(search);
        this.onSearch(search);
      }
    });
  }

  async loadDrugProducts() {
    this.loading.set(true);
    try {
      // First, get the "Thuốc" category and its children
      await this.categoryService.fetchCategories();
      const categories = this.categoryService.categories();
      const thuocCategory = categories.find(cat => 
        cat.slug === 'thuoc' || cat.name?.toLowerCase().includes('thuốc')
      );
      
      if (thuocCategory) {
        // Collect all category IDs (parent + children)
        const categoryIds = [thuocCategory._id];
        const children = categories.filter(cat => 
          cat.parent_id === thuocCategory._id || 
          (cat.parent_id && cat.parent_id.toString() === thuocCategory._id.toString())
        );
        children.forEach(child => categoryIds.push(child._id));
        
        // Fetch products from these categories
        const response = await fetch(`${environment.apiUrl}/api/products?categories=${categoryIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          this.allProducts.set(data.data || data.products || []);
        } else {
          // Fallback: fetch all and filter by name/slug
          const allResponse = await fetch(`${environment.apiUrl}/api/products`);
          if (allResponse.ok) {
            const allData = await allResponse.json();
            const allProducts = allData.data || allData.products || [];
            // Filter products that might be drugs (fallback logic)
            const drugProducts = allProducts.filter((p: Product) => {
              const name = p.name?.toLowerCase() || '';
              return name.includes('thuốc');
            });
            this.allProducts.set(drugProducts);
          }
        }
      } else {
        // Fallback: fetch all products
        const response = await fetch(`${environment.apiUrl}/api/products`);
        if (response.ok) {
          const data = await response.json();
          this.allProducts.set(data.data || data.products || []);
        }
      }
      
      this.applyFilters();
    } catch (error) {
      console.error('Error loading drug products:', error);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    let filtered = [...this.allProducts()];
    
    // Filter by alphabet
    if (this.selectedAlphabet() !== 'all') {
      const letter = this.selectedAlphabet().toUpperCase();
      filtered = filtered.filter(p => {
        const name = p.name?.toUpperCase() || '';
        return name.startsWith(letter);
      });
    }
    
    // Filter by search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(p => {
        const name = p.name?.toLowerCase() || '';
        const brand = p.brand?.toLowerCase() || '';
        const description = p.description?.toLowerCase() || '';
        return name.includes(query) || brand.includes(query) || description.includes(query);
      });
    }
    
    this.filteredProducts.set(filtered);
    this.updateDisplayedProducts();
  }

  updateDisplayedProducts() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedProducts.set(this.filteredProducts().slice(start, end));
  }

  onAlphabetSelect(letter: string) {
    this.selectedAlphabet.set(letter);
    this.currentPage.set(1);
    this.applyFilters();
  }

  onSearch(query?: string) {
    const searchTerm = query || this.searchQuery();
    this.searchQuery.set(searchTerm);
    this.selectedAlphabet.set('all');
    this.currentPage.set(1);
    this.applyFilters();
    
    // Update URL
    if (searchTerm.trim()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { search: searchTerm },
        queryParamsHandling: 'merge'
      });
    }
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.updateDisplayedProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPagesArray(): (number | string)[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | string)[] = [];
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (current > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (current < total - 2) {
        pages.push('...');
      }
      
      pages.push(total);
    }
    
    return pages;
  }

  formatPrice(price: number | null | undefined): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

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

  addToCart(product: Product) {
    const cartItem = {
      _id: product._id,
      name: product.name,
      price: product.price,
      discount: product.discount,
      image: product.image || '/assets/images/icon/logo_tròn.png',
      unit: product.unit,
      stock: product.stock || 0
    };
    this.cartService.addToCart(cartItem);
    ToastService.success('Đã thêm vào giỏ hàng');
  }

  navigateToProduct(product: Product) {
    this.router.navigate(['/product', product._id]);
  }
}

