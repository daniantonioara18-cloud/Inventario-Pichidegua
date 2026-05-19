import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-session-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="visible">
      <div class="modal-content">
        <div class="modal-icon">⏱️</div>
        <h2>Sesión expirada</h2>
        <p>Tu sesión ha expirado por inactividad de 10 minutos.</p>
        <p class="subtext">Por seguridad, debes iniciar sesión nuevamente.</p>
        <button (click)="onLoginAgain()">Iniciar sesión</button>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    }
    
    .modal-content {
      background: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
    }
    
    .modal-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    
    h2 {
      color: #1f2937;
      margin: 0 0 12px 0;
      font-size: 24px;
    }
    
    p {
      color: #6b7280;
      margin: 0 0 8px 0;
      font-size: 16px;
      line-height: 1.5;
    }
    
    .subtext {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 24px;
    }
    
    button {
      background: #059669;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    button:hover {
      background: #047857;
      transform: translateY(-1px);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class SessionModalComponent {
  visible = false;
  
  @Output() loginAgain = new EventEmitter<void>();

  show() {
    this.visible = true;
  }

  hide() {
    this.visible = false;
  }

  onLoginAgain() {
    this.hide();
    this.loginAgain.emit();
  }
}