import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
