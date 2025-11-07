import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-invoice-check',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-check.html',
  styleUrls: ['./invoice-check.css']
})
export class InvoiceCheck {
  orderNumber: string = '';
  isSearching: boolean = false;
  errorMessage: string = '';
  
  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  searchOrder() {
    if (!this.orderNumber.trim()) {
      this.errorMessage = 'Vui lòng nhập mã đơn hàng';
      return;
    }

    this.isSearching = true;
    this.errorMessage = '';

    // API endpoint to check if order exists
    const apiUrl = 'http://localhost:3000/api/orders/check';
    
    this.http.post<any>(apiUrl, { orderNumber: this.orderNumber })
      .subscribe({
        next: (response) => {
          this.isSearching = false;
          if (response.exists && response.orderId) {
            // Redirect to order detail page
            this.router.navigate(['/order', response.orderId]);
          } else {
            this.errorMessage = 'Không tìm thấy đơn hàng với mã này';
          }
        },
        error: (error) => {
          this.isSearching = false;
          this.errorMessage = 'Không tìm thấy đơn hàng với mã này';
        }
      });
  }

  clearSearch() {
    this.orderNumber = '';
    this.errorMessage = '';
  }
}

