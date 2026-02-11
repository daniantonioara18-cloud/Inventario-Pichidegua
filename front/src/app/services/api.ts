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

  createItem(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/items`, data);
  }

  // ======================
  // CATÁLOGOS
  // ======================

  getMarcas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/catalogs/marcas`);
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
}
