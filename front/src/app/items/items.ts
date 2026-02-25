import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiService } from '../services/api';
import { CatalogsService, CatalogosBase, Subcategoria } from '../services/catalogs';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './items.html',
  styleUrls: ['./items.scss'],
})
export class ItemsComponent implements OnInit {
  constructor(
    private api: ApiService,
    private catalogs: CatalogsService,
    public cdr: ChangeDetectorRef
    
  ) {}

  // =========================
  // DATA
  // =========================
  items: any[] = [];

  // =========================
  // ESTADOS UI
  // =========================
  loadingItems = false;
  loadingCatalogs = false;

  errorItems = '';
  errorCatalogs = '';
  successMsg = '';

  // =========================
  // MODAL PREVIO (TIPO)
  // =========================
  showTipoModal = false;
  tiposSeleccionado: 'TECNO' | 'MUEBLE' | null = null;

  // =========================
  // MODAL CREAR
  // =========================
  showCreateModal = false;
  creating = false;

  // =========================
  // MODAL DETALLE
  // =========================
  showDetailModal = false;
  loadingDetail = false;
  errorDetail = '';
  selectItem: any = null;

  // =========================
  // MODALES ACCIONES DENTRO DE DETALLE
  // =========================
  showAsignarModal = false;
  showMoverModal = false;
  showEditarModal = false;

  // =========================
  // CATÁLOGOS
  // =========================
  catalogos: CatalogosBase = {
    marcas: [],
    areas: [],
    adquisiciones: [],
    subcategorias: [],
  };

  usuarios: any[] = [];

  // =========================
  // FORM CREAR ITEM
  // =========================
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

  fichaTecno = {
    serial: '',
    procesador: '',
    memoria_ram: '',
    disco_duro: '',
    direccion_ip: '',
    sistema_operativo: '',
    host_name: '',
  };

  fichaMueble = {
    material: '',
    color: '',
    dimensiones: '',
  };

  // =========================
  // BUSCADOR / FILTROS
  // =========================
  searchText = '';

  filtros = {
    activo: null as boolean | null,
    marca: null as number | null,
    subcategoria: null as number | null,
    adquisicion: null as number | null,
  };

  // =========================
  // FORM ASIGNAR / MOVER
  // =========================
  formAsignar = {
    destino_id_usuario: null as number | null,
    destino_id_area: null as number | null,
    observacion: '',
  };

  formMover = {
    destino_id_usuario: null as number | null,
    destino_id_area: null as number | null,
    observacion: '',
  };

  // =========================
  // FORM EDITAR (base)
  // =========================
  formEditar = {
    nombre: '',
    modelo: '',
    descripcion: '',
    vida_util_meses: null as number | null,
    condicion_fisica: 'Bueno',
    id_marca: null as number | null,
    id_adquisicion: null as number | null,
    id_subcategoria: null as number | null,
  };

  // =========================
  // MARCAS: agregar nueva marca
  // =========================
  showAddMarca = false;
  newMarcaNombre = '';
  savingMarca = false;

  // =========================
  // GETTERS
  // =========================
  get itemsFiltrados() {
    const q = this.searchText.trim().toLowerCase();

    return this.items.filter((it) => {
      const matchTexto =
        !q ||
        (it.codigo_interno ?? '').toLowerCase().includes(q) ||
        (it.nombre ?? '').toLowerCase().includes(q) ||
        (it.modelo ?? '').toLowerCase().includes(q) ||
        (it.marca ?? '').toLowerCase().includes(q) ||
        (it.categoria ?? '').toLowerCase().includes(q) ||
        (it.subcategoria ?? '').toLowerCase().includes(q);

      const matchMarca = this.filtros.marca === null || it.id_marca === this.filtros.marca;
      const matchSubcat =
        this.filtros.subcategoria === null || it.id_subcategoria === this.filtros.subcategoria;
      const matchAdq =
        this.filtros.adquisicion === null || it.id_adquisicion === this.filtros.adquisicion;
      const matchActivo = this.filtros.activo === null || !!it.activo === this.filtros.activo;

      return matchTexto && matchMarca && matchSubcat && matchAdq && matchActivo;
    });
  }

