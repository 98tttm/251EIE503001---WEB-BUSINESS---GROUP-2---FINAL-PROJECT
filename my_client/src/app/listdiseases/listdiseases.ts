import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

interface Disease {
  _id?: string;
  id: number;
  url: string;
  slug: string;
  name: string;
  headline: string;
  summary?: string;
  primary_image?: {
    url: string;
    alternativeText?: string;
  };
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
}

interface SpecializedGroup {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface DiseaseCard {
  id: number;
  name: string;
  slug: string;
  headline?: string;
  summary?: string;
  primary_image?: {
    url: string;
    alternativeText?: string;
  };
  categories?: Array<{
    id: number;
    name: string;
    fullPathSlug: string;
  }>;
  groupIcon?: string;
  groupName?: string;
}

@Component({
  selector: 'app-listdiseases',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './listdiseases.html',
  styleUrl: './listdiseases.css',
})
export class Listdiseases implements OnInit {
  allDiseases = signal<Disease[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  selectedBodyPart = signal<string>('đầu');
  
  currentPage = signal<number>(1);
  diseasesPerPage = signal<number>(16); // show 16 diseases per page for clearer pagination

  // Specialized disease groups - dynamically loaded from MongoDB
  specializedGroups = signal<SpecializedGroup[]>([]);
  showAllSpecializedGroups = signal<boolean>(false);

  // Map group name to custom image icon
  private specializedGroupIconMap: Record<string, string> = {
    'Ung thư': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Ung_thu_637f743959.png',
    'Tim mạch': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tim_mach_f058f1eba6.png',
    'Nội tiết - chuyển hóa': '/assets/images/icon/Noi_tiet_Chuyen_hoa.png',
    'Cơ - Xương - Khớp': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Co_Xuong_Khop_5ae32d7e8c.png',
    'Da - Tóc - Móng': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Da_Toc_Mong_5e78940b9b.png',
    'Máu': '/assets/images/icon/Mau_cfd65af040.png',
    'Hô hấp': '/assets/images/icon/Hohap.png',
    'Dị ứng': '/assets/images/icon/Di_ung_aee305cf33.png',
    'Mắt': '/assets/images/icon/Than_tiet_nieu.png',
    'Răng - Hàm - Mặt': '/assets/images/icon/Rang_Ham_Mat_ce54f37000.png',
    'Sức khỏe giới tính': '/assets/images/icon/Suc_khoe_gioi_tinh_38600ad2ff.png',
    'Sức khỏe sinh sản': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Suc_khoe_sinh_san_14716c7662.png',
    'Tai - Mũi - Họng': '/assets/images/icon/Tai_Mui_Hong.png',
    'Tâm thần': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tam_than_ef11f87348.png',
    'Thận - Tiết niệu': '/assets/images/icon/Than_tiet_nieu.png',
    'Thần kinh - Tinh thần': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Than_kinh_Tinh_than_fix_7b3acc213f.png',
    'Tiêu hóa': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Tieu_hoa_703881d880.png',
    'Truyền nhiễm': 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Truyen_nhiem_87bd778b6d.png'
  };

  private readonly specializedGroupBackgroundMap: Record<string, string> = {
    'Ung thư': '/assets/images/icon/theme_ungthu.webp',
    'Tim mạch': '/assets/images/icon/theme_timmach.webp',
    'Nội tiết - chuyển hóa': '/assets/images/icon/theme_noitiet.webp',
    'Cơ - Xương - Khớp': '/assets/images/icon/theme_coxuongkhop.webp',
    'Da - Tóc - Móng': '/assets/images/icon/theme_datocmong.webp',
    'Máu': '/assets/images/icon/theme_mau.webp',
    'Hô hấp': '/assets/images/icon/theme_hohap.webp',
    'Dị ứng': '/assets/images/icon/theme_diung.webp',
    'Mắt': '/assets/images/icon/theme_mat.webp',
    'Răng - Hàm - Mặt': '/assets/images/icon/theme_mat.webp',
    'Sức khỏe giới tính': '/assets/images/icon/theme_gioitinh.webp',
    'Sức khỏe sinh sản': '/assets/images/icon/theme_sinhsan.webp',
    'Tai - Mũi - Họng': '/assets/images/icon/theme_taimuihong.webp',
    'Tâm thần': '/assets/images/icon/theme_tamthan.webp',
    'Thận - Tiết niệu': '/assets/images/icon/theme_thantietnieu.webp',
    'Thần kinh - Tinh thần': '/assets/images/icon/theme_thankinhtinhthan.webp',
    'Tiêu hóa': '/assets/images/icon/theme_tieuhoa.webp',
    'Truyền nhiễm': '/assets/images/icon/theme_truyennhiem.webp'
  };

  private readonly specializedGroupBackgroundNormalized = new Map<string, string>(
    Object.entries(this.specializedGroupBackgroundMap).map(([name, url]) => [
      this.normalizeSpecializedGroupName(name),
      url
    ])
  );

  private readonly specializedGroupBackgroundBySlug: Record<string, string> = {
    'ung-thu': '/assets/images/icon/theme_ungthu.webp',
    'tim-mach': '/assets/images/icon/theme_timmach.webp',
    'noi-tiet-chuyen-hoa': '/assets/images/icon/theme_noitiet.webp',
    'co-xuong-khop': '/assets/images/icon/theme_coxuongkhop.webp',
    'da-toc-mong': '/assets/images/icon/theme_datocmong.webp',
    'mau': '/assets/images/icon/theme_mau.webp',
    'ho-hap': '/assets/images/icon/theme_hohap.webp',
    'di-ung': '/assets/images/icon/theme_diung.webp',
    'mat': '/assets/images/icon/theme_mat.webp',
    'rang-ham-mat': '/assets/images/icon/theme_mat.webp',
    'suc-khoe-gioi-tinh': '/assets/images/icon/theme_gioitinh.webp',
    'suc-khoe-sinh-san': '/assets/images/icon/theme_sinhsan.webp',
    'tai-mui-hong': '/assets/images/icon/theme_taimuihong.webp',
    'tam-than': '/assets/images/icon/theme_tamthan.webp',
    'than-tiet-nieu': '/assets/images/icon/theme_thantietnieu.webp',
    'than-kinh-tinh-than': '/assets/images/icon/theme_thankinhtinhthan.webp',
    'tieu-hoa': '/assets/images/icon/theme_tieuhoa.webp',
    'truyen-nhiem': '/assets/images/icon/theme_truyennhiem.webp'
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

  filteredSpecializedGroups = computed(() => {
    const groups = this.specializedGroups();
    if (!groups || groups.length === 0) {
      return [] as SpecializedGroup[];
    }
    return groups.filter(group => {
      const normalizedName = this.normalizeSpecializedGroupName(group.name);
      return !this.excludedSpecializedGroupNames.has(normalizedName);
    });
  });

  displayedSpecializedGroups = computed(() => {
    const groups = this.filteredSpecializedGroups();
    if (!groups || groups.length === 0) {
      return [] as SpecializedGroup[];
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

  showMoreSpecializedGroupsLabel = computed(() => {
    if (this.showAllSpecializedGroups()) {
      return 'Thu gọn';
    }
    const remaining = this.remainingSpecializedGroupCount();
    return remaining > 0 ? `Xem thêm ${remaining} nhóm bệnh` : '';
  });

  showMoreSpecializedGroupsVisible = computed(() => this.filteredSpecializedGroups().length > 8);

  toggleSpecializedGroups() {
    this.showAllSpecializedGroups.set(!this.showAllSpecializedGroups());
  }
  
  // Diseases for specialized groups section - display actual diseases instead of groups
  specializedDiseases = signal<DiseaseCard[]>([]);
  
  // Currently selected category filter
  selectedCategory = signal<string>('');
  selectedCategoryName = signal<string>('');
  selectedCategoryBackground = signal<string>('');
  
  // View mode: 'all' for showing all diseases with body parts, 'category' for showing category-filtered diseases
  viewMode = signal<'all' | 'category'>('all');

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Check for category query param first
    this.route.queryParams.subscribe(params => {
      const category = params['category'];
      if (category) {
        // Category view mode
        this.viewMode.set('category');
        this.selectedCategory.set(category);
        this.loadAllDiseases(category);
        this.findCategoryName(category);
      } else {
        // All diseases view mode
        this.viewMode.set('all');
        this.loadAllDiseases();
        this.loadSpecializedGroups();
        this.selectedCategoryBackground.set('');
      }
    });
  }

  async loadAllDiseases(category?: string) {
    this.loading.set(true);
    this.error.set(null);
    try {
      // Build query URL with optional category filter
      let url = `${environment.apiUrl}/api/diseases?limit=10000`;
      if (category) {
        url += `&category=${encodeURIComponent(category)}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data?.diseases) {
        this.allDiseases.set(result.data.diseases);
        console.log(`✅ Loaded ${result.data.diseases.length} diseases${category ? ' for category: ' + category : ''}`);
        
        // Log first few diseases to verify data
        if (result.data.diseases.length > 0) {
          console.log('Sample diseases:', result.data.diseases.slice(0, 3).map((d: Disease) => ({
            id: d.id,
            name: d.name,
            categories: d.categories?.map(c => c.name),
            primary_image: d.primary_image,
            hasImage: !!d.primary_image?.url
          })));
          
          // Check for diseases without images
          const diseasesWithoutImages = result.data.diseases.filter((d: Disease) =>
            !d.primary_image || !d.primary_image.url || d.primary_image.url.trim() === ''
          );
          if (diseasesWithoutImages.length > 0) {
            console.warn(`⚠️ Found ${diseasesWithoutImages.length} diseases without valid images`);
          }
        }
      } else {
        this.error.set(result.error || 'Không tìm thấy bệnh nào.');
      }
    } catch (err: any) {
      this.error.set('Lỗi khi tải danh sách bệnh: ' + err.message);
      console.error('Error loading diseases:', err);
    } finally {
      this.loading.set(false);
    }
  }
  
  // Find category display name from slug
  async findCategoryName(categorySlug: string) {
    try {
      const response = await fetch(`${environment.apiUrl}/api/diseases/specialized-groups`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const group = result.data.find((g: any) => g.id === categorySlug);
        if (group) {
          this.selectedCategoryName.set(group.name);
          this.updateSelectedCategoryBackground(group.name);
        } else {
          this.selectedCategoryName.set(categorySlug);
          this.selectedCategoryBackground.set('');
        }
      }
    } catch (err) {
      console.error('Error finding category name:', err);
      this.selectedCategoryName.set(categorySlug);
      this.selectedCategoryBackground.set('');
    }
  }

  async loadSpecializedGroups() {
    try {
      // Load specialized groups from backend
      const response = await fetch(`${environment.apiUrl}/api/diseases/specialized-groups`);
      const result = await response.json();

      if (result.success && result.data) {
        const mappedGroups = result.data.map((group: SpecializedGroup) => {
          const customIcon = this.specializedGroupIconMap[group.name];
          return {
            ...group,
            icon: customIcon || group.icon
          };
        });
        this.specializedGroups.set(mappedGroups);
        this.showAllSpecializedGroups.set(false);
      }
    } catch (err) {
      console.error('Error loading specialized groups:', err);
      // Fallback to hardcoded data
      this.setHardcodedSpecializedGroups();
    }
  }

  private updateSelectedCategoryBackground(categoryName: string) {
    const normalized = this.normalizeSpecializedGroupName(categoryName);
    const background = this.specializedGroupBackgroundNormalized.get(normalized);
    if (background) {
      this.selectedCategoryBackground.set(background);
      return;
    }

    const slugBackground = this.specializedGroupBackgroundBySlug[categoryName];
    if (slugBackground) {
      this.selectedCategoryBackground.set(slugBackground);
      return;
    }

    const slugFallback = this.specializedGroupBackgroundBySlug[normalized.replace(/\s+/g, '-')];
    if (slugFallback) {
      this.selectedCategoryBackground.set(slugFallback);
      return;
    }

    this.selectedCategoryBackground.set('');
  }

  async loadSpecializedDiseases() {
    try {
      // Load diseases from all specialized groups (taking first N from each)
      const groups = [
        { id: 'co-xuong-khop', name: 'Cơ - Xương - Khớp', icon: '🦴' },
        { id: 'ung-thu', name: 'Ung thư', icon: '🎗️' },
        { id: 'tim-mach', name: 'Tim mạch', icon: '❤️' },
        { id: 'da-toc-mong', name: 'Da - Tóc - Móng', icon: '💅' },
        { id: 'ho-hap', name: 'Hô hấp', icon: '🫁' },
        { id: 'noi-tiet-chuyen-hoa', name: 'Nội tiết - chuyển hóa', icon: '⚖️' },
        { id: 'mau', name: 'Máu', icon: '🩸' },
        { id: 'di-ung', name: 'Dị ứng', icon: '🤧' }
      ];

      const allDiseases: DiseaseCard[] = [];
      
      // Load diseases from each group (10 diseases per group)
      for (const group of groups) {
        try {
          const response = await fetch(`${environment.apiUrl}/api/diseases/by-specialized-group/${group.id}?limit=10`);
          const result = await response.json();
          
          if (result.success && result.data) {
            // Add icon to each disease for display
            const diseasesWithIcon = result.data.map((d: DiseaseCard) => ({
              ...d,
              groupIcon: group.icon,
              groupName: group.name
            }));
            allDiseases.push(...diseasesWithIcon);
          }
        } catch (err) {
          console.error(`Error loading diseases for group ${group.id}:`, err);
        }
      }

      // Limit to 48 diseases total (6 per group)
      this.specializedDiseases.set(allDiseases.slice(0, 48));
    } catch (err) {
      console.error('Error loading specialized diseases:', err);
      // Fallback: use all diseases from loadAllDiseases
      const all = this.allDiseases();
      this.specializedDiseases.set(all.slice(0, 48));
    }
  }

  setHardcodedSpecializedGroups() {
    // Temporary placeholder icons
    const fallbackGroups: SpecializedGroup[] = [
      { id: 'ung-thu', name: 'Ung thư', icon: '🎗️', count: 151 },
      { id: 'tim-mach', name: 'Tim mạch', icon: '❤️', count: 121 },
      { id: 'noi-tiet', name: 'Nội tiết - chuyển hóa', icon: '⚖️', count: 90 },
      { id: 'co-xuong-khop', name: 'Cơ - Xương - Khớp', icon: '🦴', count: 185 },
      { id: 'da-toc-mong', name: 'Da - Tóc - Móng', icon: '💅', count: 102 },
      { id: 'mau', name: 'Máu', icon: '🩸', count: 41 },
      { id: 'ho-hap', name: 'Hô hấp', icon: '🫁', count: 91 },
      { id: 'di-ung', name: 'Dị ứng', icon: '🤧', count: 27 }
    ];

    const mapped = fallbackGroups.map(group => ({
      ...group,
      icon: this.specializedGroupIconMap[group.name] || group.icon
    }));

    this.specializedGroups.set(mapped);
    this.showAllSpecializedGroups.set(false);
  }

  // Filter diseases by body part
  diseasesByBodyPart = computed(() => {
    const bodyPart = this.selectedBodyPart();
    const all = this.allDiseases();
    
    // Simple keyword matching for body parts
    const keywords: { [key: string]: string[] } = {
      'đầu': ['đầu', 'não', 'mắt', 'mũi', 'tai', 'miệng', 'răng', 'lưỡi', 'kết mạc', 'màng não', 'glocom', 'hốc mắt', 'tiểu não', 'thùy não'],
      'cổ': ['cổ', 'họng', 'thanh quản', 'amidan', 'tuyến giáp'],
      'ngực': ['ngực', 'phổi', 'tim', 'khí quản', 'hô hấp', 'suy hô hấp', 'viêm phổi', 'hen', 'phế quản'],
      'bụng': ['bụng', 'dạ dày', 'ruột', 'gan', 'túi mật', 'lá lách', 'thận', 'bàng quang', 'đại tràng', 'tiêu hóa', 'gan mật'],
      'sinh dục': ['sinh dục', 'tử cung', 'buồng trứng', 'âm đạo', 'dương vật', 'tinh hoàn', 'khí hư', 'kinh nguyệt'],
      'tứ chi': ['tay', 'chân', 'khớp', 'xương', 'cơ', 'gân', 'chi trên', 'chi dưới', 'viêm khớp', 'loãng xương', 'gãy xương'],
      'da': ['da', 'tóc', 'móng', 'mụn', 'eczema', 'vảy nến', 'nấm da', 'dị ứng', 'mề đay', 'viêm da']
    };

    const categorySlugKeywords: { [key: string]: string[] } = {
      'đầu': ['dau', 'tai-mui-hong', 'tai', 'mui', 'hong', 'mat', 'rang-ham-mat', 'than-kinh', 'nao'],
      'cổ': ['co', 'co-vai-gay', 'tai-mui-hong', 'tuyen-giap'],
      'ngực': ['nguc', 'tim-mach', 'ho-hap', 'phoi'],
      'bụng': ['bung', 'tieu-hoa', 'gan', 'gan-mat', 'da-day', 'dai-trang', 'mat', 'ruot', 'tui-mat', 'bang-quang'],
      'sinh dục': ['sinh-duc', 'sinh-san', 'nam-khoa', 'nu-khoa', 'phu-khoa', 'tinh-hoan', 'am-dao', 'duong-vat'],
      'tứ chi': ['co-xuong-khop', 'xuong-khop', 'chan', 'tay', 'chi-tren', 'chi-duoi'],
      'da': ['da', 'da-lieu', 'di-ung', 'toc', 'mong']
    };

    const exclusionKeywords: { [key: string]: string[] } = {
      'đầu': ['dương vật', 'sinh dục', 'âm đạo', 'tinh hoàn', 'buồng trứng'],
      'bụng': ['dương vật', 'âm đạo', 'tinh hoàn'],
      'sinh dục': ['tai', 'mắt', 'miệng']
    };

    const bodyKeywords = keywords[bodyPart] || [];
    const categoryKeywords = categorySlugKeywords[bodyPart] || [];
    const exclusions = exclusionKeywords[bodyPart] || [];
    
    return all.filter(disease => {
      const name = disease.name?.toLowerCase() || '';
      const headline = disease.headline?.toLowerCase() || '';
      const summary = disease.summary?.toLowerCase() || '';
      const categoriesText = (disease.categories || [])
        .map(cat => `${cat.name?.toLowerCase() || ''} ${cat.fullPathSlug?.toLowerCase() || ''}`)
        .join(' ');
      const combined = `${name} ${headline} ${summary} ${categoriesText}`;

      if (exclusions.some(keyword => combined.includes(keyword))) {
        return false;
      }

      if (categoryKeywords.some(keyword => categoriesText.includes(keyword))) {
        return true;
      }
      
      return bodyKeywords.some(keyword => combined.includes(keyword.toLowerCase()));
    });
  });

  // Paginated diseases for display
  paginatedDiseases = computed(() => {
    // If in category mode, use allDiseases directly, otherwise filter by body part
    const all = this.viewMode() === 'category' ? this.allDiseases() : this.diseasesByBodyPart();
    const start = (this.currentPage() - 1) * this.diseasesPerPage();
    return all.slice(start, start + this.diseasesPerPage());
  });

  // Total pages for current body part or category
  totalPages = computed(() => {
    const all = this.viewMode() === 'category' ? this.allDiseases() : this.diseasesByBodyPart();
    return Math.ceil(all.length / this.diseasesPerPage());
  });

  selectBodyPart(part: string) {
    this.selectedBodyPart.set(part);
    this.currentPage.set(1); // Reset to first page
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  navigateToDisease(disease: Disease): void {
    // Use ID field directly instead of extracting from slug
    if (disease.id) {
      this.router.navigate(['/disease', disease.id]);
      console.log(`Navigate to disease ID: ${disease.id}, Name: ${disease.name}`);
    } else {
      // Fallback: extract numeric ID from slug (match last number before .html)
      const idMatch = disease.slug.match(/-(\d+)\.html$/);
      if (idMatch && idMatch[1]) {
        this.router.navigate(['/disease', idMatch[1]]);
      } else {
        // Last resort: use slug directly
        this.router.navigate(['/disease', disease.slug]);
      }
    }
  }

  selectSpecializedGroup(groupId: string) {
    console.log('Selected specialized group:', groupId);
    // Navigate to a page showing diseases in this category
    this.router.navigate(['/diseases'], { queryParams: { category: groupId } });
  }

  navigateToDiseaseDetail(disease: DiseaseCard): void {
    // Use ID field directly instead of extracting from slug
    if (disease.id) {
      this.router.navigate(['/disease', disease.id]);
      console.log(`Navigate to disease ID: ${disease.id}, Name: ${disease.name}`);
    } else {
      // Fallback: extract numeric ID from slug (match last number before .html)
      const idMatch = disease.slug.match(/-(\d+)\.html$/);
      if (idMatch && idMatch[1]) {
        this.router.navigate(['/disease', idMatch[1]]);
      } else {
        // Last resort: use slug directly
        this.router.navigate(['/disease', disease.slug]);
      }
    }
  }
  
  navigateToAllDiseases() {
    this.router.navigate(['/diseases']);
  }
}
