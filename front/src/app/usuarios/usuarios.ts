import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../services/api';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.scss'],
})
export class UsuariosComponent implements OnInit {
  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  areas: any[] = [];
  loading = false;
  error = '';
  successMsg = '';
  exportandoId: number | null = null;

  usuarios: any[] = [];
  searchText = '';

  showModal = false;
  saving = false;
  editMode = false;

  form = {
    id_usuario: null as number | null,
    nombre: '',
    email: '',
    cargo: '',
    id_area: null as number | null,
  };

  ngOnInit(): void {
    this.loadUsuarios();
    this.loadAreas();
  }

  get usuariosFiltrados() {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.usuarios;

    return this.usuarios.filter((u) => {
      return (
        (u.nombre ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.cargo ?? '').toLowerCase().includes(q) ||
        String(u.id_usuario ?? '').includes(q)
      );
    });
  }

  loadUsuarios() {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.api
      .getUsuarios()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.usuarios = data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.error = 'Error cargando usuarios';
          this.cdr.detectChanges();
        },
      });
  }

  loadAreas() {
    this.api.getAreas().subscribe({
      next: (data) => this.areas = data,
      error: () => console.error('Error cargando áreas')
    });
  }

  // ===== EXPORTAR USUARIO =====
  exportarUsuario(u: any) {
    const idUsuario = u.id_usuario;
    const nombreUsuario = u.nombre;
    this.exportandoId = idUsuario;
    this.cdr.detectChanges();

    Promise.all([
      this.http.get<any[]>(`/api/items?usuario_id=${idUsuario}`).toPromise().catch(() => []),
      this.http.get<any[]>(`/api/movimientos?usuario_id=${idUsuario}`).toPromise().catch(() => [])
    ]).then(([items, movimientos]) => {
      this.generarExcelUsuario(nombreUsuario, items || [], movimientos || []);
      this.exportandoId = null;
      this.cdr.detectChanges();
    }).catch(err => {
      console.error('Error cargando datos para exportar:', err);
      this.error = 'Error cargando datos del usuario para exportar';
      this.exportandoId = null;
      this.cdr.detectChanges();
    });
  }

  private generarExcelUsuario(nombreUsuario: string, items: any[], movimientos: any[]) {
    // Hoja 1: Items Asignados
    const itemsData = items.length === 0 
      ? [['No hay items asignados a este usuario']]
      : [
          ['Código', 'Nombre', 'Modelo', 'Categoría', 'Subcategoría', 'Condición', 'Estado'],
          ...items.map(item => [
            item.codigo_interno,
            item.nombre,
            item.modelo || 'N/A',
            item.categoria,
            item.subcategoria,
            item.condicion_fisica,
            item.activo ? 'Operativo' : 'Baja'
          ])
        ];

    const wsItems = XLSX.utils.aoa_to_sheet(itemsData);

    // Hoja 2: Movimientos
    const movData = movimientos.length === 0
      ? [['No hay movimientos registrados para este usuario']]
      : [
          ['Fecha', 'Tipo', 'Item', 'Origen', 'Destino', 'Observación'],
          ...movimientos.map(m => [
            m.fecha ? new Date(m.fecha).toLocaleString('es-CL') : '—',
            m.tipo,
            `${m.codigo_interno || '—'} - ${m.item_nombre || '—'}`,
            this.fmtOrigen(m),
            this.fmtDestino(m),
            m.observacion || '—'
          ])
        ];

    const wsMov = XLSX.utils.aoa_to_sheet(movData);

    // Crear workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsItems, 'Items Asignados');
    XLSX.utils.book_append_sheet(wb, wsMov, 'Movimientos');

    // Descargar
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Usuario_${nombreUsuario.replace(/\s+/g, '_')}_${fecha}.xlsx`);
  }

  private fmtOrigen(m: any) {
    const user = m?.origen_usuario ? `${m.origen_usuario}` : null;
    const area = m?.origen_area ? `${m.origen_area}` : null;
    if (user && area) return `${user} (${area})`;
    if (user) return user;
    if (area) return area;
    return '—';
  }

  private fmtDestino(m: any) {
    const user = m?.destino_usuario ? `${m.destino_usuario}` : null;
    const area = m?.destino_area ? `${m.destino_area}` : null;
    if (user && area) return `${user} (${area})`;
    if (user) return user;
    if (area) return area;
    return '—';
  }

  // ===== MODAL =====

  openCreate() {
    this.editMode = false;
    this.successMsg = '';
    this.error = '';
    this.form = { id_usuario: null, nombre: '', email: '', cargo: '', id_area: null };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEdit(u: any) {
    this.editMode = true;
    this.successMsg = '';
    this.error = '';
    this.form = {
      id_usuario: u.id_usuario,
      nombre: u.nombre ?? '',
      email: u.email ?? '',
      cargo: u.cargo ?? '',
      id_area: u.id_area ?? null,
    };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  // ===== GUARDAR =====

  save() {
    this.error = '';
    this.successMsg = '';
    this.saving = true;
    this.cdr.detectChanges();

    const payload = {
      nombre: this.form.nombre.trim(),
      email: this.form.email.trim(),
      cargo: this.form.cargo?.trim() || null,
      id_area: this.form.id_area,
    };

    if (!payload.nombre || !payload.email) {
      this.error = 'Faltan nombre o email';
      this.saving = false;
      this.cdr.detectChanges();
      return;
    }

    if (this.editMode && this.form.id_usuario) {
      this.api.updateUsuario(this.form.id_usuario, payload).subscribe({
        next: (usuarioActualizado: any) => {
          const idx = this.usuarios.findIndex(u => u.id_usuario === this.form.id_usuario);
          if (idx !== -1) this.usuarios[idx] = { ...this.usuarios[idx], ...usuarioActualizado };

          this.successMsg = 'Usuario actualizado ';
          this.closeModal();
          this.saving = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Error actualizando usuario';
          this.saving = false;
          this.cdr.detectChanges();
        }
      });
      return;
    }

    this.api.createUsuario(payload).subscribe({
      next: (nuevoUsuario: any) => {
        this.usuarios.unshift(nuevoUsuario);
        this.successMsg = 'Usuario creado ✅';
        this.closeModal();
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error creando usuario';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  delete(u: any) {
    if (!confirm(`¿Eliminar usuario ${u.nombre}?`)) return;

    this.api.deleteUsuario(u.id_usuario).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(x => x.id_usuario !== u.id_usuario);
        this.successMsg = 'Usuario eliminado correctamente';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error eliminando usuario';
        this.cdr.detectChanges();
      }
    });
  }
}