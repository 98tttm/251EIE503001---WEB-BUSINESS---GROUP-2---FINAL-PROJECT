import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { ToastService } from '../toast.service';

interface HerbalMedicine {
  name: string;
  slug: string;
  vietnameseName?: string;
}

@Component({
  selector: 'app-herbal-medicine-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './herbal-medicine-search.html',
  styleUrl: './herbal-medicine-search.css',
})
export class HerbalMedicineSearch implements OnInit {
  // Search
  searchQuery = signal<string>('');
  
  // Alphabet filter
  selectedAlphabet = signal<string>('A');
  alphabetList = signal<string[]>(['5', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']);
  
  // Common herbal medicines
  commonHerbalMedicines: HerbalMedicine[] = [
    { name: 'Hoa cúc', slug: 'hoa-cuc' },
    { name: 'Cam thảo', slug: 'cam-thao' },
    { name: 'Gừng bạc', slug: 'giam-bac' },
    { name: 'Nhân sâm', slug: 'nhan-sam' },
    { name: 'Linh chi', slug: 'linh-chi' },
    { name: 'Đông trùng hạ thảo', slug: 'dong-trung-ha-thao' },
    { name: 'Hoàng kỳ', slug: 'hoang-ky' },
    { name: 'Bạch môn', slug: 'bai-mon' },
    { name: 'Đương quy', slug: 'duong-quy' },
    { name: 'Bạch thược', slug: 'bach-thuoc' },
    { name: 'Xuyên khung', slug: 'xuyen-khung' },
    { name: 'Sinh địa', slug: 'sinh-dia' },
    { name: 'Hoài sơn', slug: 'hoai-son' },
    { name: 'Sơn thù', slug: 'son-thu' },
    { name: 'Trạch tả', slug: 'trach-ta' },
    { name: 'Đan bì', slug: 'dan-bi' },
    { name: 'Phục linh', slug: 'phuc-linh' },
    { name: 'Mẫu đơn', slug: 'mau-don' },
    { name: 'Bạch truật', slug: 'bach-truat' },
    { name: 'Đảng sâm', slug: 'dang-sam' },
    { name: 'Hoàng kỳ', slug: 'hoang-ky' },
    { name: 'Bạch chỉ', slug: 'bach-chi' },
    { name: 'Xích thược', slug: 'xich-thuoc' },
    { name: 'Đào nhân', slug: 'dao-nhan' },
  ];
  
  // All herbal medicines
  allHerbalMedicines = signal<HerbalMedicine[]>([]);
  filteredHerbalMedicines = signal<HerbalMedicine[]>([]);
  displayedHerbalMedicines = signal<HerbalMedicine[]>([]);
  loading = signal(false);
  
  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = 20;
  totalPages = computed(() => Math.ceil(this.filteredHerbalMedicines().length / this.itemsPerPage));
  
  // Recently viewed
  recentlyViewed = signal<Product[]>([]);
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cartService: CartService
  ) {}

  async ngOnInit() {
    // Initialize with common herbal medicines
    this.allHerbalMedicines.set([...this.commonHerbalMedicines]);
    this.applyFilters();
    
    // Load recently viewed
    this.loadRecentlyViewed();
    
    // Watch for search query params
    this.route.queryParams.subscribe(params => {
      const search = params['search'];
      if (search) {
        this.searchQuery.set(search);
        this.onSearch(search);
      }
    });
    
    // Watch for alphabet filter
    this.route.queryParams.subscribe(params => {
      const letter = params['letter'];
      if (letter) {
        this.selectedAlphabet.set(letter.toUpperCase());
        this.applyFilters();
      }
    });
  }

  applyFilters() {
    let filtered = [...this.allHerbalMedicines()];
    
    // Filter by alphabet
    if (this.selectedAlphabet() !== 'all' && this.selectedAlphabet() !== '5') {
      const letter = this.selectedAlphabet().toUpperCase();
      filtered = filtered.filter(herb => {
        const name = herb.name?.toUpperCase() || '';
        return name.startsWith(letter);
      });
    }
    
    // Filter by search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(herb => {
        const name = herb.name?.toLowerCase() || '';
        const vietnamese = herb.vietnameseName?.toLowerCase() || '';
        return name.includes(query) || vietnamese.includes(query);
      });
    }
    
    this.filteredHerbalMedicines.set(filtered);
    this.updateDisplayedHerbalMedicines();
  }

  updateDisplayedHerbalMedicines() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedHerbalMedicines.set(this.filteredHerbalMedicines().slice(start, end));
  }

  onAlphabetSelect(letter: string) {
    this.selectedAlphabet.set(letter);
    this.currentPage.set(1);
    this.applyFilters();
    
    // Update URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { letter: letter === 'all' ? null : letter },
      queryParamsHandling: 'merge'
    });
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
      this.updateDisplayedHerbalMedicines();
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

  navigateToHerbalMedicine(herbal: HerbalMedicine) {
    this.router.navigate(['/duoc-lieu', herbal.slug]);
  }

  navigateToProduct(product: Product) {
    this.router.navigate(['/product', product._id]);
  }

  formatPrice(price: number | null | undefined): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }
}

