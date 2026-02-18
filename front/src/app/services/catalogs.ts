import { Injectable } from '@angular/core';
import { forkJoin, Observable,of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ApiService } from './api';

export type Marca = { id_marca: number; nombre: string; tipo?: 'TECNO' | 'MUEBLE' };
export type Area = { id_area: number; nombre: string };
export type Adquisicion = { id_adquisicion: number; nombre: string };
export type Subcategoria = { id_subcategoria: number; nombre: string; categoria: string };

export type CatalogosBase = {
  marcas: Marca[];
  areas: Area[];
  adquisiciones: Adquisicion[];
  subcategorias: Subcategoria[];
};

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  // cache base (no depende de tipo)
  private cacheBase$?: Observable<CatalogosBase>;

  // cache marcas por tipo
  private marcasCache: Partial<Record<'TECNO' | 'MUEBLE', Observable<Marca[]>>> = {};

  constructor(private api: ApiService) {}

  // ✅ Base: se carga 1 vez y listo
  getAllBase(): Observable<CatalogosBase> {
    if (!this.cacheBase$) {
      this.cacheBase$ = forkJoin({
        marcas: of([] as Marca[]), // <-- no cargamos marcas aquí porque dependen del tipo, se cargan en getMarcasByTipo
        areas: this.api.getAreas(),
        adquisiciones: this.api.getAdquisiciones(),
        subcategorias: this.api.getSubcategorias(),
      }).pipe(shareReplay(1));
    }
    return this.cacheBase$;
  }

  // ✅ Marcas por tipo (con cache por tipo)
  getMarcasByTipo(tipo: 'TECNO' | 'MUEBLE'): Observable<Marca[]> {
    if (!this.marcasCache[tipo]) {
      this.marcasCache[tipo] = this.api.getMarcas(tipo).pipe(shareReplay(1));
    }
    return this.marcasCache[tipo]!;
  }

  // ✅ Crear marca y “romper” el cache de ese tipo para recargar
  createMarca(nombre: string, tipo: 'TECNO' | 'MUEBLE') {
    return this.api.createMarca(nombre, tipo);
  }

  invalidateBase() {
    this.cacheBase$ = undefined;
  }

  invalidateMarcas(tipo?: 'TECNO' | 'MUEBLE') {
    if (!tipo) {
      this.marcasCache = {};
      return;
    }
    delete this.marcasCache[tipo];
  }
}
