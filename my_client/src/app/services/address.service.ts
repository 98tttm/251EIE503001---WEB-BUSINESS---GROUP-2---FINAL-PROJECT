import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface Province {
  _id: string;
  code: string;
  name: string;
}

interface District {
  _id: string;
  code: string;
  name: string;
  provinceId: string;
}

interface Ward {
  _id: string;
  code: string;
  name: string;
  districtId: string;
}

export interface AddressData {
  _id?: string;
  name: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
  deliveryTime: 'before' | 'after';
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Lấy danh sách tỉnh/thành
  getProvinces(): Observable<ApiResponse<Province[]>> {
    return this.http.get<ApiResponse<Province[]>>(`${this.apiUrl}/provinces`);
  }

  // Lấy danh sách quận/huyện theo tỉnh
  getDistricts(provinceId: string): Observable<ApiResponse<District[]>> {
    return this.http.get<ApiResponse<District[]>>(`${this.apiUrl}/districts/${provinceId}`);
  }

  // Lấy danh sách phường/xã theo quận
  getWards(districtId: string): Observable<ApiResponse<Ward[]>> {
    return this.http.get<ApiResponse<Ward[]>>(`${this.apiUrl}/wards/${districtId}`);
  }

  // Lấy danh sách địa chỉ của user
  getAddresses(): Observable<ApiResponse<AddressData[]>> {
    return this.http.get<ApiResponse<AddressData[]>>(
      `${this.apiUrl}/addresses`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Thêm địa chỉ mới
  addAddress(address: AddressData): Observable<ApiResponse<AddressData>> {
    return this.http.post<ApiResponse<AddressData>>(
      `${this.apiUrl}/addresses`,
      address,
      { headers: this.getAuthHeaders() }
    );
  }

  // Cập nhật địa chỉ
  updateAddress(id: string, address: AddressData): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/addresses/${id}`,
      address,
      { headers: this.getAuthHeaders() }
    );
  }

  // Xóa địa chỉ
  deleteAddress(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/addresses/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Đặt địa chỉ mặc định
  setDefaultAddress(id: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(
      `${this.apiUrl}/addresses/${id}/default`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }
}

