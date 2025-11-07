import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ImageSearchResult {
  id: string;
  name: string;
  slug?: string;
  brand: string | null;
  price: number | null;
  original_price: number | null;
  unit: string | null;
  country: string | null;
  image: string | null;
  matchedKeywords: string[];
  score: number;
  shortDescription: string | null;
}

export interface ImageSearchDetail {
  fileName: string;
  size: number;
  mimeType: string;
  durationMs: number;
  ocrText: string;
  keywords: string[];
  error?: string | null;
}

export interface ImageSearchResponse {
  success: boolean;
  keywords: string[];
  rawKeywords?: string[];
  results: ImageSearchResult[];
  details: ImageSearchDetail[];
  processingMs?: number;
  message?: string;
  total?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImageSearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api`;

  searchByImages(files: File[]): Observable<ImageSearchResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    return this.http
      .post<ImageSearchResponse>(`${this.apiUrl}/search/image`, formData)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('[ImageSearchService] search error', error);
          return throwError(() => error);
        })
      );
  }
}

