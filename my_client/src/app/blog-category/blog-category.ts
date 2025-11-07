import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';

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

interface SubcategoryMeta {
  name: string;
  slug: string;
  originalSlug?: string | null;
  level?: number | null;
  articleCount: number;
  icon?: string | null;
}

interface CategoryMeta {
  name: string;
  slug: string;
  articleCount: number;
  level?: number | null;
}

interface BreadcrumbEntry {
  name: string;
  slug: string;
}

interface BlogCategoryDetail {
  category: CategoryMeta;
  breadcrumb: BreadcrumbEntry[];
  subcategories: SubcategoryMeta[];
  selectedSubcategory: SubcategoryMeta | null;
  selectedSubcategorySlug: string | null;
  selectedSubcategoryRaw: string | null;
  articles: BlogSummary[];
  limit: number;
  total: number;
  remaining: number;
}

@Component({
  selector: 'app-blog-category',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-category.html',
  styleUrl: './blog-category.css'
})
export class BlogCategory implements OnInit {
  private readonly endpointBase = 'http://localhost:3000/api/blogs/category';
  private readonly defaultLimit = 18;

  private readonly detailState = signal<BlogCategoryDetail | null>(null);
  private readonly loadingState = signal<boolean>(false);
  private readonly errorState = signal<string | null>(null);
  private readonly slugState = signal<string>('');
  private readonly subcategoryState = signal<string | null>(null);

  detail = computed(() => this.detailState());
  loading = computed(() => this.loadingState());
  error = computed(() => this.errorState());

  categoryName = computed(() => this.detail()?.category?.name ?? 'Chuyên mục');
  categoryCount = computed(() => this.detail()?.category?.articleCount ?? 0);
  subcategories = computed(() => this.detail()?.subcategories ?? []);
  selectedSubcategory = computed(() => this.detail()?.selectedSubcategory ?? null);
  heroArticle = computed(() => this.detail()?.articles?.[0] ?? null);
  secondaryArticles = computed(() => (this.detail()?.articles ?? []).slice(1, 5));
  feedArticles = computed(() => (this.detail()?.articles ?? []).slice(5));
  remainingCount = computed(() => this.detail()?.remaining ?? 0);

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([paramMap, queryMap]) => {
      const rawSlug = paramMap.get('slug') ?? '';
      const decodedSlug = this.decodeSlug(rawSlug);
      const subcategory = queryMap.get('subcategory');

      this.slugState.set(decodedSlug);
      this.subcategoryState.set(subcategory);

      void this.loadCategoryDetail(decodedSlug, subcategory);
    });
  }

  async loadCategoryDetail(slug: string, subcategory: string | null): Promise<void> {
    if (!slug) {
      this.detailState.set(null);
      this.errorState.set('Không tìm thấy chuyên mục');
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      const endpoint = this.buildEndpoint(slug, subcategory);
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = await response.json();

      if (!payload?.success || !payload?.data) {
        throw new Error('Không thể tải dữ liệu chuyên mục');
      }

      this.detailState.set(payload.data as BlogCategoryDetail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('❌ Error loading blog category detail:', error);
      this.errorState.set(error?.message || 'Lỗi khi tải chuyên mục');
    } finally {
      this.loadingState.set(false);
    }
  }

  private buildEndpoint(slug: string, subcategory: string | null): string {
    const encodedSlug = encodeURIComponent(slug);
    const params = new URLSearchParams();
    params.set('limit', String(this.defaultLimit));
    if (subcategory) {
      params.set('subcategory', subcategory);
    }
    return `${this.endpointBase}/${encodedSlug}?${params.toString()}`;
  }

  private decodeSlug(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  isAllActive(): boolean {
    return !this.detail()?.selectedSubcategorySlug;
  }

  isSubcategoryActive(subcategory: SubcategoryMeta): boolean {
    return (this.detail()?.selectedSubcategorySlug ?? null) === (subcategory?.slug ?? null);
  }

  selectAll(): void {
    const slug = this.slugState();
    if (!slug) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { subcategory: undefined },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  selectSubcategory(subcategory: SubcategoryMeta): void {
    const slug = this.slugState();
    if (!slug) {
      return;
    }

    const current = this.detail()?.selectedSubcategorySlug;
    const target = subcategory?.slug ?? null;

    if (current && target && current === target) {
      this.selectAll();
      return;
    }

    const raw = subcategory?.originalSlug ?? subcategory?.slug;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { subcategory: raw || undefined },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  navigateToArticle(article: BlogSummary | null | undefined): void {
    if (!article) {
      return;
    }
    const slug = (article.cleanSlug || article.slug || article.id || '').toString();
    if (!slug) {
      return;
    }
    const cleanSlug = slug.replace(/^bai-viet\//, '').replace(/\.html$/, '');
    this.router.navigate(['/blog', cleanSlug]);
  }

  viewAll(): void {
    const detail = this.detail();
    if (!detail) {
      return;
    }

    const targetSlug = detail.selectedSubcategory?.originalSlug || detail.selectedSubcategorySlug || detail.category?.slug;

    if (!targetSlug) {
      return;
    }

    this.router.navigate(['/blogs'], {
      queryParams: {
        category: targetSlug
      }
    });
  }

  retry(): void {
    void this.loadCategoryDetail(this.slugState(), this.subcategoryState());
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

  formatCount(count: number): string {
    try {
      return new Intl.NumberFormat('vi-VN').format(count);
    } catch {
      return String(count);
    }
  }

  truncate(text: string | undefined, maxLength = 160): string {
    if (!text) {
      return '';
    }
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  getArticleSummary(article: BlogSummary, maxLength = 160): string {
    return this.truncate(article?.shortDescription || article?.headline || '', maxLength);
  }

  getArticleCategory(article: BlogSummary): string {
    return article?.category || this.detail()?.category?.name || 'Góc sức khỏe';
  }

  getArticleAuthor(article: BlogSummary): string {
    return article?.author || 'MediCare';
  }

  getArticleImage(article: BlogSummary): string {
    return article?.primaryImage || 'https://via.placeholder.com/720x480?text=MediCare+Blog';
  }

  getSubcategoryIcon(subcategory: SubcategoryMeta): string | null {
    return subcategory?.icon || null;
  }

  getSubcategoryInitial(subcategory: SubcategoryMeta): string {
    const source = subcategory?.name || '';
    return source.trim().charAt(0).toUpperCase() || 'M';
  }

  getBreadcrumbLink(entry: BreadcrumbEntry, index: number, total: number) {
    if (index === total - 1) {
      return null;
    }

    if (entry.slug === '/') {
      return ['/'];
    }

    if (entry.slug === 'blogs') {
      return ['/blogs'];
    }

    return ['/blogs/category', entry.slug];
  }
}


