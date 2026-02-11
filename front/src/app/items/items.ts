import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiService } from '../services/api';
import { CatalogsService, Catalogos } from '../services/catalogs';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './items.html',
  styleUrls: ['./items.scss'],
})
export class ItemsComponent {
  // data
  items: any[] = [];

  // estados UI
  loadingItems = false;
  loadingCatalogs = false;
  errorItems = '';
  errorCatalogs = '';
  successMsg = '';

  // modal
  showCreateModal = false;
  creating = false;

  // catálogos
  catalogos: Catalogos = {
    marcas: [],
    areas: [],
    adquisiciones: [],
    subcategorias: [],
  };

  // form
  form = {
    codigo_interno: '',
    nombre: '',
    modelo: '',
    descripcion: '',
    vida_util_meses: 48,
    condicion_fisica: 'Bueno',
    activo: true,
    id_subcategoria: null as number | null,
    id_marca: null as number | null,
    id_adquisicion: null as number | null,
    id_area_actual: null as number | null,
  };

  constructor(private api: ApiService, private catalogs: CatalogsService) {}

  ngOnInit() {
    this.loadItems();
    this.loadCatalogsOnce();
  }

  // -------------------------
  // ITEMS
  // -------------------------
  loadItems() {
    this.loadingItems = true;
    this.errorItems = '';

    this.api.getItems()
      .pipe(finalize(() => (this.loadingItems = false)))
      .subscribe({
        next: (data) => (this.items = data),
        error: () => (this.errorItems = 'No se pudo cargar la lista de items'),
      });
  }

  // -------------------------
  // CATÁLOGOS (1 sola vez, cacheado)
  // -------------------------
  loadCatalogsOnce() {
    this.loadingCatalogs = true;
    this.errorCatalogs = '';

    this.catalogs.getAll()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (c) => (this.catalogos = c),
        error: () => (this.errorCatalogs = 'Error cargando catálogos (revisa endpoints en el back)'),
      });
  }

  // -------------------------
  // MODAL
  // -------------------------
  openCreateModal() {
    this.successMsg = '';
    this.errorItems = '';
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  // -------------------------
  // CREATE
  // -------------------------
  create() {
    this.successMsg = '';
    this.errorItems = '';

    if (!this.form.codigo_interno || !this.form.nombre || !this.form.id_subcategoria) {
      this.errorItems = 'Completa Código, Nombre y Subcategoría';
      return;
    }

    this.creating = true;

    this.api.createItem(this.form)
      .pipe(finalize(() => (this.creating = false)))
      .subscribe({
        next: (resp: any) => {
          // lo insertamos arriba para que se vea altiro, sin recargar
          if (resp?.item) this.items.unshift(resp.item);

          this.successMsg = 'Item creado ✅';
          this.closeCreateModal();

          // reset básico
          this.form.codigo_interno = '';
          this.form.nombre = '';
          this.form.modelo = '';
          this.form.descripcion = '';
          this.form.id_subcategoria = null;
          this.form.id_marca = null;
          this.form.id_adquisicion = null;
          this.form.id_area_actual = null;
        },
        error: (err) => {
          this.errorItems = err?.error?.message || 'Error creando item';
        },
      });
  }
}
