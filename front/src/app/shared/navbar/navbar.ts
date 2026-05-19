import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  constructor(
    public auth: AuthService,
    public router: Router
  ) {}

  logout() {
    this.auth.logout();
  }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  get paginaTitulo(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Dashboard';
    if (url.includes('items')) return 'Catálogo de Items';
    if (url.includes('movimientos')) return 'Movimientos';
    if (url.includes('usuarios')) return 'Usuarios';
    return 'Inventario Municipal';
  }
}