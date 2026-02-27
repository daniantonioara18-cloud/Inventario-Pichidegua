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

  getItems(){
    return this.http.get<any[]>(`${this.baseUrl}/items`);
  }

  updateItem(id: number, data: any): Observable<any> {
  return this.http.put(`${this.baseUrl}/items/${id}`, data);
}

  getItemById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/items/${id}`);
  }

  createItem(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/items`, data);
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


  asignarItem(id:number,data:any){
    return this.http.post(`${this.baseUrl}/items/${id}/asignar`, data);
  }

  moverIte(id:number,data:any){
    return this.http.post(`${this.baseUrl}/items/${id}/mover`, data);
  }

getMovimientos(params?: { q?: string; tipo?: string; limit?: number; offset?: number }) {
  const q = params?.q ? `q=${encodeURIComponent(params.q)}` : '';
  const tipo = params?.tipo ? `tipo=${encodeURIComponent(params.tipo)}` : '';
  const limit = params?.limit != null ? `limit=${params.limit}` : '';
  const offset = params?.offset != null ? `offset=${params.offset}` : '';

  const query = [q, tipo, limit, offset].filter(Boolean).join('&');
  return this.http.get<any[]>(`${this.baseUrl}/movimientos${query ? '?' + query : ''}`);
}


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



}
