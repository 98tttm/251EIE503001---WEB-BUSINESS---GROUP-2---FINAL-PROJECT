import { Component, signal, AfterViewChecked, ViewChild, ElementRef, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatbotService } from '../services/chatbot.service';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  products?: Product[];
  productContext?: Product; // Product card displayed in chat
}

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

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class Chatbot implements AfterViewChecked, OnInit {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef<HTMLDivElement>;
  
  isOpen = signal(false);
  messages = signal<ChatMessage[]>([]);
  userMessage = signal('');
  isTyping = signal(false);
  productContext = signal<Product | null>(null);
  private shouldScroll = false;

  constructor(private chatbotService: ChatbotService) {
    // Initialize with welcome message
    this.addBotMessage('Xin chào, tôi là trợ lý y tế của bạn, rất hân hạnh được làm quen!');
    this.addBotMessage('Hôm nay của bạn thế nào? Nói với MeCa nhé!');
    
    // Initialize state from service
    this.isOpen.set(this.chatbotService.isOpen());
    this.productContext.set(this.chatbotService.productContext());
    
    // Watch for chatbot service state changes
    effect(() => {
      const isOpen = this.chatbotService.isOpen();
      console.log('Effect: isOpen changed to', isOpen, 'current:', this.isOpen());
      if (this.isOpen() !== isOpen) {
        this.isOpen.set(isOpen);
        
        if (isOpen) {
          // Scroll to bottom when opening
          setTimeout(() => {
            this.scrollToBottom();
          }, 300);
        }
      }
    });

    // Watch for product context
    effect(() => {
      const product = this.chatbotService.productContext();
      const isOpen = this.chatbotService.isOpen();
      console.log('Effect: product context changed to', product, 'isOpen:', isOpen);
      
      if (this.productContext() !== product) {
        this.productContext.set(product);
        
        if (product && isOpen) {
          // Add product context message when product is set and chat is open
          setTimeout(() => {
            this.addProductContextMessage(product);
          }, 100);
        }
      }
    });
  }

  ngOnInit() {
    // Sync state on init
    this.isOpen.set(this.chatbotService.isOpen());
    this.productContext.set(this.chatbotService.productContext());
  }

  closeChat() {
    console.log('Close chat clicked');
    this.chatbotService.closeChat();
    // Force update local state immediately
    this.isOpen.set(false);
  }

  addProductContextMessage(product: Product) {
    // Check if product context message already exists
    const existingContext = this.messages().find(msg => 
      msg.isBot && msg.productContext && msg.productContext._id === product._id
    );
    
    if (!existingContext) {
      const contextMessage: ChatMessage = {
        id: 'product-context-' + product._id,
        text: `Bạn đang xem sản phẩm "${product.name}". Tôi có thể giúp bạn tư vấn về sản phẩm này!`,
        isBot: true,
        timestamp: new Date(),
        productContext: product
      };
      this.messages.update(msgs => [...msgs, contextMessage]);
      this.shouldScroll = true;
    }
  }

  addBotMessage(text: string, products?: Product[]) {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      text,
      isBot: true,
      timestamp: new Date(),
      products: products || undefined
    };
    this.messages.update(msgs => [...msgs, message]);
    this.shouldScroll = true;
  }

  addUserMessage(text: string) {
    const message: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      text,
      isBot: false,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, message]);
    this.shouldScroll = true;
  }

  async sendMessage() {
    const message = this.userMessage().trim();
    if (!message) return;

    // Add user message
    this.addUserMessage(message);
    this.userMessage.set('');

    // Show typing indicator
    this.isTyping.set(true);

    try {
      // Prepare conversation history
      const conversationHistory = this.messages()
        .slice(-10) // Last 10 messages
        .map(msg => ({
          role: msg.isBot ? 'assistant' : 'user',
          content: msg.text
        }));

      // Get product context if available
      const productContext = this.productContext();
      const requestBody: any = {
        message,
        conversationHistory
      };

      // Add product context to request if available - send ALL product information
      if (productContext) {
        requestBody.productContext = {
          _id: productContext._id,
          name: productContext.name,
          image: productContext.image,
          description: productContext.description,
          brand: productContext.brand,
          price: productContext.price,
          original_price: productContext.original_price,
          discount: productContext.discount,
          usage: productContext.usage,
          ingredients: productContext.ingredients,
          unit: productContext.unit,
          stock: productContext.stock,
          country: productContext.country,
          manufacturer: productContext.manufacturer,
          dosage_form: productContext.dosage_form,
          registration_number: productContext.registration_number
        };
      }

      // Call chatbot API
      const response = await fetch('http://localhost:3000/api/chatbot/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Add product context to message if available
        const productContext = this.productContext();
        
        // Add bot response with products if available
        this.addBotMessage(data.data.message, data.data.products || null);
        
        // If there's a product context, send it to backend for better context
        if (productContext) {
          // The product context is already visible in chat, 
          // backend will use it from the product data in the message
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.addBotMessage('Xin lỗi, tôi gặp sự cố khi xử lý tin nhắn của bạn. Vui lòng thử lại sau.');
    } finally {
      this.isTyping.set(false);
      this.shouldScroll = true; // Scroll after typing finishes
    }
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      setTimeout(() => {
        element.scrollTop = element.scrollHeight;
      }, 100);
    }
  }

  toggleChat() {
    console.log('Toggle chat clicked, current state:', this.isOpen());
    if (this.isOpen()) {
      this.chatbotService.closeChat();
    } else {
      this.chatbotService.openChat();
    }
    // Force update local state immediately
    this.isOpen.set(this.chatbotService.isOpen());
  }
}
