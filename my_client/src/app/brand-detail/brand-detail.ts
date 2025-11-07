import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';

interface Product {
  _id: string;
  name: string;
  price: number;
  discount?: number;
  image?: string;
  brand?: string;
  unit?: string;
}

interface BrandInfo {
  name: string;
  slug: string;
  logo?: string;
  description: string;
}

const BRAND_DATA: Record<string, BrandInfo> = {
  'jpanwell': {
    name: 'Jpanwell',
    slug: 'jpanwell',
    logo: '/assets/images/thuonghieu/Jpanwell.webp',
    description: 'Jpanwell là thương hiệu đến từ Nhật Bản chuyên cung cấp các sản phẩm chăm sóc sức khỏe và làm đẹp. Với danh mục sản phẩm đa dạng, Jpanwell hướng đến việc hỗ trợ người tiêu dùng nâng cao sức khỏe một cách chủ động. Thương hiệu luôn chú trọng duy trì chất lượng, mang đến sự an tâm và tin tưởng cho người sử dụng.'
  },
  'ocavill': {
    name: 'OCAVILL',
    slug: 'ocavill',
    logo: 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/smalls/OCAVILL_1_0fa129f445.png',
    description: 'Ocavill là thương hiệu chuyên phát triển các sản phẩm chăm sóc sức khỏe, thuộc lĩnh vực thực phẩm bảo vệ sức khỏe. Thương hiệu tập trung vào các dòng sản phẩm hỗ trợ chức năng cơ thể như mắt, não, gan, xương khớp, với dạng bào chế tiện lợi phù hợp sử dụng hằng ngày. Ocavill không ngừng cải tiến thành phần và mở rộng danh mục nhằm đáp ứng nhu cầu chăm sóc sức khỏe toàn diện cho người tiêu dùng.'
  },
  'brauer': {
    name: 'Brauer',
    slug: 'brauer',
    logo: '/assets/images/thuonghieu/brauer.webp',
    description: 'Brauer là thương hiệu dược phẩm tự nhiên đến từ Úc, chuyên cung cấp các sản phẩm chăm sóc sức khỏe cho gia đình, với cam kết sử dụng nguyên liệu tự nhiên và đạt tiêu chuẩn chất lượng cao. Brauer nổi bật với các sản phẩm hỗ trợ sức khỏe cho trẻ em và gia đình, kết hợp giữa y học tự nhiên và khoa học hiện đại, mang lại giải pháp chăm sóc sức khỏe an toàn và hiệu quả. Brauer luôn nỗ lực cải tiến và phát triển các sản phẩm phù hợp với nhu cầu sức khỏe của người tiêu dùng, đảm bảo mang lại sự an tâm và chất lượng cho mỗi sản phẩm.'
  },
  'vitamins-for-life': {
    name: 'Vitamins For Life',
    slug: 'vitamins-for-life',
    logo: '/assets/images/thuonghieu/Vitamins_For_Life.webp',
    description: 'Vitamins For Life là thương hiệu chuyên sản xuất các sản phẩm bổ sung dinh dưỡng, thực phẩm bảo vệ sức khỏe tại Mỹ. Thương hiệu tập trung vào việc phát triển công thức sản phẩm đa dạng với quy trình sản xuất được kiểm soát nghiêm ngặt theo các tiêu chuẩn quản lý chất lượng hiện hành. Vitamins For Life không ngừng cải tiến nhằm đáp ứng nhu cầu chăm sóc sức khỏe của người tiêu dùng ở nhiều quốc gia.'
  },
  'vitabiotics': {
    name: 'Vitabiotics',
    slug: 'vitabiotics',
    logo: 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/smalls/Vitabiotics_1_8d1424372d.png',
    description: 'Vitabiotics là công ty vitamin số 1 của Vương quốc Anh, có trụ sở chính tại London và hoạt động tại 110 quốc gia trên toàn cầu. Được thành lập với mong muốn cung cấp các giải pháp chăm sóc sức khỏe tự nhiên, an toàn, Vitabiotics đã không ngừng phát triển và cải tiến để đưa ra những sản phẩm chất lượng cùng công thức dinh dưỡng được cải tiến và cập nhật dựa theo các bài nghiên cứu khoa học, hỗ trợ giúp bạn khỏe mạnh và tràn đầy năng lượng. Vitabiotics cũng cung cấp đầy đủ các dòng sản phẩm phù hợp từng lứa tuổi, giới tính hay nhu cầu cơ thể.'
  },
  'datino': {
    name: 'Datino',
    slug: 'datino',
    logo: 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/Datino_2_5bb24a0318.png',
    description: 'Datino là thương hiệu chuyên cung cấp các sản phẩm bột dinh dưỡng từ rau củ và thảo mộc thiên nhiên. Thương hiệu nổi bật với quy trình sản xuất hiện đại, chú trọng đến nguồn nguyên liệu sạch và công nghệ sấy lạnh nhằm giữ trọn hương vị tự nhiên. Datino không ngừng phát triển các dòng sản phẩm tiện lợi, góp phần hỗ trợ chăm sóc sức khỏe và cân bằng dinh dưỡng trong cuộc sống hàng ngày.'
  },
  'okamoto': {
    name: 'OKAMOTO',
    slug: 'okamoto',
    logo: 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/smalls/OKAMOTO_1_0c3fb5d4a4.png',
    description: 'Okamoto là thương hiệu đến từ Nhật Bản chuyên sản xuất các sản phẩm chăm sóc sức khỏe thuộc lĩnh vực cao su y tế. Thương hiệu này được biết đến với công nghệ sản xuất hiện đại và tiêu chuẩn kiểm soát chất lượng nghiêm ngặt, đáp ứng nhu cầu sử dụng đa dạng. Okamoto không ngừng cải tiến sản phẩm nhằm mang đến trải nghiệm sử dụng tối ưu và phù hợp với nhiều đối tượng người dùng.'
  },
  'pearlie-white': {
    name: 'PEARLIE WHITE',
    slug: 'pearlie-white',
    logo: 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/smalls/202005_PW_Pearlie_White_Logo_Horizontal_1200x1200_5b570c5f2f.webp',
    description: 'Pearlie White là thương hiệu chăm sóc răng miệng hàng đầu Singapore – tự hào mang đến hơn 60 sản phẩm tiên tiến với chất lượng vượt trội, đáp ứng nhu cầu đa dạng của người tiêu dùng trên toàn cầu. Pearlie White cam kết về chất lượng sản phẩm qua các quy trình sản xuất nghiêm ngặt đạt chuẩn ISO 22716 và GMP. Với phương châm "Good Oral Health Promotes Better Overall Health," Pearlie White không chỉ tập trung vào răng miệng mà còn đề cao sức khỏe tổng thể. Các sản phẩm của Pearlie White, từ kem đánh răng đến nước súc miệng, đều được nghiên cứu kỹ lưỡng, đảm bảo hiệu quả và an toàn. Đặc biệt, vào năm 2021, thương hiệu được trao tặng danh hiệu "Made With Passion" và đã đạt chứng nhận Halal từ năm 2022.'
  },
  'kamicare': {
    name: 'KamiCARE',
    slug: 'kamicare',
    logo: 'https://cdn.nhathuoclongchau.com.vn/unsafe/256x0/filters:quality(90)/https://cms-prod.s3-sgn09.fptcloud.com/smalls/Kami_Care_8942b73aeb.png',
    description: 'KamiCARE là thương hiệu thuộc Tập đoàn Heiwa Medic Group - doanh nghiệp đầu tiên đặt nền móng cho ngành sản xuất tăm bông của Nhật Bản từ năm 1965. Sản phẩm của công ty được sản xuất trên dây chuyền hiện đại theo tiêu chuẩn nghiêm ngặt của Hiệp hội Công nghiệp Sản phẩm Vệ sinh Nhật Bản (JHPIA), đồng thời đáp ứng các tiêu chí thẩm mỹ tỉ mỉ như đồ mỹ nghệ. Hiện nay các nhà máy của công ty tại Nhật Bản, Trung Quốc, Việt Nam đã xuất khẩu đi nhiều nước trên thế giới theo đơn hàng từ các thương hiệu mỹ phẩm và chăm sóc sức khỏe hàng đầu. Công ty TNHH Heiwa Medic Việt Nam là doanh nghiệp chế xuất 100% vốn Nhật Bản thành lập từ năm 2007, trực thuộc Heiwa Medic Group. Quy trình sản xuất của công ty đã được chứng nhận đạt tiêu chuẩn ISO 9001:2015 và chứng nhận hợp quy Việt Nam theo tiêu chuẩn QC 01:2017/BCT. Toàn bộ sản phẩm tăm bông sản xuất tại nhà máy Việt Nam dù xuất bán vào nội địa hay xuất khẩu về thị trường Nhật Bản cũng có cùng chất lượng cao như nhau.'
  },
  'laroche-posay': {
    name: 'Laroche posay',
    slug: 'laroche-posay',
    logo: 'https://cdn.nhathuoclongchau.com.vn/unsafe/340x340/https://cms-prod.s3-sgn09.fptcloud.com/Laroche_posay_dbf6755b46.png',
    description: 'La Roche-Posay là thương hiệu dược mỹ phẩm đến từ Pháp, chuyên phát triển các sản phẩm chăm sóc da. Thương hiệu này nổi bật với các dòng sản phẩm dịu nhẹ, phù hợp với làn da nhạy cảm và được ứng dụng rộng rãi trong chăm sóc da hàng ngày. La Roche-Posay không ngừng nghiên cứu và cải tiến công thức nhằm mang đến giải pháp chăm sóc da an toàn và hiệu quả cho người tiêu dùng.'
  }
};

