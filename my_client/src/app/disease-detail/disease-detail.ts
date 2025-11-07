import { Component, OnInit, signal, computed, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';

interface Disease {
  _id?: string;
  id: number;
  url: string;
  slug: string;
  name: string;
  headline: string;
  title: string;
  summary?: string;
  content_sections?: Array<{
    key: string;
    label: string;
    html: string;
    text: string;
    word_count?: number;
    anchorId?: string;
  }>;
  primary_image?: {
    url: string;
    alternativeText?: string;
  };
  slider_images?: Array<{
    url: string;
    alternativeText?: string;
  }>;
  categories?: Array<{
    id: number;
    name: string;
    fullPathSlug: string;
  }>;
  tags?: Array<{
    id: number;
    title: string;
    slug: string;
  }>;
  author?: {
    fullName?: string;
    position?: string;
  };
  display_author?: {
    fullName?: string;
    position?: string;
  };
  related_diseases?: Array<{
    id: number;
    name: string;
    slug: string;
    headline?: string;
  }>;
  faqs?: Array<{
    id: number;
    question: string;
    answer_html: string;
    answer_text: string;
  }>;
}

type DiseaseContentSection = NonNullable<Disease['content_sections']>[number];

@Component({
  selector: 'app-disease-detail',
  imports: [CommonModule, RouterModule],
  templateUrl: './disease-detail.html',
  styleUrl: './disease-detail.css',
})
export class DiseaseDetail implements OnInit, AfterViewInit {
  disease = signal<Disease | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  activeSection = signal<string>('');

  private readonly specializedGroupBackgroundMap: Record<string, string> = {
    'Ung thư': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Ung_thu_Desk_fix_4c02317596.png',
    'Tim mạch': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tim_mach_9028e786c0.png',
    'Nội tiết - chuyển hóa': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Noi_tiet_Chuyen_hoa_c8522f4650.png',
    'Cơ - Xương - Khớp': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Co_Xuong_Khop_25d66c75f9.png',
    'Da - Tóc - Móng': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Da_Toc_Mong_daf68ce450.png',
    'Máu': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Mau_739ac8909a.png',
    'Hô hấp': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Ho_hap_Desk_fix_86d6c45267.png',
    'Dị ứng': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Di_ung_Desk_fix_e3dbd6c327.png',
    'Mắt': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Mat_2dc8af71fd.png',
    'Răng - Hàm - Mặt': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Rang_Ham_Mat_Desk_fix_bd7496ac1e.png',
    'Sức khỏe giới tính': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Suc_khoe_gioi_tinh_b75f3b3983.png',
    'Sức khỏe sinh sản': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Suc_khoe_sinh_san_1b79c0183b.png',
    'Tai - Mũi - Họng': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tai_Mui_Hong_Desk_fix_ad0e24f4e6.png',
    'Tâm thần': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tam_than_Desk_fix_07090b9926.png',
    'Thận - Tiết niệu': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Than_tiet_nieu_c2ef5b3f35.png',
    'Thần kinh - Tinh thần': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Than_kinh_Tinh_than_Desk_fix_089122cb9a.png',
    'Tiêu hóa': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tieu_hoa_2a77debea0.png',
    'Truyền nhiễm': 'https://cdn.nhathuoclongchau.com.vn/unsafe/1920x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Truyen_nhiem_Desk_fix_b721fa5fca.png'
  };

  private readonly specializedGroupBackgroundNormalized = new Map<string, string>(
    Object.entries(this.specializedGroupBackgroundMap).map(([name, url]) => [
      this.normalizeCategoryName(name),
      url
    ])
  );

  primaryCategoryName = computed(() => this.disease()?.categories?.[0]?.name ?? '');

  heroBackground = computed(() => {
    const primaryImage = this.disease()?.primary_image?.url;
    if (primaryImage) {
      return primaryImage;
    }

    const normalized = this.normalizeCategoryName(this.primaryCategoryName());
    if (!normalized) {
      return '';
    }
    return this.specializedGroupBackgroundNormalized.get(normalized) ?? '';
  });

  heroSubtitle = computed(() => {
    const category = this.primaryCategoryName();
    if (category) {
      return `Cùng nhà thuốc MediCare tìm hiểu các bệnh về ${category.toLowerCase()}`;
    }
    const diseaseName = this.disease()?.name ?? 'bệnh';
    return `Cùng nhà thuốc MediCare tìm hiểu về ${diseaseName.toLowerCase()}`;
  });

  tableOfContents = computed(() => {
    const sections = this.disease()?.content_sections;
    if (!sections || sections.length === 0) {
      return [] as Array<{ label: string; id: string }>;
    }

    return sections
      .filter(section => !!section.label && !!section.anchorId)
      .map(section => ({
        label: section.label,
        id: section.anchorId as string
      }));
  });

  @ViewChild('contentPanel') contentPanel?: ElementRef<HTMLDivElement>;

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

  ngOnInit() {
    const idOrSlug = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('slug');
    if (idOrSlug) {
      this.loadDisease(idOrSlug);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.initializeActiveSection(), 0);
  }

  private initializeActiveSection() {
    const toc = this.tableOfContents();
    if (toc.length > 0) {
      this.activeSection.set(toc[0].id);
    }
  }

  async loadDisease(idOrSlug: string) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await fetch(`${environment.apiUrl}/api/diseases/${idOrSlug}`);
      const result = await response.json();

      if (result.success && result.data) {
        const processedSections = result.data.content_sections?.map((section: DiseaseContentSection, index: number) => ({
          ...section,
          anchorId: this.createSectionAnchor(section, index)
        }));

        this.disease.set({
          ...result.data,
          content_sections: processedSections
        });
      } else {
        this.error.set('Không tìm thấy thông tin bệnh');
      }
    } catch (error) {
      console.error('Error loading disease:', error);
      this.error.set('Lỗi khi tải thông tin bệnh');
    } finally {
      this.loading.set(false);

      setTimeout(() => this.initializeActiveSection(), 100);
    }
  }

  goBack() {
    this.router.navigate(['/diseases']);
  }

  navigateToDisease(slug: string) {
    // Extract ID from slug if possible
    const idMatch = slug.match(/\d+/);
    if (idMatch) {
      this.router.navigate(['/disease', idMatch[0]]);
    } else {
      this.router.navigate(['/disease', slug]);
    }
  }

  private normalizeCategoryName(name: string | null | undefined): string {
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

  private createSectionAnchor(section: DiseaseContentSection, index: number): string {
    const base = section.key ? this.normalizeCategoryName(section.key) : this.slugify(section.label ?? `section-${index}`);
    return base ? `section-${base}` : `section-${index}`;
  }

  private slugify(value: string): string {
    return value
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') ?? '';
  }

  scrollToSection(sectionId: string) {
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

  onContentScroll() {
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
}

