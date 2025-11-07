import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Layout } from './layout/layout';
import { ToastNotification } from './toast-notification';
import { Chatbot } from './chatbot/chatbot';

@Component({
  selector: 'app-root',
  imports: [
    Layout,
    ToastNotification,
    Chatbot
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Scroll to top on route change
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
  }
}