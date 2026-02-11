import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import{NavbarComponent} from './shared/navbar/navbar';
import{FooterComponent} from './shared/footer/footer';
import{SidebarComponent} from './shared/sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NavbarComponent,FooterComponent,SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  protected readonly title = signal('front');
}
