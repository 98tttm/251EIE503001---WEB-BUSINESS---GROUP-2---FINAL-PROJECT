import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parent_id?: string | null;
  level: number;
  children?: Category[];
  is_active: boolean;
  display_order?: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number;
  discount?: number;
  image?: string;
  images?: string[];
  category_id: string;
  brand?: string;
  country?: string; // Nước sản xuất
  unit?: string;
  stock?: number;
  is_bestseller?: boolean;
  is_flashsale?: boolean;
  rating?: number;
  reviews_count?: number;
  description?: string; // Mô tả sản phẩm
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/api`;
  
  // Signals for reactive state
  public categories = signal<Category[]>([]);
  public categoriesTree = signal<Category[]>([]);
  public loading = signal(false);
  public error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  // Fetch all categories
  async fetchCategories(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    
    console.log('🔄 Fetching categories from:', `${this.apiUrl}/categories`);
    
    try {
      const response = await fetch(`${this.apiUrl}/categories`);
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Received data:', data);
      console.log('📊 Categories count:', data.data?.length || 0);
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid data format from API');
      }
      
      this.categories.set(data.data);
      console.log('✅ Categories loaded successfully:', this.categories().length);
      
      // Build tree structure
      this.buildCategoryTree();
    } catch (err: any) {
      console.error('❌ Error fetching categories:', err);
      console.warn('⚠️ API not available, using mock data:', err.message);
      this.error.set(err.message);
      // Fallback to mock data if API fails
      this.loadMockCategories();
    } finally {
      this.loading.set(false);
    }
  }

  // Build hierarchical tree
  private buildCategoryTree(): void {
    const cats = this.categories();
    const tree: Category[] = [];
    const map = new Map<string, Category>();

    // First pass: create map
    cats.forEach(cat => {
      map.set(cat._id, { ...cat, children: [] });
    });

    // Second pass: build tree
    cats.forEach(cat => {
      const node = map.get(cat._id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        const parent = map.get(cat.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(node);
      } else if (!cat.parent_id || cat.level === 1) {
        tree.push(node);
      }
    });

    // Sort by display_order
    tree.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    tree.forEach(cat => {
      if (cat.children) {
        cat.children.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      }
    });

    this.categoriesTree.set(tree);
  }

  // Get category by ID
  getCategoryById(id: string): Category | undefined {
    return this.categories().find(cat => cat._id === id);
  }

  // Get children of a category
  getChildren(parentId: string): Category[] {
    const children = this.categories().filter(cat => cat.parent_id === parentId);
    console.log(`🔍 Getting children for parentId: ${parentId}`, children.length, 'found');
    return children;
  }

  // Get top level categories (for main navigation)
  getTopLevelCategories(): Category[] {
    return this.categoriesTree();
  }

  // Get category by slug
  getCategoryBySlug(slug: string): Category | undefined {
    console.log('🔍 Looking for category with slug:', slug);
    console.log('📊 Total categories:', this.categories().length);
    
    // Try exact match first (case-insensitive)
    let category = this.categories().find(cat => 
      cat.slug?.toLowerCase() === slug?.toLowerCase()
    );
    
    if (category) {
      console.log('✅ Found exact match:', category.name, '→', category.slug);
      return category;
    }
    
    // If not found, try matching the last part of the slug (after last /)
    category = this.categories().find(cat => {
      if (!cat.slug) return false;
      const slugParts = cat.slug.split('/');
      const lastPart = slugParts[slugParts.length - 1];
      return lastPart?.toLowerCase() === slug?.toLowerCase();
    });
    
    if (category) {
      console.log('⚠️ Found partial match (last part):', category.name, '→', category.slug);
      return category;
    }
    
    console.error('❌ Category NOT FOUND for slug:', slug);
    console.log('Available slugs:', this.categories().map(c => c.slug).filter(s => s).slice(0, 10));
    
    return undefined;
  }

  // Get breadcrumb path for a category
  getBreadcrumb(categoryId: string): Category[] {
    const breadcrumb: Category[] = [];
    let current = this.getCategoryById(categoryId);
    
    while (current) {
      breadcrumb.unshift(current);
      current = current.parent_id ? this.getCategoryById(current.parent_id) : undefined;
    }
    
    return breadcrumb;
  }

  // Get all descendant category IDs (for filtering products)
  getAllDescendantIds(categoryId: string): string[] {
    const ids: string[] = [categoryId];
    const children = this.getChildren(categoryId);
    
    children.forEach(child => {
      ids.push(...this.getAllDescendantIds(child._id));
    });
    
    return ids;
  }

  // Fetch products by category slug
  async fetchProductsByCategorySlug(slug: string): Promise<Product[]> {
    try {
      console.log('📦 Fetching products for category slug:', slug);
      
      const response = await fetch(`${this.apiUrl}/products/by-category-slug/${slug}`);
      if (!response.ok) {
        console.error('Failed to fetch products by slug:', response.statusText);
        return [];
      }
      
      const data = await response.json();
      const products = data.data || [];
      
      console.log(`✅ Fetched ${products.length} products for slug: ${slug}`);
      return products;
    } catch (err: any) {
      console.error('Error fetching products by slug:', err);
      return [];
    }
  }

  // Fetch products by category ID (legacy method, kept for compatibility)
  async fetchProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      // Get category slug from ID
      const category = this.categories().find(c => c._id === categoryId);
      if (!category || !category.slug) {
        console.warn('Category not found or has no slug:', categoryId);
        return [];
      }
      
      // Use the new slug-based method
      return this.fetchProductsByCategorySlug(category.slug);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      return [];
    }
  }

  // Mock data fallback
  private loadMockCategories(): void {
    const mockCategories: Category[] = [
      {
        _id: '1',
        name: 'Thực phẩm chức năng',
        slug: 'thuc-pham-chuc-nang',
        level: 1,
        is_active: true,
        display_order: 1,
        icon: '/assets/images/icon/danhmucnoibat.png',
        children: [
          { _id: '1-1', name: 'Vitamin & Khoáng chất', slug: 'vitamin-khoang-chat', parent_id: '1', level: 2, is_active: true, icon: '/assets/images/icon/Vitamin.png' },
          { _id: '1-2', name: 'Sinh lý - Nội tiết tố', slug: 'sinh-ly-noi-tiet-to', parent_id: '1', level: 2, is_active: true, icon: '/assets/images/icon/SinhLy.png' },
          { _id: '1-3', name: 'Cải thiện tăng cường chức năng', slug: 'cai-thien-tang-cuong-chuc-nang', parent_id: '1', level: 2, is_active: true },
          { _id: '1-4', name: 'Hỗ trợ điều trị', slug: 'ho-tro-dieu-tri', parent_id: '1', level: 2, is_active: true },
          { _id: '1-5', name: 'Hỗ trợ tiêu hóa', slug: 'ho-tro-tieu-hoa', parent_id: '1', level: 2, is_active: true, icon: '/assets/images/icon/Tieuhoa.png' },
          { _id: '1-6', name: 'Thần kinh não', slug: 'than-kinh-nao', parent_id: '1', level: 2, is_active: true, icon: '/assets/images/icon/ThanKinhNao.png' },
          { _id: '1-7', name: 'Hỗ trợ làm đẹp', slug: 'ho-tro-lam-dep', parent_id: '1', level: 2, is_active: true, icon: '/assets/images/icon/lamdep.png' },
          { _id: '1-8', name: 'Sức khỏe tim mạch', slug: 'suc-khoe-tim-mach', parent_id: '1', level: 2, is_active: true, icon: '/assets/images/icon/Tim.png' },
          { _id: '1-9', name: 'Dinh dưỡng', slug: 'dinh-duong', parent_id: '1', level: 2, is_active: true, icon: '/assets/images/icon/DinhDuong.png' }
        ]
      },
      {
        _id: '2',
        name: 'Dược mỹ phẩm',
        slug: 'duoc-my-pham',
        level: 1,
        is_active: true,
        display_order: 2,
        icon: '/assets/images/icon/thuonghieuyeuthich.png',
        children: [
          { _id: '2-1', name: 'Chăm sóc da mặt', slug: 'cham-soc-da-mat', parent_id: '2', level: 2, is_active: true, icon: '/assets/images/icon/chamsocdamat.png' },
          { _id: '2-2', name: 'Giải pháp làn da', slug: 'giai-phap-lan-da', parent_id: '2', level: 2, is_active: true, icon: '/assets/images/icon/giaiphaplanda.png' },
          { _id: '2-3', name: 'Chăm sóc cơ thể', slug: 'cham-soc-co-the', parent_id: '2', level: 2, is_active: true },
          { _id: '2-4', name: 'Chăm sóc tóc', slug: 'cham-soc-toc', parent_id: '2', level: 2, is_active: true }
        ]
      },
      {
        _id: '3',
        name: 'Thuốc',
        slug: 'thuoc',
        level: 1,
        is_active: true,
        display_order: 3,
        icon: '/assets/images/icon/tracuuthuoc.png',
        children: [
          { _id: '3-1', name: 'Thuốc không kê đơn', slug: 'thuoc-khong-ke-don', parent_id: '3', level: 2, is_active: true },
          { _id: '3-2', name: 'Thuốc kê đơn', slug: 'thuoc-ke-don', parent_id: '3', level: 2, is_active: true },
          { _id: '3-3', name: 'Thuốc tiêu hóa', slug: 'thuoc-tieu-hoa', parent_id: '3', level: 2, is_active: true },
          { _id: '3-4', name: 'Thuốc cảm cúm', slug: 'thuoc-cam-cum', parent_id: '3', level: 2, is_active: true }
        ]
      },
      {
        _id: '4',
        name: 'Chăm sóc cá nhân',
        slug: 'cham-soc-ca-nhan',
        level: 1,
        is_active: true,
        display_order: 4,
        icon: '/assets/images/icon/lamdep.png'
      },
      {
        _id: '5',
        name: 'Thiết bị y tế',
        slug: 'thiet-bi-y-te',
        level: 1,
        is_active: true,
        display_order: 5,
        icon: '/assets/images/icon/chamsocdamat.png'
      },
      {
        _id: '6',
        name: 'Góc sức khỏe',
        slug: 'goc-suc-khoe',
        level: 1,
        is_active: true,
        display_order: 6,
        icon: '/assets/images/icon/Gocsuckhoe.png'
      }
    ];

    this.categories.set(mockCategories);
    this.buildCategoryTree();
  }
}

