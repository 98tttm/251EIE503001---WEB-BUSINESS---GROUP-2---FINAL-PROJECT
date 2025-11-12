import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

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

interface CategoryOverview {
  name: string;
  slug: string;
  articleCount: number;
  articles: BlogSummary[];
  subcategories?: Array<{ name: string; slug: string; articleCount: number }>;
}

interface TagOverview {
  slug: string;
  title: string;
  articleCount: number;
}

interface ExpertOverview {
  id: string | number | null;
  fullName: string;
  degree: string | null;
  position: string | null;
  avatar: string | null;
  slug: string | null;
  articleCount: number;
}

interface BlogOverviewData {
  heroArticles: BlogSummary[];
  categories: CategoryOverview[];
  trendingTags: TagOverview[];
  experts: ExpertOverview[];
}

@Component({
  selector: 'app-listblog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './listblog.html',
  styleUrl: './listblog.css'
})
export class Listblog implements OnInit, OnDestroy {
  private readonly overviewEndpoint = `${environment.apiUrl}/api/blogs/overview`;
  private readonly listEndpoint = `${environment.apiUrl}/api/blogs`;

  overview = signal<BlogOverviewData | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  selectedCategorySlug = signal<string | null>(null);
  
  // Tag filtering
  selectedTag = signal<string | null>(null);
  selectedTagTitle = signal<string | null>(null);
  tagArticles = signal<BlogSummary[]>([]);
  tagTotal = signal<number>(0);
  tagPage = signal<number>(1);
  tagLimit = 12;
  showTagList = signal<boolean>(false);
  
  private routeSubscription?: Subscription;

  heroPrimary = computed(() => this.overview()?.heroArticles?.[0] ?? null);
  heroSecondary = computed(() => (this.overview()?.heroArticles ?? []).slice(1, 6));
  categories = computed(() => this.overview()?.categories ?? []);
  trendingTags = computed(() => this.overview()?.trendingTags ?? []);
  experts = computed(() => this.overview()?.experts ?? []);

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    // Check for tag query parameter
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      const tagSlug = params['tag'];
      if (tagSlug) {
        this.selectedTag.set(tagSlug);
        void this.loadTagArticles(tagSlug);
      } else {
        this.selectedTag.set(null);
        this.showTagList.set(false);
        void this.loadOverview();
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${url}: HTTP ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch (error: any) {
      const preview = text.slice(0, 120);
      throw new Error(`${url}: Không thể phân tích JSON (${error?.message || error}). Preview: ${preview}`);
    }
  }

