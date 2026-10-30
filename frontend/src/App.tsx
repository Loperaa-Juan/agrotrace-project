/**
 * @file Componente raíz de la aplicación. Configura el proveedor de sesión global {@link SesionProvider}
 * y el sistema de enrutamiento principal mediante {@link BrowserRouter}.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './routes/app/app-layout';
import { ExplorarPage } from './routes/app/explore';
import FilterPage from './routes/app/filter-page';
import { CatalogoMaestroPage } from './routes/app/master-catalog';
import { DetalleProductoPage } from './routes/app/product-detail';
import { DetallePedidoPage } from './routes/app/order-detail';
import { PedidosPage } from './routes/app/orders';
import { PerfilPage } from './routes/app/profile';
import { PublicarPage } from './routes/app/publish';
import { LoginPage } from './routes/auth/login';
import Landing from './routes/Landing';
import { routes } from './routes/routes';
import { SesionProvider } from './routes/session-context';

/**
 * Componente principal que define las rutas públicas y protegidas de la plataforma.
 * @component
 * @returns {JSX.Element} Estructura de rutas de la aplicación envuelta en el contexto de sesión.
 */
function App() {
  return (
    <SesionProvider>
      <BrowserRouter>
        <Routes>
          <Route path={routes.inicio} element={<Landing />} />
          <Route path={routes.login} element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path={routes.perfil} element={<PerfilPage />} />
            <Route path={routes.explorar} element={<ExplorarPage />} />
            <Route path={routes.detalle} element={<DetalleProductoPage />} />
            <Route path={routes.filtros} element={<FilterPage />} />
            <Route path={routes.pedidos} element={<PedidosPage />} />
            <Route path={routes.detallePedido} element={<DetallePedidoPage />} />
            <Route path={routes.publicar} element={<PublicarPage />} />
            <Route path={routes.catalogoMaestro} element={<CatalogoMaestroPage />} />
          </Route>
          <Route
            path={routes.registro}
            element={<Navigate replace to={`${routes.login}?modo=registro`} />}
          />
        </Routes>
      </BrowserRouter>
    </SesionProvider>
  );
}

export default App;
