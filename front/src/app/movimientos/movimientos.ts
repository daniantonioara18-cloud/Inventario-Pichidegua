import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../services/api';

type TipoMov = 'ASIGNACION' | 'TRASLADO' | '';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movimientos.html',
  styleUrls: ['./movimientos.scss'],
})
export class MovimientosComponent implements OnInit {
  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  // data
  movimientos: any[] = [];

  // ui states
  loading = false;
  error = '';
  success = '';

  // filtros
  searchText = '';
  filtroTipo: TipoMov = '';

  // modal detalle
  showDetailModal = false;
  selectedMov: any = null;

  ngOnInit() {
    this.loadMovimientos();
  }

  loadMovimientos() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.api
      .getMovimientos({
        q: this.searchText.trim() || undefined,
        tipo: this.filtroTipo || undefined,
        limit: 300,
        offset: 0,
      })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (rows) => {
          // opcional: filtrar solo ASIGNACION/TRASLADO aunque el back ya filtre por tipo_movimiento existente
          this.movimientos = (rows ?? []).filter((m: any) => m.tipo === 'ASIGNACION' || m.tipo === 'TRASLADO');
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Error cargando movimientos (revisa GET /movimientos en el back)';
          this.cdr.detectChanges();
        },
      });
  }

  onBuscar() {
    this.loadMovimientos();
  }

  limpiarFiltros() {
    this.searchText = '';
    this.filtroTipo = '';
    this.loadMovimientos();
  }

  // helpers display
  badgeClass(tipo: string) {
    if (tipo === 'ASIGNACION') return 'bg-success-subtle text-success border-success-subtle';
    if (tipo === 'TRASLADO') return 'bg-warning-subtle text-warning border-warning-subtle';
    return 'bg-light text-dark border';
  }

  fmtOrigen(m: any) {
    const user = m?.origen_usuario ? `${m.origen_usuario}` : null;
    const area = m?.origen_area ? `${m.origen_area}` : null;

    if (user && area) return `${user} (${area})`;
    if (user) return user;
    if (area) return area;
    return '—';
  }

  fmtDestino(m: any) {
    const user = m?.destino_usuario ? `${m.destino_usuario}` : null;
    const area = m?.destino_area ? `${m.destino_area}` : null;

    if (user && area) return `${user} (${area})`;
    if (user) return user;
    if (area) return area;
    return '—';
  }

  openDetail(m: any) {
    this.selectedMov = m;
    this.showDetailModal = true;
    this.cdr.detectChanges();
  }

  closeDetail() {
    this.showDetailModal = false;
    this.selectedMov = null;
    this.cdr.detectChanges();
  }
}