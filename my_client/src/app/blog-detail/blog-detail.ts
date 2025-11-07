import { Component, OnInit, OnDestroy, AfterViewInit, computed, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiUrl;

interface BlogBreadcrumbItem {
  name?: string;
  slug?: string;
}

interface BlogRelatedArticle {
  id: number | string | null;
  name: string;
  slug: string;
  cleanSlug: string;
  createdAt: string | null;
  redirectUrl: string | null;
}

interface BlogApprover {
  fullName?: string;
  degree?: string;
  position?: string;
  avatar?: {
    url?: string;
    alternativeText?: string | null;
  } | null;
}

type MaybeTag = string | { title?: string; slug?: string };

interface BlogArticleDetail {
  id: number | string | null;
  slug: string;
  cleanSlug: string;
  url: string | null;
  title: string;
  shortDescription: string;
  descriptionHtml: string;
  primaryImage: string | null;
  publishedAt: string | null;
  author: string | null;
  category: string | null;
  categorySlug: string | null;
  tags: MaybeTag[];
  hashtags: string[];
  breadcrumb: BlogBreadcrumbItem[];
  relatedArticles: BlogRelatedArticle[];
  products: any[];
  approver: BlogApprover | null;
  detailSeo: any;
  contentHtml?: string;
}

interface TocItem {
  id: string;
  label: string;
  level: number;
}

interface DisplayTag {
  label: string;
  slug?: string;
}

interface FetchArticleResult {
  article: BlogArticleDetail | null;
  error?: string;
}

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.css',
})
export class BlogDetail implements OnInit, OnDestroy, AfterViewInit {
  article = signal<BlogArticleDetail | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  tableOfContents = signal<TocItem[]>([]);
  activeSection = signal<string | null>(null);

  @ViewChild('contentPanel') contentPanel?: ElementRef<HTMLDivElement>;

  private readonly apiBase = API_BASE_URL;
  private currentSlug: string | null = null;
  private routeSubscription?: Subscription;

