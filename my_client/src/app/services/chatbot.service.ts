import { Injectable, signal } from '@angular/core';

interface Product {
  _id: string;
  name: string;
  price?: number;
  original_price?: number;
  discount?: number;
  image?: string;
  description?: string;
  brand?: string;
  slug?: string;
  usage?: string;
  ingredients?: string;
  unit?: string;
  stock?: number;
  country?: string;
  manufacturer?: string;
  dosage_form?: string;
  registration_number?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  // Signal để control chatbot open/close
  private _isOpen = signal(false);
  isOpen = this._isOpen.asReadonly();
  
  // Signal để store product context
  private _productContext = signal<Product | null>(null);
  productContext = this._productContext.asReadonly();

  openChat(product?: Product) {
    console.log('ChatbotService.openChat called with product:', product);
    if (product) {
      this._productContext.set(product);
      console.log('Product context set:', this._productContext());
    }
    this._isOpen.set(true);
    console.log('Chatbot is now open:', this._isOpen());
  }

  closeChat() {
    console.log('ChatbotService.closeChat called');
    this._isOpen.set(false);
    console.log('Chatbot is now closed:', this._isOpen());
    // Clear product context after a delay to allow rendering
    setTimeout(() => {
      this._productContext.set(null);
      console.log('Product context cleared');
    }, 300);
  }

  clearProductContext() {
    this._productContext.set(null);
  }
}

