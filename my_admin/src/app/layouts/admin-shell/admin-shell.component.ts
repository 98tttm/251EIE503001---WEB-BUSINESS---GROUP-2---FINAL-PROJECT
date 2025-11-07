import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AdminAuthService } from '../../core/services/admin-auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { AdminCollectionMeta } from '../../core/services/admin-api.service';
import { AdminCollectionsStore } from '../../core/services/admin-collections.store';
import { NotificationCenterComponent } from '../../shared/components/notification-center/notification-center.component';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';
import { ScrollToTopComponent } from '../../shared/components/scroll-to-top/scroll-to-top.component';

interface AdminMenuItem {
  key?: string;
  label: string;
  description?: string;
  icon: string;
  route: string;
}

interface AdminMenuSection {
  title: string;
  items: AdminMenuItem[];
}

const RESOURCE_DEFINITIONS: Array<{ key: string; icon: string; route: string }> = [
  { key: 'products', icon: 'inventory_2', route: '/collections/products' },
  { key: 'categories', icon: 'category', route: '/collections/categories' },
  { key: 'blogs', icon: 'article', route: '/collections/blogs' },
  { key: 'benh', icon: 'healing', route: '/collections/benh' },
  { key: 'promotions', icon: 'sell', route: '/collections/promotions' },
  { key: 'users', icon: 'group', route: '/collections/users' },
  { key: 'orders', icon: 'receipt_long', route: '/collections/orders' },
  { key: 'pharmacist_chats', icon: 'chat', route: '/collections/pharmacist_chats' },
  { key: 'tuvanthuoc', icon: 'medication', route: '/collections/tuvanthuoc' },
  { key: 'banners', icon: 'image', route: '/collections/banners' }
];

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationCenterComponent, NotificationBellComponent, ScrollToTopComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.css'
})
export class AdminShellComponent {
  private readonly auth = inject(AdminAuthService);
  private readonly notifier = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly collectionsStore = inject(AdminCollectionsStore);

  readonly user = this.auth.currentUser;
  readonly roles = this.auth.roles;

  protected readonly collectionsLoading = computed(() => this.collectionsStore.loading());
  protected readonly sidebarCollapsed = signal(false);
  protected readonly menuFilter = signal('');

  protected readonly menuSections = computed<AdminMenuSection[]>(() => {
    const filter = this.menuFilter().trim().toLowerCase();
    const collections = this.collectionsStore.collections();
    const map = new Map<string, AdminCollectionMeta>();
    collections.forEach(col => map.set(col.key, col));

    const matchFilter = (item: AdminMenuItem) => {
      if (!filter) return true;
      const haystack = `${item.label} ${item.description ?? ''}`.toLowerCase();
      return haystack.includes(filter);
    };

    const resourceItems = RESOURCE_DEFINITIONS.reduce<AdminMenuItem[]>((acc, def) => {
      const meta = map.get(def.key);
      if (!meta) {
        return acc;
      }
      const item: AdminMenuItem = {
        key: meta.key,
        label: meta.label || meta.key,
        description: meta.description,
        icon: def.icon,
        route: def.route
      };
      if (matchFilter(item)) {
        acc.push(item);
      }
      return acc;
    }, []);

    const overviewBase: AdminMenuItem = {
      label: 'Dashboard',
      icon: 'grid_view',
      route: '/dashboard'
    };
    const overviewItems = matchFilter(overviewBase) ? [overviewBase] : [];

    return [
      { title: 'Tổng quan', items: overviewItems },
      { title: 'Tài nguyên', items: resourceItems }
    ];
  });

  protected readonly hasMenuItems = computed(() =>
    this.menuSections().some(section => section.items.length > 0)
  );

  constructor() {
    void this.loadCollections();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(value => !value);
  }

  async refreshCollections(): Promise<void> {
    await this.loadCollections({ showToastOnSuccess: true });
  }

  async loadCollections(options: { showToastOnSuccess?: boolean } = {}): Promise<void> {
    if (options.showToastOnSuccess) {
      await this.collectionsStore.load(true);
      if (!this.collectionsStore.error()) {
        this.notifier.showSuccess('Đã tải lại danh sách tài nguyên');
      }
    } else {
      await this.collectionsStore.ensureLoaded();
    }
  }

  logout(): void {
    this.auth.logout();
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  protected trackBySection = (_: number, section: AdminMenuSection) => section.title;
  protected trackByItem = (_: number, item: AdminMenuItem) => item.route;
}


