import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  // Variables vinculadas al formulario (ngModel)
  username = '';
  password = '';
  error = '';
  loading = false;

  // Inyección de servicios usando el patrón moderno de Angular
  private auth = inject(AuthService);
  private router = inject(Router);

  /**
   * Se ejecuta al enviar el formulario
   */
  onSubmit(): void {
    // Validación básica antes de enviar al servidor
    if (!this.username || !this.password) {
      this.error = 'Por favor, ingresa tus credenciales.';
      return;
    }

    this.error = '';
    this.loading = true;

    // Llamada al método login del AuthService
    // Importante: Asegúrate que en auth.ts el método login tenga un 'return'
    this.auth.login(this.username, this.password).subscribe({
      next: (response: any) => {
        // Si el servidor responde con éxito, navegamos al dashboard
        console.log('Login exitoso:', response);
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        // Manejo de errores (401 Unauthorized, 500 Server Error, etc.)
        console.error('Error en el login:', err);
        this.error = 'Usuario o contraseña incorrectos';
        this.password = ''; // Limpiamos la clave por seguridad
        this.loading = false;
      },
      complete: () => {
        // Se ejecuta siempre al terminar la petición
        this.loading = false;
      }
    });
  }
}