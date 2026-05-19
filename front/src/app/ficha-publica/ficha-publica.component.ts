import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-ficha-publica',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid py-4" *ngIf="!cargando && item">
      <div class="row justify-content-center">
        <div class="col-md-6 col-lg-5">
          
          <!-- Header -->
          <div class="text-center mb-4">
              <img src="/assets/image/Pichidegua_Verde.png" alt="Logo" style="height: 80px; width: auto; object-fit: contain;">
          </div>

          <!-- Tarjeta del item -->
          <div class="card border-0 shadow">
            <div class="card-header bg-success text-white py-3">
              <h5 class="mb-0 fw-bold">{{ item.nombre }}</h5>
              <small>{{ item.codigo_interno }}</small>
            </div>
            <div class="card-body p-4">
              
              <div class="row g-3">
                <div class="col-6">
                  <div class="small text-muted">Categoría</div>
                  <div class="fw-semibold">{{ item.categoria }}</div>
                </div>
                <div class="col-6">
                  <div class="small text-muted">Subcategoría</div>
                  <div class="fw-semibold">{{ item.subcategoria }}</div>
                </div>
                <div class="col-6">
                  <div class="small text-muted">Marca</div>
                  <div>{{ item.marca || 'N/A' }}</div>
                </div>
                <div class="col-6">
                  <div class="small text-muted">Modelo</div>
                  <div>{{ item.modelo || 'N/A' }}</div>
                </div>
                <div class="col-6">
                  <div class="small text-muted">Condición</div>
                  <span class="badge" [ngClass]="{
                    'bg-success': item.condicion_fisica === 'Bueno' || item.condicion_fisica === 'Nuevo',
                    'bg-warning text-dark': item.condicion_fisica === 'Regular',
                    'bg-danger': item.condicion_fisica === 'Malo'
                  }">{{ item.condicion_fisica }}</span>
                </div>
                <div class="col-6">
                  <div class="small text-muted">Estado</div>
                  <span class="badge" [ngClass]="item.activo ? 'bg-success' : 'bg-danger'">
                    {{ item.activo ? 'Operativo' : 'De baja' }}
                  </span>
                </div>
                <div class="col-12" *ngIf="item.area_actual">
                  <div class="small text-muted">Área asignada</div>
                  <div class="fw-semibold">{{ item.area_actual }}</div>
                </div>
                <div class="col-12" *ngIf="item.usuario_actual">
                  <div class="small text-muted">Responsable</div>
                  <div class="fw-semibold">{{ item.usuario_actual }}</div>
                </div>
                <div class="col-12" *ngIf="item.descripcion">
                  <div class="small text-muted">Descripción</div>
                  <div>{{ item.descripcion }}</div>
                </div>
              </div>

              <hr class="my-3">

              <div class="text-center text-muted small">
                <div>Fecha ingreso: {{ item.fecha_ingreso | date:'dd/MM/yyyy' }}</div>
                <div>Vida útil: {{ item.vida_util_meses }} meses</div>
                <div class="mt-2">UUID: {{ item.uuid_qr }}</div>
              </div>

            </div>
          </div>

          <!-- Footer -->
          <div class="text-center mt-4">
            <a routerLink="/login" class="btn btn-outline-success btn-sm">
              🔐 Ingresar al sistema
            </a>
          </div>

        </div>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="cargando" class="text-center py-5">
      <div class="spinner-border text-success"></div>
      <div class="mt-2 text-muted">Cargando ficha...</div>
    </div>

    <!-- Error -->
    <div *ngIf="error" class="text-center py-5">
      <div class="alert alert-danger d-inline-block">
        {{ error }}
      </div>
      <div class="mt-3">
        <a routerLink="/" class="btn btn-outline-secondary">Volver al inicio</a>
      </div>
    </div>
  `,
  styles: [`
    .logo-muni { font-size: 48px; }
    .card-header { border-radius: 12px 12px 0 0 !important; }
    .card { border-radius: 12px !important; }
  `]
})
export class FichaPublicaComponent implements OnInit {
  item: any = null;
  cargando = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (!uuid) {
      this.error = 'Código QR inválido';
      this.cargando = false;
      return;
    }

    this.http.get(`http://localhost:3001/api/items/public/${uuid}`).subscribe({
      next: (data) => {
        this.item = data;
        this.cargando = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Item no encontrado';
        this.cargando = false;
      }
    });
  }
}