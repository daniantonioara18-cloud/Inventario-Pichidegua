import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubcategoriaService {
  // Usamos la ruta que confirmaste
  private apiUrl = 'http://localhost:3001/api/catalogs/subcategorias';

  constructor(private http: HttpClient) { }

  // Para listar en el select
  getSubcategorias(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Para el botón de "Agregar"
  crearSubcategoria(nombre: string, id_categoria: number): Observable<any> {
    return this.http.post(this.apiUrl, { nombre, id_categoria });
  }
}
