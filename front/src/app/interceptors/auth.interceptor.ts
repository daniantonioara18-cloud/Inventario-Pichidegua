import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Buscamos el token en el almacenamiento local
  const token = localStorage.getItem('token');
  
  // Si existe el token, clonamos la petición y le pegamos la cabecera "Authorization"
  if (token) {
    const peticionClonada = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(peticionClonada); // Enviamos la petición modificada
  }
  
  // Si no hay token (ej: cuando recién se está logueando), se envía normal
  return next(req);
};