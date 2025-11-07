import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Product } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { ToastService } from '../toast.service';

interface ActiveIngredient {
  name: string;
  slug: string;
  vietnameseName?: string;
}

@Component({
  selector: 'app-active-ingredient-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './active-ingredient-search.html',
  styleUrl: './active-ingredient-search.css',
})
export class ActiveIngredientSearch implements OnInit {
  // Search
  searchQuery = signal<string>('');
  
  // Alphabet filter
  selectedAlphabet = signal<string>('A');
  alphabetList = signal<string[]>(['5', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']);
  
  // Common ingredients (from image)
  commonIngredients: ActiveIngredient[] = [
    { name: 'Acetaminophen', slug: 'acetaminophen', vietnameseName: 'Acétaminophène' },
    { name: 'Ibuprofen', slug: 'ibuprofen' },
    { name: 'Calcium', slug: 'calcium' },
    { name: 'Fexofenadine', slug: 'fexofenadine' },
    { name: 'Cetirizine', slug: 'cetirizine' },
    { name: 'Bromhexine', slug: 'bromhexine' },
    { name: 'Acetylsalicylic acid', slug: 'acetylsalicylic-acid' },
    { name: 'Aluminum hydroxide', slug: 'aluminum-hydroxide' },
    { name: 'Acetylcysteine', slug: 'acetylcysteine' },
    { name: 'Acyclovir', slug: 'acyclovir' },
    { name: 'Allopurinol', slug: 'allopurinol' },
    { name: 'Azithromycin', slug: 'azithromycin' },
    { name: 'Amlodipine', slug: 'amlodipine' },
    { name: 'Aminocaproic Acid', slug: 'aminocaproic-acid' },
    { name: 'Artesunate', slug: 'artesunate' },
    { name: 'Amoxicillin', slug: 'amoxicillin' },
    { name: 'Adrenaline', slug: 'adrenaline' },
    { name: 'Abacavir', slug: 'abacavir' },
    { name: 'Amphotericin B', slug: 'amphotericin-b' },
    { name: 'Anakinra', slug: 'anakinra' },
    { name: 'Acetic acid', slug: 'acetic-acid' },
    { name: 'Atorvastatin', slug: 'atorvastatin' },
    { name: 'Amoxapine', slug: 'amoxapine' },
    { name: 'Aztreonam', slug: 'aztreonam' },
  ];
  
  // All ingredients
  allIngredients = signal<ActiveIngredient[]>([]);
  filteredIngredients = signal<ActiveIngredient[]>([]);
  displayedIngredients = signal<ActiveIngredient[]>([]);
  loading = signal(false);
  
  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = 20;
  totalPages = computed(() => Math.ceil(this.filteredIngredients().length / this.itemsPerPage));
  
  // Recently viewed
  recentlyViewed = signal<Product[]>([]);
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cartService: CartService
  ) {}

  async ngOnInit() {
    // Initialize with common ingredients
    this.allIngredients.set([...this.commonIngredients]);
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
    let filtered = [...this.allIngredients()];
    
    // Filter by alphabet
    if (this.selectedAlphabet() !== 'all' && this.selectedAlphabet() !== '5') {
      const letter = this.selectedAlphabet().toUpperCase();
      filtered = filtered.filter(ing => {
        const name = ing.name?.toUpperCase() || '';
        return name.startsWith(letter);
      });
    }
    
    // Filter by search query
    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      filtered = filtered.filter(ing => {
        const name = ing.name?.toLowerCase() || '';
        const vietnamese = ing.vietnameseName?.toLowerCase() || '';
        return name.includes(query) || vietnamese.includes(query);
      });
    }
    
    this.filteredIngredients.set(filtered);
    this.updateDisplayedIngredients();
  }

  updateDisplayedIngredients() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.displayedIngredients.set(this.filteredIngredients().slice(start, end));
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
      this.updateDisplayedIngredients();
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

  navigateToIngredient(ingredient: ActiveIngredient) {
    this.router.navigate(['/duoc-chat', ingredient.slug]);
  }

  navigateToProduct(product: Product) {
    this.router.navigate(['/product', product._id]);
  }

  formatPrice(price: number | null | undefined): string {
    if (!price) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }
}

