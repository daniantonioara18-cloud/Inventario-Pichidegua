import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  email = '';
  password = '';
  errorMsg = '';
  loading = false;
  mostrarPassword = false;

  constructor(private authService: AuthService, private router: Router, private cdRef: ChangeDetectorRef) {}

  togglePassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  detectChanges() {
    this.cdRef.detectChanges();
  }

  onSubmit() {
    this.errorMsg = '';
    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Si sale bien, lo mandamos a ver el inventario
        this.router.navigate(['/items']);
        this.detectChanges(); // Forzamos a Angular a actualizar la vista para ocultar el errorMsg y el loading
      },
      error: (err) => {
        this.loading = false;
        // Si sale mal, mostramos el error del backend (ej: "Contraseña incorrecta")
        this.errorMsg = err.error?.error || 'Error de conexión con el servidor';
        this.detectChanges();
      }
    });
  }
}