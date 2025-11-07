import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { AdminApiService, AdminSummaryPayload } from '../../core/services/admin-api.service';
import { NotificationService } from '../../core/services/notification.service';

Chart.register(...registerables);

type RevenuePoint = { day: string; total: number; orders: number };
interface OrderSummary {
  _id?: string;
  orderNumber?: string;
  customerInfo?: { name?: string };
  shippingAddress?: { name?: string };
  status?: string;
  pricing?: { total?: number };
  createdAt?: string | Date;
}

interface UserSummary {
  _id?: string;
  mail?: string;
  phone?: string;
  profile?: { name?: string };
  status?: string;
  createdAt?: string | Date;
}

interface CategorySummary {
  _id?: string;
  category?: { name?: string };
  products?: number;
  totalRevenue?: number;
}

interface TotalCard {
  key: string;
  label: string;
  value: number;
  icon: string;
  accent: string;
  link?: string;
}

const SUMMARY_PLACEHOLDER: AdminSummaryPayload = {
  totals: {
    products: 0,
    categories: 0,
    orders: 0,
    users: 0,
    blogs: 0
  },
  ordersByStatus: [],
  revenueLast30Days: [],
  recentOrders: [],
  recentUsers: [],
  topCategories: []
};

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, DecimalPipe, CurrencyPipe],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css'
})
export class DashboardPage implements AfterViewInit {
  private readonly api = inject(AdminApiService);
  private readonly notifier = inject(NotificationService);

  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly summary = signal<AdminSummaryPayload | null>(null);
  readonly error = signal<string | null>(null);
  readonly viewMode = signal<'simple' | 'visual'>('simple');
  
  readonly currentTime = computed(() => {
    const now = new Date();
    return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  });
  
  readonly orderStats = computed(() => {
    const statuses = this.ordersByStatus();
    return {
      pending: statuses.find(s => (s._id || '').toLowerCase().includes('chờ'))?.count || 0,
      total: statuses.reduce((sum, s) => sum + (s.count || 0), 0)
    };
  });

  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChart') ordersChartRef!: ElementRef<HTMLCanvasElement>;

  private revenueChart: Chart | null = null;
  private statusChart: Chart | null = null;
  private categoryChart: Chart | null = null;
  private ordersChart: Chart | null = null;

