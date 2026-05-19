import { Injectable, inject, signal, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private ngZone = inject(NgZone);
resetTimer(): void {
  if (this.isLoggedIn()) {
    this.startExpirationTimer();
  }
}

  private readonly API_URL = 'http://localhost:3001/api/auth';
  private readonly EXPIRATION_MINUTES = 10;
  private timeout: any;
  
  isAuthenticated = signal<boolean>(!!localStorage.getItem('auth_token'));

  /**
   * Este es el método que soluciona el error. 
   * AHORA DEVUELVE Observable Y TIENE UN RETURN.
   */
  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/login`, { username, password }).pipe(
      tap(res => {
        if (res && res.token) {
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('user_data', JSON.stringify(res.user));
          localStorage.setItem('loginTime', Date.now().toString());
          this.isAuthenticated.set(true);
          this.startExpirationTimer();
        }
      })
    );
  }

  private startExpirationTimer(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.ngZone.run(() => this.logout());
    }, this.EXPIRATION_MINUTES * 60 * 1000);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('auth_token');
    const loginTime = localStorage.getItem('loginTime');
    if (!token || !loginTime) return false;

    const elapsed = Date.now() - Number(loginTime);
    if (elapsed > this.EXPIRATION_MINUTES * 60 * 1000) {
      this.logout();
      return false;
    }
    return true;
  }

  logout(): void {
    if (this.timeout) clearTimeout(this.timeout);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('loginTime');
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}