import { ChangeDetectorRef, Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../services/api';
import { CatalogsService, CatalogosBase, Subcategoria } from '../services/catalogs';
import { CodigoService } from '../services/codigo.service';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './items.html',
  styleUrls: ['./items.scss'],
})
export class ItemsComponent implements OnInit {
  exporting = false;
  importando = false;

  constructor(
    private api: ApiService,
    private catalogs: CatalogsService,
    public cdr: ChangeDetectorRef,
    private http: HttpClient,
    private codigoSvc: CodigoService
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
  addingSub = false;

  errorItems = '';
  errorCatalogs = '';
  successMsg = '';

  // =========================
  // MODALES
  // =========================
  showTipoModal = false;
  tiposSeleccionado: 'TECNO' | 'MUEBLE' | null = null;

  showCreateModal = false;
  creating = false;

  showDetailModal = false;
  loadingDetail = false;
  errorDetail = '';
  selectItem: any = null;

  showAsignarModal = false;
  showMoverModal = false;
  showEditarModal = false;

  showImportModal = false;
  importPreview: any[] = [];
  importResultado: any = null;
  archivoSeleccionado: File | null = null;

  // =========================
  // QR / ETIQUETA / ESCANER
  // =========================
  mostrarEtiqueta = false;
  itemEtiqueta: any = null;
  qrUrl = '';
  @ViewChild('barcode', { static: false }) barcodeEl!: ElementRef;

  mostrarEscaner = false;
  codigoManual = '';
  itemEscaneado: any = null;
  errorEscaner = '';
  cargandoEscaner = false;
  @ViewChild('videoElement', { static: false }) videoEl!: ElementRef;
  private stream: MediaStream | null = null;

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
    custodio: null as boolean | null,
  };