  private readonly tocWatcher = effect(() => {
    const toc = this.tableOfContents();
    if (toc.length > 0) {
      queueMicrotask(() => {
        if (!this.activeSection() || !toc.some(item => item.id === this.activeSection())) {
          this.activeSection.set(toc[0].id);
        }
      });
    }
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  formattedPublishedDate = computed(() => {
    const publishedAt = this.article()?.publishedAt;
    if (!publishedAt) {
      return '';
    }

    try {
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(publishedAt));
    } catch {
      return publishedAt;
    }
  });

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const slugParam = params.get('slug');

      if (!slugParam) {
        this.loading.set(false);
        this.article.set(null);
        this.error.set('Không tìm thấy bài viết');
        return;
      }

      const decoded = decodeURIComponent(slugParam);
      const normalized = this.normalizeSlug(decoded);
      const targetSlug = normalized || decoded;

      this.currentSlug = targetSlug;
      void this.loadArticle(targetSlug);
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initializeActiveSection(), 0);
  }

  private initializeActiveSection(): void {
    const toc = this.tableOfContents();
    if (toc.length > 0 && !this.activeSection()) {
      this.activeSection.set(toc[0].id);
    }
  }

  private normalizeSlug(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value
      .trim()
      .replace(/^https?:\/\/[^/]+\//i, '')
      .replace(/^\//, '')
      .replace(/[#?].*$/, '')
      .replace(/^bai-viet\//i, '')
      .replace(/\.html$/i, '');
  }

  private buildSlugCandidates(slug: string): string[] {
    const normalized = this.normalizeSlug(slug);
    const baseCandidate = normalized || slug.trim();
    const candidates = new Set<string>();

    const candidateList = [
      slug,
      normalized,
      baseCandidate,
      `bai-viet/${baseCandidate}`,
      `${baseCandidate}.html`,
      `bai-viet/${baseCandidate}.html`
    ];

    if (slug.startsWith('bai-viet/')) {
      const trimmed = slug.replace(/^bai-viet\//, '');
      candidateList.push(trimmed, `${trimmed}.html`);
    }

    candidateList
      .filter((candidate): candidate is string => !!candidate && candidate.trim().length > 0)
      .forEach((candidate) => {
        candidates.add(candidate.replace(/^\//, ''));
      });

    return Array.from(candidates);
  }

  async loadArticle(slug: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.currentSlug = slug;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.article.set(null);
    this.tableOfContents.set([]);
    this.activeSection.set(null);

    try {
      const fetchResult = await this.fetchArticleSequential(slug);

      if (fetchResult.article) {
        const enhanced = this.prepareArticle(fetchResult.article);
        this.article.set(enhanced.article);
        this.tableOfContents.set(enhanced.toc);
        if (enhanced.toc.length > 0) {
          this.activeSection.set(enhanced.toc[0].id);
        }
      } else {
        this.error.set(fetchResult.error || 'Không tìm thấy bài viết');
      }
    } catch (error) {
      console.error('Error loading blog article:', error);
      this.error.set('Lỗi khi tải bài viết');
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchArticleSequential(slug: string): Promise<FetchArticleResult> {
    const slugCandidates = this.buildSlugCandidates(slug);
    if (slugCandidates.length === 0) {
      slugCandidates.push(slug.replace(/^\//, ''));
    }
    const errors: string[] = [];

    for (const candidate of slugCandidates) {
      for (const resource of ['blogs', 'articles']) {
        const endpointPath = `/api/${resource}/${candidate}`;
        const url = `${this.apiBase}${endpointPath}`;

        try {
          const response = await fetch(url, {
            headers: {
              Accept: 'application/json'
            }
          });

          if (!response.ok) {
            errors.push(`${endpointPath}: ${response.status} ${response.statusText}`);
            continue;
          }

          const contentType = response.headers.get('content-type') || '';
          const payloadText = await response.text();

          if (!contentType.includes('application/json')) {
            errors.push(`${endpointPath}: Unexpected content-type ${contentType || 'unknown'} (preview: ${payloadText.slice(0, 120)})`);
            continue;
          }

          let parsed: any = null;
          try {
            parsed = JSON.parse(payloadText);
          } catch (parseError: any) {
            errors.push(`${endpointPath}: Cannot parse JSON (${parseError?.message || parseError}). Preview: ${payloadText.slice(0, 120)}`);
            continue;
          }

          if (parsed?.success && parsed?.data) {
            return { article: parsed.data as BlogArticleDetail };
          }

          errors.push(`${endpointPath}: Response missing data.`);
        } catch (error: any) {
          errors.push(`${endpointPath}: ${error?.message || error}`);
        }
      }
    }

    return {
      article: null,
      error: errors.join('\n')
    };
  }

  prepareArticle(article: BlogArticleDetail): { article: BlogArticleDetail; toc: TocItem[] } {
    const cleanedHtml = this.cleanArticleHtml(article.descriptionHtml || '');
    const { html: processedHtml, toc } = this.injectAnchorsAndBuildToc(cleanedHtml);

    return {
      article: {
        ...article,
        contentHtml: processedHtml
      },
      toc
    };
  }

  cleanArticleHtml(html: string): string {
    if (!html) {
      return '';
    }

    let content = html;

    // Remove "Có thể bạn quan tâm" sections or promotional blocks
    content = content.replace(
      /<h[2-6][^>]*>[\s\S]*?Có thể bạn quan tâm[\s\S]*?<\/h[2-6]>[\s\S]*?(?=<h[2-6]|$)/gi,
      ''
    );

    content = content.replace(
      /<section[^>]*>[\s\S]*?Có thể bạn quan tâm[\s\S]*?<\/section>/gi,
      ''
    );

    // Remove disclaimers referencing promotional content
    content = content.replace(
      /<p[^>]*>[\s\S]*?Thông tin và sản phẩm gợi ý trong bài viết[\s\S]*?<\/p>/gi,
      ''
    );

    return content;
  }

  injectAnchorsAndBuildToc(html: string): { html: string; toc: TocItem[] } {
    if (!html) {
      return { html, toc: [] };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = Array.from(doc.querySelectorAll('h2, h3, h4')) as HTMLHeadingElement[];
    const toc: TocItem[] = [];

    headings.forEach((heading, index) => {
      const level = Number.parseInt(heading.tagName.replace('H', ''), 10);
      const text = heading.textContent?.trim() ?? `Mục ${index + 1}`;
      const slug = this.slugify(text);
      const anchorId = `section-${slug || index}`;

      heading.id = anchorId;

      toc.push({
        id: anchorId,
        label: text,
        level
      });
    });

    return { html: doc.body.innerHTML, toc };
  }

  slugify(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  onContentScroll(): void {
    const container = this.contentPanel?.nativeElement;
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const offset = containerRect.top + 80;

    for (const item of this.tableOfContents()) {
      const element = document.getElementById(item.id);
      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.top <= offset && rect.bottom >= offset) {
        if (this.activeSection() !== item.id) {
          this.activeSection.set(item.id);
        }
        break;
      }
    }
  }

  scrollToSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    const container = this.contentPanel?.nativeElement;
    const element = document.getElementById(sectionId);

    if (container && element) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = elementRect.top - containerRect.top + container.scrollTop - 20;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getDisplayTags(): DisplayTag[] {
    const article = this.article();
    if (!article) {
      return [];
    }

    const rawTags: MaybeTag[] = Array.isArray(article.tags) ? article.tags : [];

    const tagObjects: DisplayTag[] = rawTags
      .map((tag) => {
        if (!tag) {
          return null;
        }
        if (typeof tag === 'string') {
          return { label: tag } as DisplayTag;
        }
        const label = tag.title ?? '';
        if (!label) {
          return null;
        }
        return {
          label,
          slug: tag.slug || undefined
        } as DisplayTag;
      })
      .filter((tag): tag is DisplayTag => !!tag && !!tag.label);

    const hashTags: DisplayTag[] = (article.hashtags || [])
      .map((hash) => {
        if (!hash) {
          return null;
        }
        return { label: hash } as DisplayTag;
      })
      .filter((tag): tag is DisplayTag => !!tag);

    const uniqueMap = new Map<string, DisplayTag>();

    [...tagObjects, ...hashTags].forEach((tag) => {
      const key = (tag.slug || tag.label).toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, tag);
      }
    });

    return Array.from(uniqueMap.values());
  }

  navigateToRelatedArticle(article: BlogRelatedArticle): void {
    if (article.cleanSlug) {
      this.router.navigate(['/blog', article.cleanSlug]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (article.slug) {
      const normalized = article.slug.replace(/^bai-viet\//, '').replace(/\.html$/, '');
      this.router.navigate(['/blog', normalized]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (article.redirectUrl) {
      window.open(article.redirectUrl, '_blank');
    }
  }

  goBack(): void {
    this.router.navigate(['/blogs']);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