  async loadOverview(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.fetchJson<{ success: boolean; data?: BlogOverviewData }>(this.overviewEndpoint);
      if (result?.success && result?.data) {
        this.overview.set(result.data);
      } else {
        this.error.set('Không thể tải danh sách bài viết');
      }
    } catch (error: any) {
      console.error('❌ Error loading blog overview:', error);
      this.error.set(error?.message || 'Lỗi khi tải bài viết');
    } finally {
      this.loading.set(false);
    }
  }

  selectCategoryChip(category: CategoryOverview | null): void {
    const slug = category?.slug || null;
    this.selectedCategorySlug.set(slug);

    if (!slug) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const elementId = `category-${slug}`;
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  viewCategory(category: CategoryOverview): void {
    if (!category?.slug) {
      return;
    }
    this.router.navigate(['/blogs/category', category.slug]);
  }

  viewSubcategory(categorySlug: string, subcategorySlug?: string | null): void {
    if (!categorySlug) {
      return;
    }
    this.router.navigate(['/blogs/category', categorySlug], {
      queryParams: subcategorySlug ? { subcategory: subcategorySlug } : undefined
    });
  }

  async loadTagArticles(tagSlug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.showTagList.set(true);
    
    try {
      // Ensure we have trendingTags loaded first
      if (this.trendingTags().length === 0) {
        await this.loadOverview();
      }
      
      // Find tag title from trendingTags
      const tag = this.trendingTags().find(t => t.slug === tagSlug);
      if (tag) {
        this.selectedTagTitle.set(tag.title);
      } else {
        // Fallback: use slug as title if not found
        this.selectedTagTitle.set(tagSlug);
      }
      
      const url = `${this.listEndpoint}?tag=${encodeURIComponent(tagSlug)}&page=${this.tagPage()}&limit=${this.tagLimit}`;
      const result = await this.fetchJson<{ 
        success: boolean; 
        data?: { 
          items: BlogSummary[]; 
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
        } 
      }>(url);
      
      if (result?.success && result?.data) {
        this.tagArticles.set(result.data.items || []);
        this.tagTotal.set(result.data.total || 0);
      } else {
        this.error.set('Không thể tải danh sách bài viết');
      }
    } catch (error: any) {
      console.error('❌ Error loading tag articles:', error);
      this.error.set(error?.message || 'Lỗi khi tải bài viết');
    } finally {
      this.loading.set(false);
    }
  }

  loadMoreTagArticles(): void {
    if (this.loading()) return;
    
    this.tagPage.set(this.tagPage() + 1);
    const tagSlug = this.selectedTag();
    if (tagSlug) {
      void this.loadMoreTagArticlesPage(tagSlug);
    }
  }

  private async loadMoreTagArticlesPage(tagSlug: string): Promise<void> {
    this.loading.set(true);
    
    try {
      const url = `${this.listEndpoint}?tag=${encodeURIComponent(tagSlug)}&page=${this.tagPage()}&limit=${this.tagLimit}`;
      const result = await this.fetchJson<{ 
        success: boolean; 
        data?: { 
          items: BlogSummary[]; 
          total: number;
          page: number;
          limit: number;
          totalPages: number;
          hasNextPage: boolean;
        } 
      }>(url);
      
      if (result?.success && result?.data?.items) {
        this.tagArticles.set([...this.tagArticles(), ...result.data.items]);
      }
    } catch (error: any) {
      console.error('❌ Error loading more tag articles:', error);
    } finally {
      this.loading.set(false);
    }
  }

  hasMoreTagArticles(): boolean {
    return this.tagArticles().length < this.tagTotal();
  }

  clearTagFilter(): void {
    this.selectedTag.set(null);
    this.selectedTagTitle.set(null);
    this.tagArticles.set([]);
    this.tagPage.set(1);
    this.showTagList.set(false);
    this.router.navigate(['/blogs'], { queryParams: {} });
  }

  viewTag(tag: TagOverview): void {
    if (!tag?.slug) {
      return;
    }
    this.tagPage.set(1);
    this.router.navigate(['/blogs'], { queryParams: { tag: tag.slug } });
  }

  navigateToArticle(article: BlogSummary | null | undefined): void {
    if (!article) {
      return;
    }
    const slug = article.cleanSlug ?? article.slug ?? article.id;
    if (!slug) {
      return;
    }
    const cleanSlug = String(slug).replace(/^bai-viet\//, '').replace(/\.html$/, '');
    this.router.navigate(['/blog', cleanSlug]);
  }

  getFeatureArticle(category: CategoryOverview): BlogSummary | null {
    return category?.articles?.[0] ?? null;
  }

  getSupportingArticles(category: CategoryOverview): BlogSummary[] {
    return (category?.articles ?? []).slice(1, 5);
  }

  getCategoryImage(article: BlogSummary | null): string {
    if (!article) {
      return '/assets/images/icon/logo_tròn.png';
    }
    return article.primaryImage || '/assets/images/icon/logo_tròn.png';
  }

  getArticleDescription(article: BlogSummary | null): string {
    if (!article) {
      return '';
    }
    return article.shortDescription || article.headline || '';
  }

  formatDate(dateString?: string | null): string {
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

  truncate(text: string | undefined, maxLength = 110): string {
    if (!text) {
      return '';
    }
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  formatTagCount(count: number): string {
    if (count > 1000) {
      return `${Math.round(count / 100) / 10}k`;
    }
    return String(count);
  }

  getExpertInitials(name: string): string {
    if (!name) {
      return '?';
    }
    return name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  }
}
