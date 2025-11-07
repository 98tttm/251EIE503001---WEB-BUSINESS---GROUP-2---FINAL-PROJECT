import { Component, HostListener, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showButton()) {
      <button
        class="scroll-to-top-btn"
        (click)="scrollToTop()"
        [attr.aria-label]="'Lên đầu trang'"
        title="Lên đầu trang">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
        </svg>
      </button>
    }
  `,
  styles: [`
    .scroll-to-top-btn {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
      z-index: 1000;
      transition: all 0.3s ease;
      animation: fadeInUp 0.3s ease;
    }

    .scroll-to-top-btn:hover {
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      box-shadow: 0 6px 20px rgba(14, 165, 233, 0.6);
      transform: translateY(-2px) scale(1.05);
    }

    .scroll-to-top-btn:active {
      transform: translateY(0) scale(0.95);
    }

    .scroll-to-top-btn svg {
      width: 24px;
      height: 24px;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.8);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 768px) {
      .scroll-to-top-btn {
        bottom: 1.5rem;
        right: 1.5rem;
        width: 44px;
        height: 44px;
      }

      .scroll-to-top-btn svg {
        width: 20px;
        height: 20px;
      }
    }
  `]
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  private readonly scrollThreshold = 300; // Show button after scrolling 300px
  readonly showButton = signal(false);

  ngOnInit(): void {
    this.checkScrollPosition();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.checkScrollPosition();
  }

  private checkScrollPosition(): void {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    this.showButton.set(scrollY > this.scrollThreshold);
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

