import { Routes } from '@angular/router';
import { ItemsComponent } from './items/items';

export const routes: Routes = [
    { path: '', redirectTo: 'items', pathMatch: 'full' },
    { path: 'items', component: ItemsComponent },
     // placeholders: después creamos componentes reales
    { path: 'movimientos', component: ItemsComponent },
    { path: 'usuarios', component: ItemsComponent },
    {path: '**', redirectTo: 'items' },
];
