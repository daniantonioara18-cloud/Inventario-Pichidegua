import { Routes } from '@angular/router';
import { ItemsComponent } from './items/items';
import { LoginComponent } from './login/login';
import { authGuard } from './guards/auth.guard'; 

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },


    { path: 'items', component: ItemsComponent, canActivate: [authGuard] },
    { path: 'movimientos', component: ItemsComponent, canActivate: [authGuard] },
    { path: 'usuarios', component: ItemsComponent, canActivate: [authGuard] },
     // placeholders: después creamos componentes reales
    {path: '**', redirectTo: 'login' },
];
