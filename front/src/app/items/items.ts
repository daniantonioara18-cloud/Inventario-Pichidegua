import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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

    this.catalogs.getAll()
      .pipe(finalize(() => (this.loadingCatalogs = false)))
      .subscribe({
        next: (c) => (this.catalogos = c),
        error: () => (this.errorCatalogs = 'Error cargando catálogos (revisa endpoints en el back)'),
      });
  }

  openTipoModal() {
    this.tiposSeleccionado = null;
    this.showTipoModal = true;
  }

  closeTipoModal() {
    this.showTipoModal = false;
  }

  seleccionarTipo(tipo: 'TECNO' | 'MUEBLE') {
    this.tiposSeleccionado = tipo;
    this.showTipoModal=false

    //opcional: dejar la subtcategoría pre-seleccionada según el tipo vacia para obligar a elegir
    this.form.id_subcategoria = null;
    this.fichaTecno = { serial:'', procesador:'', memoria_ram:'', disco_duro:'', direccion_ip:'', sistema_operativo:'', host_name:'' };
    this.fichaMueble = { material:'', color:'', dimensiones:'' };
    //abrur modal 
    this.closeCreateModal()
    this.openCreateModal();
  }

  get subcategoriasFiltradas() {
  // Si no eligieron tipo, devuelvo i
  if (!this.tiposSeleccionado) return this.catalogos.subcategorias;

  // OJO: esto depende de que tu backend mande sc.categoria como texto (Tecnología/Mobiliario)
  const categoriaEsperada = this.tiposSeleccionado === 'TECNO' ? 'Tecnología' : 'Mobiliario';

  return this.catalogos.subcategorias.filter(sc => sc.categoria === categoriaEsperada);
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
}