  limpiarFiltros() {
    this.searchText = '';
    this.filtros = {
      activo: null,
      marca: null,
      subcategoria: null,
      adquisicion: null,
      custodio: null,
    };
    this.cdr.detectChanges();
  }

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
    activo: true as boolean,
    id_marca: null as number | null,
    id_adquisicion: null as number | null,
    id_subcategoria: null as number | null,
  };

  // =========================
  // MARCAS / SUBCATEGORIAS ACCIONES
  // =========================
  showAddMarca = false;
  newMarcaNombre = '';
  savingMarca = false;
  showAddSubcat = false;
  newSubcatNombre = '';

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

      const matchMarca = this.filtros.marca === null || Number(it.id_marca) === Number(this.filtros.marca);
      const matchSubcat = this.filtros.subcategoria === null || Number(it.id_subcategoria) === Number(this.filtros.subcategoria);
      const matchAdq = this.filtros.adquisicion === null || Number(it.id_adquisicion) === Number(this.filtros.adquisicion);
      const matchActivo = this.filtros.activo === null || !!it.activo === this.filtros.activo;
      
      const matchCustodio = this.filtros.custodio === null || (
        this.filtros.custodio === true 
          ? (it.id_user_actual !== null && it.id_user_actual !== undefined)
          : (it.id_user_actual === null || it.id_user_actual === undefined)
      );

      return matchTexto && matchMarca && matchSubcat && matchAdq && matchActivo && matchCustodio;
    });
  }

  get subcategoriasFiltradas() {
    if (!this.tiposSeleccionado) return this.catalogos.subcategorias;
    const categoriaEsperada = this.tiposSeleccionado === 'TECNO' ? 'Tecnología' : 'Mobiliario';
    return this.catalogos.subcategorias.filter((sc: Subcategoria) => sc.categoria === categoriaEsperada);
  }

  get itemEstaAsignado(): boolean {
    return !!(this.selectItem?.id_user_actual && this.selectItem?.id_area_actual);
  }

  get itemSinAsignacion(): boolean {
    return !this.selectItem?.id_area_actual || !this.selectItem?.id_user_actual;
  }
  
   get publicUrl(): string {
    return this.itemEtiqueta ? `muni.cl/ficha/${this.itemEtiqueta.uuid_qr}` : '';
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
  // EXPORTAR EXCEL
  // =========================
  exportarExcel() {
    this.exporting = true;
    this.cdr.detectChanges();

    this.http.get('/api/items/export', { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fecha = new Date().toISOString().split('T')[0];
        a.download = `Inventario_Pichidegua_${fecha}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.exporting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error descargando Excel:', err);
        alert('Error al exportar el inventario');
        this.exporting = false;
        this.cdr.detectChanges();
      }
    });
  }

  // =========================
  // IMPORTAR EXCEL
  // =========================
  openImportModal() {
    this.showImportModal = true;
    this.importPreview = [];
    this.importResultado = null;
    this.archivoSeleccionado = null;
    this.errorItems = '';
    this.cdr.detectChanges();
  }

  closeImportModal() {
    this.showImportModal = false;
    this.importPreview = [];
    this.importResultado = null;
    this.archivoSeleccionado = null;
    this.cdr.detectChanges();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.archivoSeleccionado = file;
    this.importando = true;
    this.importPreview = [];
    this.importResultado = null;
    this.errorItems = '';
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('file', file);

    this.http.post('/api/items/import-preview', formData).subscribe({
      next: (resp: any) => {
        this.importPreview = resp.preview || [];
        this.importando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorItems = err?.error?.message || 'Error leyendo archivo';
        this.importando = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmarImport() {
    if (!this.archivoSeleccionado) return;
    this.importando = true;
    this.cdr.detectChanges();

    const formData = new FormData();
    formData.append('file', this.archivoSeleccionado);

    this.http.post('/api/items/import', formData).subscribe({
      next: (resp: any) => {
        this.importResultado = resp;
        this.importando = false;
        this.importPreview = [];
        this.loadItems();
        this.cdr.detectChanges();
        if (resp.fallidos === 0) {
          setTimeout(() => this.closeImportModal(), 2000);
        }
      },
      error: (err: any) => {
        this.errorItems = err?.error?.message || 'Error importando el archivo';
        this.importando = false;
        this.cdr.detectChanges();
      }
    });
  }

  descargarPlantilla() {
    this.http.get('/api/items/plantilla', { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Plantilla_Inventario_Pichidegua.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error descargando plantilla:', err);
        alert('Error al descargar plantilla');
      }
    });
  }

  // =========================
  // CARGAS
  // =========================
  loadItems() {
    this.loadingItems = true;
    this.errorItems = '';
    this.cdr.detectChanges();

    this.api.getItems()
      .pipe(finalize(() => { this.loadingItems = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (data) => { this.items = data; this.cdr.detectChanges(); },
        error: () => { this.errorItems = 'Error cargando items'; this.cdr.detectChanges(); }
      });
  }

  loadCatalogsOnce() {
    this.loadingCatalogs = true;
    this.errorCatalogs = '';
    this.cdr.detectChanges();

    this.catalogs.getAllBase()
      .pipe(finalize(() => { this.loadingCatalogs = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (c) => {
          this.catalogos.areas = c.areas;
          this.catalogos.adquisiciones = c.adquisiciones;
          this.catalogos.subcategorias = c.subcategorias;
          this.cdr.detectChanges();
        },
        error: () => { this.errorCatalogs = 'Error cargando catálogos'; this.cdr.detectChanges(); }
      });
  }

  loadUsuarios() {
    this.api.getUsuarios().subscribe({
      next: (data) => { this.usuarios = data; this.cdr.detectChanges(); },
      error: () => { this.errorCatalogs = 'Error cargando usuarios'; this.cdr.detectChanges(); }
    });
  }

  // =========================
  // MODALES CREACIÓN
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
    this.form.id_marca = null;
    this.form.id_subcategoria = null;
    this.loadingCatalogs = true;
    this.cdr.detectChanges();

    this.catalogs.getMarcasByTipo(tipo)
      .pipe(finalize(() => { this.loadingCatalogs = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (marcas) => {
          this.catalogos.marcas = marcas;
          this.showCreateModal = true;
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorCatalogs = 'Error cargando marcas';
          this.showCreateModal = true;
          this.cdr.detectChanges();
        }
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
  // CREAR ITEM / SUBCAT / MARCA
  // =========================
  create() {
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

    this.api.createItem(payload)
      .pipe(finalize(() => { this.creating = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (resp: any) => {
          if (resp?.item) this.items.unshift(resp.item);
          this.successMsg = 'Item creado ✅';
          this.closeCreateModal();
          this.loadItems();
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorItems = err?.error?.message || 'Error creando item';
          this.cdr.detectChanges();
        }
      });
  }

  openAddSubcat() {
    this.showAddSubcat = true;
    this.newSubcatNombre = '';
    this.cdr.detectChanges();
  }

  cancelAddSubcat() {
    this.showAddSubcat = false;
    this.newSubcatNombre = '';
    this.cdr.detectChanges();
  }

  guardarSubcategoriaRapida() {
    if (!this.tiposSeleccionado || !this.newSubcatNombre.trim()) return;

    const idCat = this.tiposSeleccionado === 'TECNO' ? 7 : 8;
    this.addingSub = true;
    this.cdr.detectChanges();

    this.catalogs.createSubcategoria(this.newSubcatNombre.trim(), idCat).subscribe({
      next: (res) => {
        this.successMsg = 'Subcategoría añadida';
        this.catalogs.invalidateBase();
        this.loadCatalogsOnce();
        this.cancelAddSubcat();
        setTimeout(() => {
          this.form.id_subcategoria = res.id_subcategoria;
          this.cdr.detectChanges();
        }, 600);
      },
      error: (err) => {
        this.errorItems = err.error?.error || 'Error al crear subcategoría';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.addingSub = false;
        this.cdr.detectChanges();
      }
    });
  }

  openAddMarca() { this.showAddMarca = true; this.newMarcaNombre = ''; this.cdr.detectChanges(); }
  cancelAddMarca() { this.showAddMarca = false; this.newMarcaNombre = ''; this.cdr.detectChanges(); }

  guardarMarca() {
    if (!this.tiposSeleccionado || !this.newMarcaNombre.trim()) return;
    this.savingMarca = true;
    this.cdr.detectChanges();

    this.catalogs.createMarca(this.newMarcaNombre.trim(), this.tiposSeleccionado)
      .pipe(finalize(() => { this.savingMarca = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (marcaCreada: any) => {
          this.catalogs.invalidateMarcas(this.tiposSeleccionado!);
          this.catalogs.getMarcasByTipo(this.tiposSeleccionado!).subscribe(marcas => {
            this.catalogos.marcas = marcas;
            this.form.id_marca = marcaCreada.id_marca;
            this.cancelAddMarca();
            this.cdr.detectChanges();
          });
        }
      });
  }

  // =========================
  // DETALLE & ACCIONES
  // =========================
  openDetailModal(item: any) {
    this.showDetailModal = true;
    this.loadingDetail = true;
    this.errorDetail = '';
    this.selectItem = item;
    this.cdr.detectChanges();

    this.api.getItemById(item.id_item)
      .pipe(finalize(() => { this.loadingDetail = false; this.cdr.detectChanges(); }))
      .subscribe({
        next: (data) => {
          this.selectItem = data;
          this.formEditar = {
            nombre: data.nombre ?? '',
            modelo: data.modelo ?? '',
            descripcion: data.descripcion ?? '',
            vida_util_meses: data.vida_util_meses ?? null,
            condicion_fisica: data.condicion_fisica ?? 'Bueno',
            activo: data.activo ?? true,
            id_marca: data.id_marca ?? null,
            id_adquisicion: data.id_adquisicion ?? null,
            id_subcategoria: data.id_subcategoria ?? null,
          };
          this.cdr.detectChanges();
        },
        error: () => { this.errorDetail = 'Error cargando detalle'; this.cdr.detectChanges(); }
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

  openAsignar() {
    if (this.itemEstaAsignado) return;
    this.formAsignar = { destino_id_usuario: null, destino_id_area: null, observacion: '' };
    this.showAsignarModal = true;
    this.cdr.detectChanges();
  }
  closeAsignar() { this.showAsignarModal = false; this.cdr.detectChanges(); }

  confirmarAsignar() {
    if (!this.selectItem?.id_item || !this.formAsignar.destino_id_area || !this.formAsignar.destino_id_usuario) return;
    this.api.asignarItem(this.selectItem.id_item, { ...this.formAsignar, id_registro_adm: 1 }).subscribe({
      next: () => { this.loadItems(); this.openDetailModal({ id_item: this.selectItem.id_item }); this.closeAsignar(); },
      error: (err) => { this.errorDetail = err?.error?.message || 'Error asignando'; this.cdr.detectChanges(); }
    });
  }

  openMover() {
    if (!this.itemEstaAsignado) return;
    this.formMover = { destino_id_usuario: null, destino_id_area: null, observacion: '' };
    this.showMoverModal = true;
    this.cdr.detectChanges();
  }
  closeMover() { this.showMoverModal = false; this.cdr.detectChanges(); }

  confirmarMover() {
    if (!this.selectItem?.id_item || !this.formMover.destino_id_usuario) return;
    this.api.moverIte(this.selectItem.id_item, { ...this.formMover, id_registro_adm: 1 }).subscribe({
      next: () => { this.loadItems(); this.openDetailModal({ id_item: this.selectItem.id_item }); this.closeMover(); },
      error: (err) => { this.errorDetail = err?.error?.message || 'Error moviendo'; this.cdr.detectChanges(); }
    });
  }

  openEditar() { this.showEditarModal = true; this.cdr.detectChanges(); }
  closeEditar() { this.showEditarModal = false; this.cdr.detectChanges(); }

  confirmarEditar() {
    if (!this.selectItem?.id_item) return;
    this.api.updateItem(this.selectItem.id_item, this.formEditar).subscribe({
      next: (updated) => {
        this.successMsg = 'Actualizado ✅';
        this.selectItem = updated;
        this.loadItems();
        this.closeEditar();
        this.cdr.detectChanges();
      },
      error: (err) => { this.errorDetail = err?.error?.message || 'Error actualizando'; this.cdr.detectChanges(); }
    });
  }

  // =========================
  // EVENTOS SELECTS
  // =========================
  onAsignarUsuarioChange(idUsuario: number | null) {
    if (!idUsuario) { this.formAsignar.destino_id_area = null; return; }
    const u = this.usuarios.find(x => x.id_usuario === idUsuario);
    this.formAsignar.destino_id_area = u?.id_area ?? null;
    this.cdr.detectChanges();
  }

  onMoverUsuarioChange(idUsuario: number | null) {
    if (!idUsuario) { this.formMover.destino_id_area = null; return; }
    const u = this.usuarios.find(x => x.id_usuario === idUsuario);
    this.formMover.destino_id_area = u?.id_area ?? null;
    this.cdr.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════════
  // QR / ETIQUETA
  // ═══════════════════════════════════════════════════════════════

  abrirEtiqueta(id_item: number) {
    this.mostrarEtiqueta = true;
    this.itemEtiqueta = null;
    this.qrUrl = '';
    this.cdr.detectChanges();

    this.codigoSvc.obtenerEtiqueta(id_item).subscribe({
      next: async (data) => {
        this.itemEtiqueta = data;
        this.cdr.detectChanges();

        setTimeout(() => {
          if (this.barcodeEl?.nativeElement) {
            JsBarcode(this.barcodeEl.nativeElement, data.codigo_interno, {
              format: 'CODE128',
              lineColor: '#000000',
              width: 2,
              height: 50,
              displayValue: true,
              fontSize: 11,
              font: 'Arial',
              textMargin: 3
            });
          }
        }, 100);

        const payload = this.codigoSvc.construirPayloadQR(data);
        this.qrUrl = await this.codigoSvc.generarQR(payload, 130);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorItems = 'Error cargando etiqueta';
        this.cdr.detectChanges();
      }
    });
  }

  cerrarEtiqueta() {
    this.mostrarEtiqueta = false;
    this.itemEtiqueta = null;
    this.qrUrl = '';
    this.cdr.detectChanges();
  }

  imprimirEtiqueta() {
  if (!this.itemEtiqueta) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '80mm';
  iframe.style.height = '50mm';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  const logoUrl = window.location.origin + '/assets/image/Pichidegua_Verde.png';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { 
          size: 80mm 50mm; 
          margin: 0; 
        }
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        html, body { 
          width: 80mm; 
          height: 50mm; 
          overflow: hidden;
          font-family: Arial, sans-serif; 
          background: white;
        }
        .etiqueta {
          width: 80mm;
          height: 50mm;
          padding: 1.5mm 2mm;
          border: 0.5px solid #000;
          display: flex;
          flex-direction: column;
        }
        .logo { 
          text-align: center; 
          height: 8mm;
          margin-bottom: 1mm;
        }
        .logo img {
          height: 8mm;
          width: auto;
          object-fit: contain;
        }
        .qr-box { 
          text-align: center; 
          height: 20mm;
          margin-bottom: 1mm;
        }
        .qr-box img { 
          width: 18mm; 
          height: 18mm; 
          display: block;
          margin: 0 auto;
        }
        .datos { 
          font-size: 7px; 
          line-height: 1.2;
          flex: 1;
        }
        .fila { 
          display: flex; 
          justify-content: space-between; 
          border-bottom: 0.3px dotted #bbb; 
          padding: 0.8mm 0; 
        }
        .label { 
          font-weight: bold; 
          font-size: 6.5px;
        }
        .valor { 
          text-align: right; 
          max-width: 65%;
          font-size: 6.5px;
        }
        .codigo { 
          color: #059669; 
          font-weight: bold; 
          font-size: 8px;
        }
        .uuid { 
          font-size: 4.5px; 
          color: #999; 
          text-align: center; 
          margin-top: 1mm;
          word-break: break-all;
          line-height: 1;
        }
      </style>
    </head>
    <body>
      <div class="etiqueta">
        <div class="logo">
          <img src="${logoUrl}" alt="Municipalidad de Pichidegua" />
        </div>
        
        <div class="qr-box">
          <img src="${this.qrUrl}" alt="QR" />
        </div>
        
        <div class="datos">
          <div class="fila">
            <span class="label">CÓDIGO:</span>
            <span class="valor codigo">${this.itemEtiqueta.codigo_interno}</span>
          </div>
          <div class="fila">
            <span class="label">BIEN:</span>
            <span class="valor">${this.itemEtiqueta.nombre}</span>
          </div>
          <div class="fila">
            <span class="label">CAT:</span>
            <span class="valor">${this.itemEtiqueta.categoria}</span>
          </div>
          <div class="fila">
            <span class="label">EST:</span>
            <span class="valor">${this.itemEtiqueta.condicion_fisica}</span>
          </div>
        </div>
        
        <div class="uuid">${this.itemEtiqueta.uuid_qr}</div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              try {
                window.parent.document.body.removeChild(window.frameElement);
              } catch(e) {}
            }, 500);
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  doc.close();
}
  descargarQR() {
    if (!this.qrUrl) return;
    const link = document.createElement('a');
    link.download = `qr-${this.itemEtiqueta?.codigo_interno || 'item'}.png`;
    link.href = this.qrUrl;
    link.click();
  }

  // ═══════════════════════════════════════════════════════════════
  // ESCANER
  // ═══════════════════════════════════════════════════════════════

  abrirEscaner() {
    this.mostrarEscaner = true;
    this.codigoManual = '';
    this.itemEscaneado = null;
    this.errorEscaner = '';
    this.cargandoEscaner = false;
    this.cdr.detectChanges();
    this.iniciarCamara();
  }

  cerrarEscaner() {
    this.mostrarEscaner = false;
    this.detenerCamara();
    this.cdr.detectChanges();
  }

  private async iniciarCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setTimeout(() => {
        if (this.videoEl?.nativeElement && this.stream) {
          this.videoEl.nativeElement.srcObject = this.stream;
          this.videoEl.nativeElement.play();
        }
      }, 300);
    } catch (err) {
      this.errorEscaner = 'No se pudo acceder a la cámara. Usa el ingreso manual.';
      this.cdr.detectChanges();
    }
  }

  private detenerCamara() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  buscarManual() {
    if (!this.codigoManual.trim()) return;
    this.cargandoEscaner = true;
    this.errorEscaner = '';
    this.itemEscaneado = null;
    this.cdr.detectChanges();

    this.codigoSvc.escanearCodigo(this.codigoManual.trim()).subscribe({
      next: (item) => {
        this.itemEscaneado = item;
        this.cargandoEscaner = false;
        this.detenerCamara();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorEscaner = 'Item no encontrado. Verifica el código.';
        this.cargandoEscaner = false;
        this.cdr.detectChanges();
      }
    });
  }

  verItemEscaneado() {
    this.mostrarEscaner = false;
    const item = this.itemEscaneado;
    this.itemEscaneado = null;
    this.detenerCamara();
    this.cdr.detectChanges();
    if (item?.id_item) {
      this.openDetailModal(item);
    }
  }
}