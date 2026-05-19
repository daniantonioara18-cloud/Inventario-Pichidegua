import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-qr-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="text-center py-5" *ngIf="cargando">
      <div class="spinner-border text-success"></div>
      <div class="mt-2 text-muted">Procesando código...</div>
    </div>
    <div class="text-center py-5" *ngIf="error">
      <div class="alert alert-danger d-inline-block">{{ error }}</div>
    </div>
  `
})
export class QrRedirectComponent implements OnInit {
  cargando = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      this.error = 'Código inválido';
      this.cargando = false;
      return;
    }

    // Detectar si viene de la app interna (tiene token/sesión)
    const tieneSesion = !!localStorage.getItem('token'); // o como guardes la sesión

    if (tieneSesion) {
      // Usuario logueado: ir al detalle del item en el sistema
      this.http.get<any>(`http://localhost:3001/api/items/qr/${uuid}`).subscribe({
        next: (item) => {
          this.router.navigate(['/items'], { 
            queryParams: { highlight: item.id_item } 
          });
          this.cargando = false;
        },
        error: () => {
          this.error = 'Item no encontrado';
          this.cargando = false;
        }
      });
    } else {
      // Sin sesión: ir a ficha pública
      this.router.navigate(['/ficha', uuid]);
      this.cargando = false;
    }
  }
}