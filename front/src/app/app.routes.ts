import { Routes } from '@angular/router';
import { ItemsComponent } from './items/items';
import { MovimientosComponent } from './movimientos/movimientos';
import { UsuariosComponent } from './usuarios/usuarios';

export const routes: Routes = [
    { path: '', redirectTo: 'items', pathMatch: 'full' },
    { path: 'items', component: ItemsComponent },
     // placeholders: después creamos componentes reales
    { path: 'movimientos', component: MovimientosComponent },
    { path: 'usuarios', component: UsuariosComponent },
    {path: '**', redirectTo: 'items' },
];
