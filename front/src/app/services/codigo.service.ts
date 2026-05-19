import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Observable } from 'rxjs';

export interface ItemEtiqueta {
  id_item: number;
  codigo_interno: string;
  nombre: string;
  modelo: string | null;
  condicion_fisica: string;
  uuid_qr: string;
  categoria: string;
  subcategoria: string;
}

@Injectable({ providedIn: 'root' })
export class CodigoService {
  private api = 'http://localhost:3001/api';
  // URL pública para el QR (cambiá por tu dominio real en producción)
  private publicUrl = 'http://localhost:4200/ficha';

  constructor(private http: HttpClient) {}

  obtenerEtiqueta(id: number): Observable<ItemEtiqueta> {
    return this.http.get<ItemEtiqueta>(`${this.api}/items/${id}/etiqueta`);
  }

  escanearCodigo(valor: string): Observable<any> {
    return this.http.get(`${this.api}/items/scan/${encodeURIComponent(valor)}`);
  }

  async generarQR(valor: string, width = 180): Promise<string> {
    return QRCode.toDataURL(valor, {
      width,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a1a', light: '#ffffff' }
    });
  }

  generarBarra(valor: string, elemento: HTMLElement | SVGSVGElement): void {
    JsBarcode(elemento, valor, {
      format: 'CODE128',
      lineColor: '#000000',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 12,
      font: 'Arial',
      textMargin: 4
    });
  }

  // QR con URL directa al sistema
  construirPayloadQR(item: ItemEtiqueta): string {
    // Opción A: URL directa (recomendado para escaneo con celular)
    return `${this.publicUrl}/${item.uuid_qr}`;
    
    // Opción B: JSON (si querés mantener compatibilidad con tu escáner interno)
    // return JSON.stringify({
    //   c: item.codigo_interno,
    //   u: item.uuid_qr,
    //   b: item.nombre
    // });
  }
}