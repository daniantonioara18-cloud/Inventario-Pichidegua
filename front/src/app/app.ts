import { Component, signal, HostListener, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { NavbarComponent } from './shared/navbar/navbar';
import { SidebarComponent } from './shared/sidebar/sidebar';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NavbarComponent, 
    SidebarComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly title = signal('front');
  isLogin = false;

  constructor(
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isLogin = event.url === '/login' || event.urlAfterRedirects === '/login';
        console.log('URL:', event.url, 'isLogin:', this.isLogin);
        this.cdr.detectChanges(); // Forzar detección de cambios
      });
  }

  @HostListener('document:click')
  @HostListener('document:keypress')
  @HostListener('document:mousemove')
  @HostListener('document:scroll')
  onUserActivity() {
    this.auth.resetTimer();
  }
}