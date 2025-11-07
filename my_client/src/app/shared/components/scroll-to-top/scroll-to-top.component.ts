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
      bottom: 100px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(14, 165, 233, 0.5);
      z-index: 10001;
      transition: all 0.3s ease;
      animation: fadeInUp 0.3s ease;
    }

    .scroll-to-top-btn:hover {
      background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
      box-shadow: 0 6px 24px rgba(14, 165, 233, 0.7);
      transform: translateY(-3px) scale(1.08);
    }

    .scroll-to-top-btn:active {
      transform: translateY(0) scale(0.95);
    }

    .scroll-to-top-btn svg {
      width: 28px;
      height: 28px;
      transform: rotate(180deg);
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
        bottom: 90px;
        right: 20px;
        width: 50px;
        height: 50px;
      }

      .scroll-to-top-btn svg {
        width: 24px;
        height: 24px;
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