@Component({
  selector: 'app-brand-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './brand-detail.html',
  styleUrl: './brand-detail.css',
})
export class BrandDetail implements OnInit {
  brandInfo = signal<BrandInfo | null>(null);
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  loading = signal(false);
  selectedPriceRange = signal<string>('all');
  sortBy = signal<string>('bestseller');
  viewMode = signal<'grid' | 'list'>('grid');

  private readonly apiBase = `${environment.apiUrl}/api`;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(async params => {
      const brandSlug = params['slug'];
      if (brandSlug) {
        await this.loadBrandData(brandSlug);
      }
    });
  }

  async loadBrandData(brandSlug: string) {
    this.loading.set(true);
    
    // Get brand info
    const brandKey = brandSlug.toLowerCase().replace(/\s+/g, '-');
    const brand = BRAND_DATA[brandKey];
    
    if (!brand) {
      this.router.navigate(['/']);
      return;
    }

    this.brandInfo.set(brand);

    try {
      // Load products for this brand - use brandSlug for API call
      console.log('Loading products for brand:', brandSlug);
      const response = await fetch(`${this.apiBase}/products/by-brand/${brandSlug}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success && result.data) {
        console.log(`Loaded ${result.data.length} products`);
        this.products.set(result.data || []);
        this.applyFilters();
      } else {
        console.warn('No products found or invalid response:', result);
        this.products.set([]);
        this.filteredProducts.set([]);
      }
    } catch (error) {
      console.error('Error loading brand products:', error);
      this.products.set([]);
      this.filteredProducts.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    let filtered = [...this.products()];
    
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
    
    // Apply sorting
    filtered = this.sortProducts(filtered);
    
    this.filteredProducts.set(filtered);
  }

  sortProducts(products: Product[]): Product[] {
    const sort = this.sortBy();
    const sorted = [...products];
    
    switch (sort) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-desc':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'bestseller':
      default:
        return sorted;
    }
  }

  onPriceRangeChange() {
    this.applyFilters();
  }

  onSortChange() {
    this.applyFilters();
  }

  navigateToProduct(productId: string) {
    this.router.navigate(['/product', productId]);
  }

  calculateDiscountPercent(price: number, discount?: number): number {
    if (!discount || discount === 0) return 0;
    const originalPrice = price + discount;
    return Math.round((discount / originalPrice) * 100);
  }

  formatPrice(price: number): string {
    return price.toLocaleString('vi-VN');
  }

  scrollToProducts() {
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
      productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

