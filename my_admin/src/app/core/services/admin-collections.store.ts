import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AdminApiService, AdminCollectionMeta } from './admin-api.service';

const FALLBACK_COLLECTIONS: AdminCollectionMeta[] = [
  {
    key: 'products',
    label: 'Sản phẩm',
    description: 'Danh mục sản phẩm theo phân loại',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true
  },
  {
    key: 'categories',
    label: 'Phân loại sản phẩm',
    description: 'Cấu trúc cây danh mục & nhóm ngành hàng',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true
  },
  {
    key: 'blogs',
    label: 'Blog sức khỏe',
    description: 'Bài viết tư vấn, tin tức & kiến thức sức khỏe',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true
  },
  {
    key: 'benh',
    label: 'Kho bệnh & triệu chứng',
    description: 'Thông tin bệnh lý, biểu hiện và khuyến nghị',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true
  },
  {
    key: 'tree',
    label: 'Hero banner & Theme',
    description: 'Quảng bá chiến dịch, banner và điều hướng chủ đề',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true
  },
  {
    key: 'promotions',
    label: 'Mã khuyến mãi',
    description: 'Chiến dịch sale, coupon và voucher',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true
  },
  {
    key: 'users',
    label: 'Khách hàng & tài khoản',
    description: 'Thông tin người dùng, quyền và trạng thái',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false
  },
  {
    key: 'orders',
    label: 'Đơn hàng',
    description: 'Thông tin đặt hàng và trạng thái vận hành',
    allowCreate: false,
    allowUpdate: false,
    allowDelete: false
  },
  {
    key: 'pharmacist_chats',
    label: 'Tư vấn Dược Sĩ',
    description: 'Quản lý cuộc trò chuyện tư vấn với dược sĩ',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false
  },
  {
    key: 'tuvanthuoc',
    label: 'Tư vấn thuốc',
    description: 'Tất cả các yêu cầu tư vấn của khách hàng',
    allowCreate: false,
    allowUpdate: true,
    allowDelete: false
  },
  {
    key: 'banners',
    label: 'Banner & Theme',
    description: 'Quản lý banner và theme cho trang client',
    allowCreate: true,
    allowUpdate: true,
    allowDelete: true
  }
];

@Injectable({ providedIn: 'root' })
export class AdminCollectionsStore {
  private readonly api = inject(AdminApiService);

  private readonly _collections = signal<AdminCollectionMeta[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly collections = computed(() => this._collections());
  readonly loading = computed(() => this._loading());
  readonly loaded = computed(() => this._loaded());
  readonly error = computed(() => this._error());

  async ensureLoaded(force = false): Promise<void> {
    if (this._loaded() && !force) {
      return;
    }

    await this.load(force);
  }

  async load(force = false): Promise<void> {
    if (this._loading()) {
      return;
    }

    if (this._loaded() && !force) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(this.api.getCollections());
      this._collections.set(this.mergeWithFallback(data));
      this._loaded.set(true);
    } catch (error: any) {
      console.error('[AdminCollectionsStore] load error', error);
      this._error.set(error?.message || 'Không thể tải danh sách tài nguyên');
      if (!this._loaded()) {
        this._collections.set([...FALLBACK_COLLECTIONS]);
        this._loaded.set(true);
      }
    } finally {
      this._loading.set(false);
    }
  }

  getByKey(key: string | null | undefined): AdminCollectionMeta | undefined {
    if (!key) {
      return undefined;
    }
    return this._collections().find(item => item.key === key);
  }

  private mergeWithFallback(apiCollections: AdminCollectionMeta[]): AdminCollectionMeta[] {
    const map = new Map<string, AdminCollectionMeta>();
    FALLBACK_COLLECTIONS.forEach(item => map.set(item.key, { ...item }));

    apiCollections.forEach(item => {
      const existing = map.get(item.key);
      if (existing) {
        map.set(item.key, {
          ...existing,
          ...item,
          description: item.description || existing.description
        });
      } else {
        map.set(item.key, item);
      }
    });

    return Array.from(map.values()).filter(Boolean);
  }
}


