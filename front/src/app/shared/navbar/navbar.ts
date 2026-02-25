import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router'; // RouterLink es vital para el logo
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth'; // Asegúrate de que la ruta sea correcta

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink], // Agregamos RouterLink aquí
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit {
  nombreUsuario: string = 'Administrador';
  cargoUsuario: string = '';
  inicialUsuario: string = 'A';

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  // Esto se ejecuta apenas carga la barra superior
  ngOnInit() {
    // Buscamos los datos del usuario que guardamos en el Login
    const userString = localStorage.getItem('user');
    
    if (userString) {
      const user = JSON.parse(userString);
      this.nombreUsuario = user.nombre || 'Administrador';
      this.cargoUsuario = user.cargo || 'Funcionario Municipal';
      // Sacamos la primera letra del nombre para ponerla en el circulito
      this.inicialUsuario = this.nombreUsuario.charAt(0).toUpperCase();
    }
  }

  cerrarSesion() {
    // 1. Destruimos el token y los datos
    this.authService.logout();
    
    // 2. Redirigimos al Login (Esto automáticamente ocultará el sidebar y el navbar gracias al *ngIf que hicimos antes)
    this.router.navigate(['/login']);
  }
}