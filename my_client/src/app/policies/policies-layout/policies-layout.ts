import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface PolicyLink {
  path: string;
  title: string;
  active?: boolean;
}

@Component({
  selector: 'app-policies-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './policies-layout.html',
  styleUrls: ['./policies-layout.css']
})
export class PoliciesLayout implements OnInit {
  policyLinks: PolicyLink[] = [
    { path: '/policies/about', title: 'Giới thiệu' },
    { path: '/policies/booking', title: 'Chính sách đặt cọc' },
    { path: '/policies/content', title: 'Chính sách nội dung' },
    { path: '/policies/return', title: 'Chính sách đổi trả thuốc' },
    { path: '/policies/delivery', title: 'Chính sách giao hàng' },
    { path: '/policies/privacy', title: 'Bảo mật dữ liệu cá nhân' },
    { path: '/policies/payment', title: 'Chính sách thanh toán' },
    { path: '/policies/invoice-check', title: 'Kiểm tra đơn điện tử' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Update active state on route change
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateActiveLink();
      });
    
    // Initial active state
    this.updateActiveLink();
  }

  updateActiveLink() {
    const currentUrl = this.router.url;
    this.policyLinks.forEach(link => {
      link.active = currentUrl.includes(link.path);
    });
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }
}