  readonly totalsCards = computed((): TotalCard[] => {
    const data = this.summary();
    if (!data) {
      return [];
    }

    const totals = data.totals || {};
    // Chỉ hiển thị các card chính, bỏ qua comments
    const config: Array<{ key: keyof typeof totals; label: string; icon: string; accent: string; link?: string }> = [
      { key: 'products', label: 'Sản phẩm', icon: 'inventory', accent: 'accent-blue', link: '/collections/products' },
      { key: 'categories', label: 'Danh mục', icon: 'category', accent: 'accent-indigo', link: '/collections/categories' },
      { key: 'orders', label: 'Đơn hàng', icon: 'shopping_bag', accent: 'accent-rose', link: '/collections/orders' },
      { key: 'users', label: 'Người dùng', icon: 'group', accent: 'accent-emerald', link: '/collections/users' },
      { key: 'blogs', label: 'Bài viết', icon: 'article', accent: 'accent-purple', link: '/collections/blogs' }
      // comments đã bị loại bỏ
    ];

    return config.map(item => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
      accent: item.accent,
      value: totals[item.key] ?? 0,
      link: item.link
    }));
  });

  readonly ordersByStatus = computed(() => {
    const statuses = this.summary()?.ordersByStatus ?? [];
    // Map status từ tiếng Anh sang tiếng Việt
    const statusMap: { [key: string]: string } = {
      'pending': 'Chờ xử lý',
      'confirmed': 'Đã xác nhận',
      'processing': 'Đang xử lý',
      'shipping': 'Đang giao',
      'delivered': 'Đã giao',
      'cancelled': 'Đã hủy'
    };
    
    return statuses.map(item => ({
      ...item,
      _id: statusMap[item._id as string] || item._id || 'Không xác định'
    }));
  });

  readonly revenueSeries = computed<RevenuePoint[]>(() => {
    const data = this.summary()?.revenueLast30Days ?? [];
    return data.map(entry => ({
      day: entry._id?.day ?? '',
      total: entry.total ?? 0,
      orders: entry.orders ?? 0
    }));
  });

  readonly recentOrders = computed<OrderSummary[]>(() => {
    const source = this.summary()?.recentOrders;
    return Array.isArray(source) ? (source as OrderSummary[]) : [];
  });

  readonly recentUsers = computed<UserSummary[]>(() => {
    const source = this.summary()?.recentUsers;
    return Array.isArray(source) ? (source as UserSummary[]) : [];
  });

  readonly topCategories = computed<CategorySummary[]>(() => {
    const source = this.summary()?.topCategories;
    return Array.isArray(source) ? (source as CategorySummary[]) : [];
  });

  readonly maxRevenue = computed(() => {
    const series = this.revenueSeries();
    return series.reduce((max, point) => (point.total > max ? point.total : max), 0) || 1;
  });

  // Calculate bar height percentage, ensuring minimum visibility for very small values
  getBarHeight(value: number): number {
    const max = this.maxRevenue();
    if (max === 0) return 0;
    if (value === 0) return 0.03; // 3% minimum for zero values to show they exist
    const ratio = value / max;
    // For very small ratios (< 5%), ensure at least 3% visibility
    // But keep proportional scaling for larger values
    return ratio < 0.05 && ratio > 0 ? 0.03 : ratio;
  }

  readonly averageRevenue = computed(() => {
    const series = this.revenueSeries();
    if (series.length === 0) return 0;
    const total = series.reduce((sum, point) => sum + point.total, 0);
    return total / series.length;
  });

  readonly totalOrders = computed(() => {
    const statuses = this.ordersByStatus();
    return statuses.reduce((sum, status) => sum + (status.count || 0), 0);
  });

  readonly topCategory = computed(() => {
    const categories = this.topCategories();
    return categories.length > 0 ? categories[0] : null;
  });

  readonly revenueGrowth = computed(() => {
    const series = this.revenueSeries();
    if (series.length < 2) return 0;
    const first = series[0].total || 0;
    const last = series[series.length - 1].total || 0;
    if (first === 0) return 0;
    return ((last - first) / first) * 100;
  });

  constructor() {
    void this.loadSummary();
    
    // Auto-update charts when data changes
    effect(() => {
      if (this.viewMode() === 'visual' && this.summary()) {
        setTimeout(() => this.initCharts(), 100);
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.viewMode() === 'visual') {
      this.initCharts();
    }
  }

  toggleViewMode(): void {
    const newMode = this.viewMode() === 'simple' ? 'visual' : 'simple';
    this.viewMode.set(newMode);
    
    if (newMode === 'visual') {
      setTimeout(() => this.initCharts(), 100);
    } else {
      this.destroyCharts();
    }
  }

  async refresh(): Promise<void> {
    await this.loadSummary({ silent: false });
  }

  navigateTo(link?: string): void {
    if (!link) return;
    void this.router.navigateByUrl(link);
  }

  handleCardKeydown(event: KeyboardEvent, link?: string): void {
    if (!link) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.navigateTo(link);
    }
  }

  private async loadSummary(options: { silent?: boolean } = {}): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await firstValueFrom(this.api.getSummary());
      this.summary.set(data);

      if (!options.silent) {
        this.notifier.showSuccess('Đã cập nhật dữ liệu tổng quan');
      }
    } catch (error: any) {
      console.error('[Dashboard] loadSummary error', error);
      this.error.set(error?.message || 'Không thể tải dữ liệu tổng quan');
      if (!this.summary()) {
        this.summary.set(SUMMARY_PLACEHOLDER);
      }
      this.notifier.showError(this.error()!);
    } finally {
      this.loading.set(false);
    }
  }

  private initCharts(): void {
    this.destroyCharts();
    
    if (this.viewMode() !== 'visual' || !this.summary()) return;

    this.createRevenueChart();
    this.createStatusChart();
    this.createCategoryChart();
    this.createOrdersChart();
  }

  private destroyCharts(): void {
    this.revenueChart?.destroy();
    this.statusChart?.destroy();
    this.categoryChart?.destroy();
    this.ordersChart?.destroy();
    
    this.revenueChart = null;
    this.statusChart = null;
    this.categoryChart = null;
    this.ordersChart = null;
  }

  private createRevenueChart(): void {
    if (!this.revenueChartRef?.nativeElement) return;

    const data = this.revenueSeries();
    const labels = data.map(d => {
      const date = new Date(d.day);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const revenues = data.map(d => d.total);

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: revenues,
          borderColor: 'rgb(14, 165, 233)',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return `Doanh thu: ${(value ?? 0).toLocaleString('vi-VN')} đ`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return (value as number).toLocaleString('vi-VN');
              }
            }
          }
        }
      }
    };

    this.revenueChart = new Chart(this.revenueChartRef.nativeElement, config);
  }

  private createStatusChart(): void {
    if (!this.statusChartRef?.nativeElement) return;

    const data = this.ordersByStatus();
    const labels = data.map(d => d._id || 'Không xác định');
    const values = data.map(d => d.count || 0);

    const colors = [
      'rgb(14, 165, 233)',
      'rgb(168, 85, 247)',
      'rgb(244, 114, 182)',
      'rgb(34, 197, 94)',
      'rgb(245, 158, 11)',
      'rgb(239, 68, 68)'
    ];

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          label: 'Đơn hàng',
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    };

    this.statusChart = new Chart(this.statusChartRef.nativeElement, config);
  }

  private createCategoryChart(): void {
    if (!this.categoryChartRef?.nativeElement) return;

    const data = this.topCategories().slice(0, 8);
    const labels = data.map(d => d.category?.name || d._id || 'N/A');
    const revenues = data.map(d => d.totalRevenue || 0);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: revenues,
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.x;
                return `Doanh thu: ${(value ?? 0).toLocaleString('vi-VN')} đ`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return (value as number).toLocaleString('vi-VN');
              }
            }
          }
        }
      }
    };

    this.categoryChart = new Chart(this.categoryChartRef.nativeElement, config);
  }

  private createOrdersChart(): void {
    if (!this.ordersChartRef?.nativeElement) return;

    const data = this.revenueSeries();
    const labels = data.map(d => {
      const date = new Date(d.day);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const orders = data.map(d => d.orders);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Số đơn hàng',
          data: orders,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    };

    this.ordersChart = new Chart(this.ordersChartRef.nativeElement, config);
  }
}


