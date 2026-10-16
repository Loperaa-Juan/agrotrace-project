import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './routes/app/app-layout';
import { ExplorarPage } from './routes/app/explorar';
import FilterPage from './routes/app/filter-page';
import { PedidosPage } from './routes/app/pedidos';
import { PerfilPage } from './routes/app/perfil';
import { PublicarPage } from './routes/app/publicar';
import { LoginPage } from './routes/auth/login';
import Landing from './routes/Landing';
import { routes } from './routes/routes';
import { SesionProvider } from './routes/session-context';

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
            <Route path={routes.filtros} element={<FilterPage />} />
            <Route path={routes.pedidos} element={<PedidosPage />} />
            <Route path={routes.publicar} element={<PublicarPage />} />
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
