import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiService } from '../services/api';
import { CatalogsService,CatalogosBase, Subcategoria } from '../services/catalogs';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './items.html',
  styleUrls: ['./items.scss'],
})
export class ItemsComponent implements OnInit {

  constructor(private api: ApiService, private catalogs: CatalogsService, private cdr:ChangeDetectorRef) {
    console.log('ItemsComponent CONSTRUCTOR');
    
  }
  
  // data
  items: any[] = [];
// si tu endpoint /items no entrega marca/categoría/subcategoría como texto, tendrás que mapearlos tú usando los catálogos (id -> nombre)
  // estados UI
  loadingItems = false;
  loadingCatalogs = false;
  errorItems = '';
  errorCatalogs = '';
  successMsg = '';
  //modal Previo
  showTipoModal = false;
  tiposSeleccionado:'TECNO' | 'MUEBLE' | null = null;

  fichaTecno = {
    serial: '',
    procesador: '',
    memoria_ram: "",
    disco_duro:"",
    direccion_ip: '',
    sistema_operativo: '',
    host_name: '',
  };

  fichaMueble = {
    material: '',
    color: '',
    dimensiones: '',
  };

  // modal
  showCreateModal = false;
  creating = false;

  // catálogos
  catalogos: CatalogosBase = {
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

    // -------------------------
  // BUSCADOR / FILTROS (frontend-only)
  // -------------------------
  searchText = '';

  filtros = {
    activo: null as boolean | null, // null = todos
    // si tu endpoint /items NO trae ids, estos filtros por id no funcionarán
    marca: null as number | null,
    subcategoria: null as number | null,
    adquisicion: null as number | null,
  };
  

  get itemsFiltrados() {
    const q = this.searchText.trim().toLowerCase();

    return this.items.filter((it) => {
      // buscador por varias columnas (texto)
      const matchTexto =
        !q ||
        (it.codigo_interno ?? '').toLowerCase().includes(q) ||
        (it.nombre ?? '').toLowerCase().includes(q) ||
        (it.modelo ?? '').toLowerCase().includes(q) ||
        (it.marca ?? '').toLowerCase().includes(q) ||
        (it.categoria ?? '').toLowerCase().includes(q) ||
        (it.subcategoria ?? '').toLowerCase().includes(q);

      // filtros (requieren que /items entregue id_marca, id_subcategoria, id_adquisicion)
      const matchMarca =
        this.filtros.marca === null || it.id_marca === this.filtros.marca;

      const matchSubcat =
        this.filtros.subcategoria === null ||
        it.id_subcategoria === this.filtros.subcategoria;

      const matchAdq =
        this.filtros.adquisicion === null ||
        it.id_adquisicion === this.filtros.adquisicion;

      const matchActivo =
        this.filtros.activo === null || !!it.activo === this.filtros.activo;

      return matchTexto && matchMarca && matchSubcat && matchAdq && matchActivo;
    });
  }

  ngOnInit() {
    console.log('ItemsComponent ngOnInit');
    this.loadItems();
    this.loadCatalogsOnce();
  }

  // -------------------------
  // ITEMS
  // -------------------------
  loadItems() {
    this.loadingItems = true;
    this.errorItems = '';

    this.api.getItems().subscribe({
      next: (data) => {
      this.items = data;
      this.loadingItems = false;
      this.cdr.detectChanges(); // fuerza render
    },
    error: ()=> {
      this.errorItems = 'Error cargando items (revisa endpoint /items en el back)';
      this.loadingItems = false;
      this.cdr.detectChanges();
    }});
  }

  

  // CATÁLOGOS (1 sola vez, cacheado)
  // -------------------------
  loadCatalogsOnce() {
    this.loadingCatalogs = true;
    this.errorCatalogs = '';

   this.catalogs.getAllBase().subscribe({
    next: (c) => {
      this.catalogos.areas = c.areas;
      this.catalogos.adquisiciones = c.adquisiciones;
      this.catalogos.subcategorias = c.subcategorias;
    },
    error: () => (this.errorCatalogs = 'Error cargando catálogos base'),
  });
  }

  openTipoModal() {
    this.tiposSeleccionado = null;
    this.showTipoModal = true;
  }

  closeTipoModal() {
    this.showTipoModal = false;
  }

  // seleccionarTipo(tipo: 'TECNO' | 'MUEBLE') {
  //   this.tiposSeleccionado = tipo;
  //   this.showTipoModal = false;

  //   // Limpia selección de marca para evitar arrastrar una marca de otro tipo
  //   this.form.id_marca = null;

  //   // ✅ cargar marcas del tipo seleccionado
  //   this.loadingCatalogs = true;
  //   this.catalogs.getMarcasByTipo(tipo).subscribe({
  //     next: (marcas) => {
  //       this.catalogos.marcas = marcas; // <-- ahora el select queda vacío en MUEBLE si no hay nada
  //       this.loadingCatalogs = false;
  //       this.openCreateModal();
  //     },
  //     error: () => {
  //       this.loadingCatalogs = false;
  //       this.errorCatalogs = 'Error cargando marcas por tipo';
  //       this.openCreateModal();
  //     },
  //   });
  // }
  seleccionarTipo(tipo: 'TECNO' | 'MUEBLE') {
  this.tiposSeleccionado = tipo;

  // 1) cerrar modal previo
  this.showTipoModal = false;

  // 2) reset cosas del form relacionadas
  this.form.id_marca = null;
  this.form.id_subcategoria = null;

  // 3) cargar marcas por tipo y recién ahí abrir modal grande
  this.loadingCatalogs = true;
  this.errorCatalogs = '';

  this.catalogs.getMarcasByTipo(tipo).subscribe({
    next: (marcas) => {
      this.catalogos.marcas = marcas;
      this.loadingCatalogs = false;

      // 4) abrir modal grande
      this.showCreateModal = true;

      // opcional: fuerza render si todavía tienes dramas
      this.cdr.detectChanges();
    },
    error: () => {
      this.loadingCatalogs = false;
      this.errorCatalogs = 'Error cargando marcas por tipo';

      // igual abre el modal grande para que el usuario vea el error
      this.showCreateModal = true;
      this.cdr.detectChanges();
    },
  });
}







 get subcategoriasFiltradas() {

  if (!this.tiposSeleccionado) {
    return this.catalogos.subcategorias;
  }

  const categoriaEsperada =
    this.tiposSeleccionado === 'TECNO'
      ? 'Tecnología'
      : 'Mobiliario';

  return this.catalogos.subcategorias
    .filter((sc: Subcategoria) =>
      sc.categoria === categoriaEsperada
    );
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

    const payload = {
      ...this.form,
      tipo : this.tiposSeleccionado, // 'TECNO' o 'MUEBLE'
      ficha_tecnica: this.tiposSeleccionado === 'TECNO' ? this.fichaTecno : null,
      ficha_mueble: this.tiposSeleccionado === 'MUEBLE' ? this.fichaMueble : null,
    };

    this.api.createItem(payload)
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

showAddMarca = false;
newMarcaNombre = '';
savingMarca = false;

openAddMarca() {
  this.showAddMarca = true;
  this.newMarcaNombre = '';
}

cancelAddMarca() {
  this.showAddMarca = false;
  this.newMarcaNombre = '';
}

guardarMarca() {
  if (!this.tiposSeleccionado) return; // seguridad
  const nombre = this.newMarcaNombre.trim();
  if (!nombre) return;

  this.savingMarca = true;

  this.catalogs.createMarca(nombre, this.tiposSeleccionado)
    .pipe(finalize(() => (this.savingMarca = false)))
    .subscribe({
      next: (marcaCreada) => {
        // romper cache y recargar marcas del tipo
        this.catalogs.invalidateMarcas(this.tiposSeleccionado!);

        this.catalogs.getMarcasByTipo(this.tiposSeleccionado!)
          .subscribe({
            next: (marcas) => {
              this.catalogos.marcas = marcas;
              // seleccionar automáticamente la nueva marca
              this.form.id_marca = marcaCreada.id_marca;
              this.cancelAddMarca();
            },
            error: () => {
              this.errorCatalogs = 'Marca creada, pero error recargando marcas';
              this.cancelAddMarca();
            }
          });
      },
      error: (err) => {
        this.errorCatalogs = err?.error?.error || 'Error creando marca';
      }
    });
}

}



