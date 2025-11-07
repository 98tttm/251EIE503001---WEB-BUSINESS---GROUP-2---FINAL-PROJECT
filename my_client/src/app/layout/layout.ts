import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { ScrollToTopComponent } from '../shared/components/scroll-to-top/scroll-to-top.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Header, Footer, ScrollToTopComponent],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
}