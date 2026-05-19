import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = '/api'; // proxy Angular

  constructor(private http: HttpClient) {}

  // ======================
  // ITEMS
  // ======================

  getItems() {
    return this.http.get<any[]>(`${this.baseUrl}/items`);
  }

  getItemById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/items/${id}`);
  }

  createItem(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/items`, data);
  }

  updateItem(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/items/${id}`, data);
  }

  asignarItem(id: number, data: any) {
    return this.http.post(`${this.baseUrl}/items/${id}/asignar`, data);
  }

  moverIte(id: number, data: any) {
    return this.http.post(`${this.baseUrl}/items/${id}/mover`, data);
  }

  // ======================
  // IMPORTAR / EXPORTAR EXCEL
  // ======================

  /** Exporta todo el inventario a Excel */
  exportarExcel(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/items/export`, { responseType: 'blob' });
  }

  /** Descarga plantilla vacía */
  descargarPlantilla(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/items/plantilla`, { responseType: 'blob' });
  }

  /** Previsualiza archivo Excel antes de importar */
  importarPreview(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/items/import-preview`, formData);
  }

  /** Importa items desde array de datos (después de preview) */
  importarItems(items: any[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/items/import`, { items });
  }

  // ======================
  // CATÁLOGOS
  // ======================

  getMarcas(tipo?: 'TECNO' | 'MUEBLE'): Observable<any[]> {
    const q = tipo ? `?tipo=${tipo}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/catalogs/marcas${q}`);
  }

  getSubcategorias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/catalogs/subcategorias`);
  }

  getAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/catalogs/areas`);
  }

  getAdquisiciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/catalogs/adquisiciones`);
  }

  createMarca(nombre: string, tipo: 'TECNO' | 'MUEBLE'): Observable<any> {
    return this.http.post(`${this.baseUrl}/catalogs/marcas`, { nombre, tipo });
  }

  /** ✅ NUEVO: Crear subcategoría para el inventario de la muni */
  createSubcategoria(nombre: string, id_categoria: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/catalogs/subcategorias`, { nombre, id_categoria });
  }

  // ======================
  // USUARIOS
  // ======================

  getUsuarios() {
    return this.http.get<any[]>(`${this.baseUrl}/usuarios`);
  }

  createUsuario(data: any) {
    return this.http.post(`${this.baseUrl}/usuarios`, data);
  }

  updateUsuario(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/usuarios/${id}`, data);
  }

  deleteUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/usuarios/${id}`);
  }

  // ======================
  // MOVIMIENTOS
  // ======================

  getMovimientos(params?: { q?: string; tipo?: string; limit?: number; offset?: number }) {
    const q = params?.q ? `q=${encodeURIComponent(params.q)}` : '';
    const tipo = params?.tipo ? `tipo=${encodeURIComponent(params.tipo)}` : '';
    const limit = params?.limit != null ? `limit=${params.limit}` : '';
    const offset = params?.offset != null ? `offset=${params.offset}` : '';

    const query = [q, tipo, limit, offset].filter(Boolean).join('&');
    return this.http.get<any[]>(`${this.baseUrl}/movimientos${query ? '?' + query : ''}`);
  }
}