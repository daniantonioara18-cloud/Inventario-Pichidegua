import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../services/api';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.scss'],
})
export class UsuariosComponent implements OnInit {
  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}



areas: any[] = [];



loadAreas() {
  this.api.getAreas().subscribe({
    next: (data) => this.areas = data,
    error: () => console.error('Error cargando áreas')
  });
}

  loading = false;
  error = '';
  successMsg = '';

  usuarios: any[] = [];
  searchText = '';

  // modal crear/editar
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

  // ===== GUARDAR (placeholder si aún no tienes backend CRUD) =====

  save() {
    // Si todavía NO tienes POST/PUT en el back, deja esto bloqueado con mensaje claro.
    this.error = 'Aún no existe backend CRUD (/usuarios). Solo listado por ahora.';
    this.cdr.detectChanges();
  }

  delete(u: any) {
    this.error = 'Aún no existe backend DELETE (/usuarios/:id).';
    this.cdr.detectChanges();
  }
}