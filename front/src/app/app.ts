import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';


// Servicios y componentes compartidos
import {AuthService } from './services/auth';
import{NavbarComponent} from './shared/navbar/navbar';
import{FooterComponent} from './shared/footer/footer';
import{SidebarComponent} from './shared/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [CommonModule,RouterOutlet,NavbarComponent,FooterComponent,SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly title = signal('front');

  constructor(public auth: AuthService) {}
}
