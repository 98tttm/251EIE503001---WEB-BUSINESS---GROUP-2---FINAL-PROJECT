import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface ChatMessage {
  _id?: string;
  chatId: string;
  sender: 'user' | 'pharmacist' | 'system';
  message: string;
  content?: string;
  type?: 'text' | 'file' | 'emoji';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  timestamp: Date;
  read?: boolean;
}

interface PharmacistChatData {
  _id?: string;
  userId?: string;
  phone: string;
  userName?: string;
  status: 'pending' | 'active' | 'closed';
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-pharmacist-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pharmacist-chat.html',
  styleUrl: './pharmacist-chat.css'
})
export class PharmacistChat implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef<HTMLDivElement>;
  
  isLoggedIn = signal(false);
  showPhoneInput = signal(false);
  phoneNumber = signal('');
  userMessage = signal('');
  isTyping = signal(false);
  loading = signal(true);
  showEmojiPicker = signal(false);
  selectedFile = signal<File | null>(null);
  
  chat = signal<PharmacistChatData | null>(null);
  messages = signal<ChatMessage[]>([]);
  private shouldScroll = false;
  private refreshInterval: any;

  readonly commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌',
    '💪', '🦾', '🦿', '🤝', '🙏', '✍️', '💅', '🤳', '💃', '🕺'
  ];

  constructor(
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit() {
    this.checkAuth();
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  checkAuth() {
    const user = this.authService.currentUser();
    this.isLoggedIn.set(!!user);
    
    if (user) {
      this.phoneNumber.set(user.phone);
      this.loadChat();
    } else {
      this.showPhoneInput.set(true);
      this.loading.set(false);
    }
  }

  async submitPhone() {
    const phone = this.phoneNumber().trim();
    if (!phone || phone.length < 10) {
      alert('Vui lòng nhập số điện thoại hợp lệ (ít nhất 10 số)');
      return;
    }

    this.loading.set(true);
    try {
      // Create or get chat session with phone number
      const response = await fetch('http://localhost:3000/api/pharmacist-chat/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();
      if (data.success) {
        this.showPhoneInput.set(false);
        this.loadChat(data.data.chatId);
      } else {
        alert('Không thể khởi tạo chat. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadChat(chatId?: string) {
    this.loading.set(true);
    try {
      const user = this.authService.currentUser();
      const phone = this.phoneNumber();
      
      let url = 'http://localhost:3000/api/pharmacist-chat';
      if (user?.userId) {
        url += `?userId=${user.userId}`;
      } else if (chatId) {
        url += `?chatId=${chatId}`;
      } else if (phone) {
        url += `?phone=${phone}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        this.chat.set(data.data);
        this.messages.set(data.data.messages || []);
        this.shouldScroll = true;
        
        // Start auto-refresh if chat is active
        if (data.data.status === 'active' || data.data.status === 'pending') {
          this.startAutoRefresh();
        }
      } else {
        // No chat found, create new one
        await this.createNewChat();
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async createNewChat() {
    const user = this.authService.currentUser();
    const phone = this.phoneNumber();
    
    try {
      const response = await fetch('http://localhost:3000/api/pharmacist-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user?.userId,
          phone: phone,
          userName: user?.name || user?.phone
        })
      });

      const data = await response.json();
      if (data.success) {
        this.chat.set(data.data);
        this.messages.set([]);
        // Add welcome message
        this.addSystemMessage('Chào bạn! Dược sĩ sẽ phản hồi bạn sớm nhất có thể. Vui lòng mô tả vấn đề của bạn.');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  }

  async sendMessage() {
    const message = this.userMessage().trim();
    const file = this.selectedFile();
    
    if ((!message && !file) || !this.chat()) return;

    const chatId = this.chat()!._id;
    if (!chatId) {
      alert('Chat chưa được khởi tạo. Vui lòng thử lại.');
      return;
    }

    // Add user message locally
    const userMsg: any = {
      chatId,
      sender: 'user',
      content: message || '',
      message: message || (file ? `Đã gửi file: ${file.name}` : ''),
      timestamp: new Date(),
      read: false,
      type: file ? 'file' : 'text'
    };
    
    if (file) {
      userMsg.fileName = file.name;
      userMsg.fileSize = file.size;
    }
    
    this.messages.update(msgs => [...msgs, userMsg as ChatMessage]);
    this.userMessage.set('');
    this.selectedFile.set(null);
    this.showEmojiPicker.set(false);
    this.shouldScroll = true;

    this.isTyping.set(true);

    try {
      const formData = new FormData();
      formData.append('message', message || '');
      formData.append('sender', 'user');
      if (file) {
        formData.append('file', file);
        formData.append('type', 'file');
      }

      const response = await fetch(`http://localhost:3000/api/pharmacist-chat/${chatId}/message`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // Update message with server response
        this.messages.update(msgs => {
          const index = msgs.findIndex(m => m === userMsg);
          if (index !== -1 && data.data) {
            msgs[index] = data.data as ChatMessage;
          }
          return [...msgs];
        });
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
      // Remove failed message
      this.messages.update(msgs => msgs.filter(m => m !== userMsg));
    } finally {
      this.isTyping.set(false);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File không được vượt quá 5MB');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
    input.value = '';
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker.update(v => !v);
  }

  insertEmoji(emoji: string): void {
    this.userMessage.update(current => current + emoji);
    this.showEmojiPicker.set(false);
  }

  addSystemMessage(text: string) {
    const chatId = this.chat()?._id || '';
    const systemMsg: ChatMessage = {
      chatId,
      sender: 'system',
      message: text,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, systemMsg]);
    this.shouldScroll = true;
  }

  startAutoRefresh() {
    // Refresh messages every 5 seconds
    this.refreshInterval = setInterval(() => {
      if (this.chat()?._id) {
        this.refreshMessages();
      }
    }, 5000);
  }

  async refreshMessages() {
    const chatId = this.chat()?._id;
    if (!chatId) return;

    try {
      const response = await fetch(`http://localhost:3000/api/pharmacist-chat/${chatId}/messages`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const newMessages = data.data;
        const currentMessages = this.messages();
        
        // Only update if there are new messages
        if (newMessages.length !== currentMessages.length || 
            (newMessages.length > 0 && newMessages[newMessages.length - 1]._id !== currentMessages[currentMessages.length - 1]._id)) {
          this.messages.set(newMessages);
          this.shouldScroll = true;
        }
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
    }
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      setTimeout(() => {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 100);
    }
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  }

  formatTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  goHome() {
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

