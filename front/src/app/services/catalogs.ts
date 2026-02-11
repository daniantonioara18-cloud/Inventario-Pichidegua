import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ApiService } from './api';

export type Marca = { id_marca: number; nombre: string };
export type Area = { id_area: number; nombre: string };
export type Adquisicion = { id_adquisicion: number; nombre: string };
export type Subcategoria = { id_subcategoria: number; nombre: string; categoria: string };

export type Catalogos = {
  marcas: Marca[];
  areas: Area[];
  adquisiciones: Adquisicion[];
  subcategorias: Subcategoria[];
};

@Injectable({ providedIn: 'root' })
export class CatalogsService {
  // cache en memoria (1 sola carga)
  private cache$?: Observable<Catalogos>;

  constructor(private api: ApiService) {}

  getAll(): Observable<Catalogos> {
    if (!this.cache$) {
      this.cache$ = forkJoin({
        marcas: this.api.getMarcas(),
        areas: this.api.getAreas(),
        adquisiciones: this.api.getAdquisiciones(),
        subcategorias: this.api.getSubcategorias(),
      }).pipe(
        // guarda el último valor para todos los componentes
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  // si algún día quieres “refrescar” a la fuerza:
  invalidate() {
    this.cache$ = undefined;
  }
}