  get subcategoriasFiltradas() {
    if (!this.tiposSeleccionado) return this.catalogos.subcategorias;

    const categoriaEsperada = this.tiposSeleccionado === 'TECNO' ? 'Tecnología' : 'Mobiliario';

    return this.catalogos.subcategorias.filter(
      (sc: Subcategoria) => sc.categoria === categoriaEsperada
    );
  }

  get itemEstaAsignado(): boolean {
    return !!(this.selectItem?.id_user_actual && this.selectItem?.id_area_actual);
  }
  get itemSinAsignacion(): boolean {
  return !this.selectItem?.id_area_actual || !this.selectItem?.id_user_actual;
}

  // =========================
  // INIT
  // =========================
  ngOnInit() {
    this.loadItems();
    this.loadCatalogsOnce();
    this.loadUsuarios();
    this.cdr.detectChanges();
  }

  // =========================
  // CARGAS
  // =========================
  loadItems() {
    this.loadingItems = true;
    this.errorItems = '';
    this.cdr.detectChanges();

    this.api
      .getItems()
      .pipe(
        finalize(() => {
          this.loadingItems = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.items = data;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorItems = 'Error cargando items (revisa endpoint /items en el back)';
          this.cdr.detectChanges();
        },
      });
  }

  loadCatalogsOnce() {
    this.loadingCatalogs = true;
    this.errorCatalogs = '';
    this.cdr.detectChanges();

    this.catalogs
      .getAllBase()
      .pipe(
        finalize(() => {
          this.loadingCatalogs = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (c) => {
          this.catalogos.areas = c.areas;
          this.catalogos.adquisiciones = c.adquisiciones;
          this.catalogos.subcategorias = c.subcategorias;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorCatalogs = 'Error cargando catálogos base';
          this.cdr.detectChanges();
        },
      });
  }

  loadUsuarios() {
    this.api.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorCatalogs = 'Error cargando usuarios';
        this.cdr.detectChanges();
      },
    });
  }

  // =========================
  // MODAL TIPO -> ABRE MODAL CREAR
  // =========================
  openTipoModal() {
    this.tiposSeleccionado = null;
    this.showTipoModal = true;
    this.cdr.detectChanges();
  }

  closeTipoModal() {
    this.showTipoModal = false;
    this.cdr.detectChanges();
  }

  seleccionarTipo(tipo: 'TECNO' | 'MUEBLE') {
    this.tiposSeleccionado = tipo;
    this.showTipoModal = false;
    this.cdr.detectChanges();

    this.form.id_marca = null;
    this.form.id_subcategoria = null;
    this.cdr.detectChanges();

    this.loadingCatalogs = true;
    this.errorCatalogs = '';
    this.cdr.detectChanges();

    this.catalogs
      .getMarcasByTipo(tipo)
      .pipe(
        finalize(() => {
          this.loadingCatalogs = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (marcas) => {
          this.catalogos.marcas = marcas;
          this.showCreateModal = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorCatalogs = 'Error cargando marcas por tipo';
          this.showCreateModal = true;
          this.cdr.detectChanges();
        },
      });
  }

  openCreateModal() {
    this.successMsg = '';
    this.errorItems = '';
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.cdr.detectChanges();
  }

  // =========================
  // CREAR ITEM
  // =========================
  create() {
    this.successMsg = '';
    this.errorItems = '';
    this.cdr.detectChanges();

    if (!this.form.codigo_interno || !this.form.nombre || !this.form.id_subcategoria) {
      this.errorItems = 'Completa Código, Nombre y Subcategoría';
      this.cdr.detectChanges();
      return;
    }

    this.creating = true;
    this.cdr.detectChanges();

    const payload = {
      ...this.form,
      tipo: this.tiposSeleccionado,
      ficha_tecnica: this.tiposSeleccionado === 'TECNO' ? this.fichaTecno : null,
      ficha_mueble: this.tiposSeleccionado === 'MUEBLE' ? this.fichaMueble : null,
    };

    this.api
      .createItem(payload)
      .pipe(
        finalize(() => {
          this.creating = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (resp: any) => {
          if (resp?.item) this.items.unshift(resp.item);

          this.successMsg = 'Item creado ✅';
          this.closeCreateModal();

          this.form.codigo_interno = '';
          this.form.nombre = '';
          this.form.modelo = '';
          this.form.descripcion = '';
          this.form.id_subcategoria = null;
          this.form.id_marca = null;
          this.form.id_adquisicion = null;
          this.form.id_area_actual = null;

          this.fichaTecno = {
            serial: '',
            procesador: '',
            memoria_ram: '',
            disco_duro: '',
            direccion_ip: '',
            sistema_operativo: '',
            host_name: '',
          };
          this.fichaMueble = { material: '', color: '', dimensiones: '' };

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorItems = err?.error?.message || 'Error creando item';
          this.cdr.detectChanges();
        },
      });
  }

  // =========================
  // AGREGAR MARCA
  // =========================
  openAddMarca() {
    this.showAddMarca = true;
    this.newMarcaNombre = '';
    this.cdr.detectChanges();
  }

  cancelAddMarca() {
    this.showAddMarca = false;
    this.newMarcaNombre = '';
    this.cdr.detectChanges();
  }

  guardarMarca() {
    if (!this.tiposSeleccionado) return;

    const nombre = this.newMarcaNombre.trim();
    if (!nombre) return;

    this.savingMarca = true;
    this.cdr.detectChanges();

    this.catalogs
      .createMarca(nombre, this.tiposSeleccionado)
      .pipe(
        finalize(() => {
          this.savingMarca = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (marcaCreada: any) => {
          this.catalogs.invalidateMarcas(this.tiposSeleccionado!);
          this.cdr.detectChanges();

          this.catalogs.getMarcasByTipo(this.tiposSeleccionado!).subscribe({
            next: (marcas) => {
              this.catalogos.marcas = marcas;
              this.form.id_marca = marcaCreada.id_marca;
              this.cancelAddMarca();
              this.cdr.detectChanges();
            },
            error: () => {
              this.errorCatalogs = 'Marca creada, pero error recargando marcas';
              this.cancelAddMarca();
              this.cdr.detectChanges();
            },
          });
        },
        error: (err) => {
          this.errorCatalogs = err?.error?.error || 'Error creando marca';
          this.cdr.detectChanges();
        },
      });
  }

  // =========================
  // DETALLE ITEM
  // =========================
  openDetailModal(item: any) {
    this.showDetailModal = true;
    this.loadingDetail = true;
    this.errorDetail = '';

    this.selectItem = item;
    this.cdr.detectChanges();

    this.api
      .getItemById(item.id_item)
      .pipe(
        finalize(() => {
          this.loadingDetail = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (data) => {
          this.selectItem = data;

          this.formEditar.nombre = data.nombre ?? '';
          this.formEditar.modelo = data.modelo ?? '';
          this.formEditar.descripcion = data.descripcion ?? '';
          this.formEditar.vida_util_meses = data.vida_util_meses ?? null;
          this.formEditar.condicion_fisica = data.condicion_fisica ?? 'Bueno';
          this.formEditar.id_marca = data.id_marca ?? null;
          this.formEditar.id_adquisicion = data.id_adquisicion ?? null;
          this.formEditar.id_subcategoria = data.id_subcategoria ?? null;

          this.cdr.detectChanges();
        },
        error: () => {
          this.errorDetail = 'Error cargando detalle del item';
          this.cdr.detectChanges();
        },
      });
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectItem = null;

    this.showAsignarModal = false;
    this.showMoverModal = false;
    this.showEditarModal = false;

    this.cdr.detectChanges();
  }

  // =========================
  // ASIGNAR
  // =========================
  openAsignar() {
    if (this.itemEstaAsignado) {
      this.errorDetail = 'Este item ya fue asignado. Usa "Mover".';
      this.cdr.detectChanges();
      return;
    }

    this.errorDetail = '';
    this.formAsignar = { destino_id_usuario: null, destino_id_area: null, observacion: '' };
    this.showAsignarModal = true;
    this.cdr.detectChanges();
  }

  closeAsignar() {
    this.showAsignarModal = false;
    this.cdr.detectChanges();
  }


  confirmarAsignar() {
  if (!this.selectItem?.id_item) return;

  // si ya está asignado, bloquear
  if (this.itemEstaAsignado) {
    this.errorDetail = 'Este item ya fue asignado. Usa "Mover".';
    this.cdr.detectChanges();
    return;
  }

  const area = this.formAsignar.destino_id_area;
  const user = this.formAsignar.destino_id_usuario;

  // ahora deben venir ambos
  if (area == null || user == null) {
    this.errorDetail = 'Debes seleccionar Área y Usuario para asignar.';
    this.cdr.detectChanges();
    return;
  }

  const payload = {
    destino_id_area: area,
    destino_id_usuario: user,
    observacion: this.formAsignar.observacion || null,
    id_registro_adm: 1,
  };

  this.api.asignarItem(this.selectItem.id_item, payload).subscribe({
    next: () => {
      this.successMsg = 'Asignado ✅';
      this.closeAsignar();
      this.loadItems();
      this.openDetailModal({ id_item: this.selectItem.id_item });
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.errorDetail = err?.error?.message || 'Error asignando';
      this.cdr.detectChanges();
    }
  });
}

  // =========================
  // MOVER
  // =========================
  openMover() {
    if (!this.itemEstaAsignado) {
      this.errorDetail = 'Este item aún no está asignado. Usa "Asignar".';
      this.cdr.detectChanges();
      return;
    }

    this.errorDetail = '';
    this.formMover = { destino_id_usuario: null, destino_id_area: null, observacion: '' };
    this.showMoverModal = true;
    this.cdr.detectChanges();
  }

  closeMover() {
    this.showMoverModal = false;
    this.cdr.detectChanges();
  }


  confirmarMover() {
  if (!this.selectItem?.id_item) return;

  const user = this.formMover.destino_id_usuario;
  if (user == null) {
    this.errorDetail = 'Selecciona un usuario para mover.';
    this.cdr.detectChanges();
    return;
  }

  const payload = {
    destino_id_usuario: user,
    // destino_id_area: this.formMover.destino_id_area, // opcional si quieres validación extra
    observacion: this.formMover.observacion || null,
    id_registro_adm: 1,
  };

  this.api.moverIte(this.selectItem.id_item, payload).subscribe({
    next: () => {
      this.successMsg = 'Movido ✅';
      this.closeMover();
      this.loadItems();
      this.openDetailModal({ id_item: this.selectItem.id_item });
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.errorDetail = err?.error?.message || 'Error moviendo';
      this.cdr.detectChanges();
    },
  });
}

  // =========================
  // EDITAR (placeholder)
  // =========================
  openEditar() {
    this.errorDetail = '';
    this.showEditarModal = true;
    this.cdr.detectChanges();
  }

  closeEditar() {
    this.showEditarModal = false;
    this.cdr.detectChanges();
  }

  confirmarEditar() {
    if (!this.selectItem?.id_item) return;

    this.successMsg = 'Editar (pendiente) ✅';
    this.closeEditar();
    this.cdr.detectChanges();
  }



  onAsignarUsuarioChange(idUsuario: number | null) {
  if (!idUsuario) {
    this.formAsignar.destino_id_area = null;
    this.cdr.detectChanges();
    return;
  }

  const u = this.usuarios.find(x => x.id_usuario === idUsuario);
  this.formAsignar.destino_id_area = u?.id_area ?? null;

  this.cdr.detectChanges();
}


  private getAreaIdByUsuario(idUsuario: number | null): number | null {
  if (idUsuario == null) return null;
  const u = this.usuarios.find(x => Number(x.id_usuario) === Number(idUsuario));
  return u?.id_area ?? null; // tu tabla usuario tiene id_area
}

  onMoverUsuarioChange(idUsuario: number | null) {
  // setea el área automáticamente según el usuario seleccionado
  this.formMover.destino_id_area = this.getAreaIdByUsuario(idUsuario);
  this.cdr.detectChanges();
  }
}