import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  totalItems = 0;
  sinCustodio = 0;
  totalUsuarios = 0;
  totalMovimientos = 0;
  porCategoria: { categoria: string, total: number }[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('Dashboard: iniciando carga...');

    let completed = 0;
    const totalRequests = 3;

    const checkComplete = () => {
      completed++;
      console.log(`Dashboard: completadas ${completed}/${totalRequests} peticiones`);
      if (completed >= totalRequests) {
        this.loading = false;
        console.log('Dashboard: carga finalizada', {
          items: this.totalItems,
          usuarios: this.totalUsuarios,
          movimientos: this.totalMovimientos,
          categorias: this.porCategoria
        });
        // FORZAR actualización de la vista
        this.cdr.detectChanges();
      }
    };

    this.api.getItems().subscribe({
      next: (items) => {
        console.log('Dashboard: items recibidos', items.length);
        this.totalItems = items.length;
       this.sinCustodio = items.filter((i: any) => {
  // Comprobamos si NO tiene un ID de usuario o si el ID es nulo
  return !i.id_user_actual || i.id_user_actual === null;
}).length;
        
        const cat: Record<string, number> = {};
        items.forEach((i: any) => {
          cat[i.categoria] = (cat[i.categoria] || 0) + 1;
        });
        this.porCategoria = Object.entries(cat).map(([categoria, total]) => ({ categoria, total }));
        
        this.cdr.detectChanges(); // Forzar actualización
        checkComplete();
      },
      error: (err) => {
        console.error('Dashboard: error al cargar items', err);
        this.error = 'Error al cargar items';
        this.cdr.detectChanges();
        checkComplete();
      }
    });

    this.api.getUsuarios().subscribe({
      next: (u) => {
        console.log('Dashboard: usuarios recibidos', u.length);
        this.totalUsuarios = u.length;
        this.cdr.detectChanges();
        checkComplete();
      },
      error: (err) => {
        console.error('Dashboard: error al cargar usuarios', err);
        this.cdr.detectChanges();
        checkComplete();
      }
    });

    this.api.getMovimientos({ limit: 1000 }).subscribe({
      next: (m) => {
        console.log('Dashboard: movimientos recibidos', m.length);
        this.totalMovimientos = m.length;
        this.cdr.detectChanges();
        checkComplete();
      },
      error: (err) => {
        console.error('Dashboard: error al cargar movimientos', err);
        this.cdr.detectChanges();
        checkComplete();
      }
    });
  }
}