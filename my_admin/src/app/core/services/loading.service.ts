import { Injectable, signal } from '@angular/core';

/**
 * Service to manage global loading state
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _loading = signal(false);
  private requestCount = 0;

  readonly isLoading = this._loading.asReadonly();

  show(): void {
    this.requestCount++;
    this._loading.set(true);
  }

  hide(): void {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this._loading.set(false);
    }
  }

  reset(): void {
    this.requestCount = 0;
    this._loading.set(false);
  }
}

