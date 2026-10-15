import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../../src/App';
import { respuestaFetch, SESION } from '../auth/utils';

function iniciarSesion() {
  localStorage.setItem('accessToken', SESION.accessToken);
  localStorage.setItem('refreshToken', SESION.refreshToken);
  localStorage.setItem('usuario', JSON.stringify(SESION.user));
}

/** Abre la aplicación completa en la ruta indicada. */
function renderEn(ruta: string) {
  window.history.pushState({}, '', ruta);
  render(<App />);
}

function botonUsuario() {
  return screen.getByRole('button', { name: /juan pérez/i });
}

function abrirMenu() {
  fireEvent.click(botonUsuario());
  return within(screen.getByRole('navigation', { name: 'Menú de usuario' }));
}

describe('Menú de la aplicación', () => {
  beforeEach(() => {
    // Las páginas se quedan cargando; solo responde el logout
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/auth/logout')
          ? respuestaFetch(200, { message: 'Logged out successfully' })
          : new Promise(() => {}),
      ),
    );
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('con sesión muestra al usuario en la cabecera con el menú cerrado', () => {
    // Arrange
    iniciarSesion();

    // Act
    renderEn('/perfil');

    // Assert
    expect(within(screen.getByRole('banner')).getByRole('button', { name: /juan pérez/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('navigation', { name: 'Menú de usuario' })).toBeNull();
  });

  it('el menú tiene explorar cosechas, mi perfil, mis pedidos y cerrar sesión', () => {
    // Arrange
    iniciarSesion();
    renderEn('/perfil');

    // Act
    const menu = abrirMenu();

    // Assert
    expect(botonUsuario()).toHaveAttribute('aria-expanded', 'true');
    expect(menu.getByRole('link', { name: 'Explorar cosechas' })).toHaveAttribute('href', '/explorar');
    expect(menu.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/perfil');
    expect(menu.getByRole('link', { name: 'Mis pedidos' })).toHaveAttribute('href', '/pedidos');
    expect(menu.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(menu.getAllByRole('link')).toHaveLength(3);
    expect(menu.getAllByRole('button')).toHaveLength(1);
  });

  it('explorar cosechas navega, cierra el menú y conserva la cabecera', async () => {
    // Arrange
    iniciarSesion();
    renderEn('/perfil');
    const cabecera = screen.getByRole('banner');
    const menu = abrirMenu();

    // Act
    fireEvent.click(menu.getByRole('link', { name: 'Explorar cosechas' }));

    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: /cosechas/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menú de usuario' })).toBeNull();
    expect(screen.getByRole('banner')).toBe(cabecera);
  });

  it('las opciones siguen el orden del prototipo', () => {
    // Arrange
    iniciarSesion();
    renderEn('/perfil');

    // Act
    const menu = abrirMenu();

    // Assert
    expect(menu.getAllByRole('link').map((enlace) => enlace.textContent?.trim())).toEqual([
      expect.stringContaining('Explorar cosechas'),
      expect.stringContaining('Mi perfil'),
      expect.stringContaining('Mis pedidos'),
    ]);
  });

  it('mi perfil navega a su perfil y cierra el menú', async () => {
    // Arrange
    iniciarSesion();
    renderEn('/explorar');
    const menu = abrirMenu();

    // Act
    fireEvent.click(menu.getByRole('link', { name: 'Mi perfil' }));

    // Assert
    expect(await screen.findByText('Cargando tu perfil…')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/perfil');
    expect(screen.queryByRole('navigation', { name: 'Menú de usuario' })).toBeNull();
  });

  it('mis pedidos navega a sus pedidos y cierra el menú', async () => {
    // Arrange
    iniciarSesion();
    renderEn('/perfil');
    const menu = abrirMenu();

    // Act
    fireEvent.click(menu.getByRole('link', { name: 'Mis pedidos' }));

    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Mis pedidos' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menú de usuario' })).toBeNull();
  });

  it('cerrar sesión desde el menú lleva al login', async () => {
    // Arrange
    iniciarSesion();
    renderEn('/perfil');
    const menu = abrirMenu();

    // Act
    fireEvent.click(menu.getByRole('button', { name: 'Cerrar sesión' }));

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  it('cierra el menú con Escape', () => {
    // Arrange
    iniciarSesion();
    renderEn('/perfil');
    abrirMenu();

    // Act
    fireEvent.keyDown(document, { key: 'Escape' });

    // Assert
    expect(screen.queryByRole('navigation', { name: 'Menú de usuario' })).toBeNull();
    expect(botonUsuario()).toHaveAttribute('aria-expanded', 'false');
  });

  it('cierra el menú al hacer clic fuera de él', () => {
    // Arrange
    iniciarSesion();
    renderEn('/perfil');
    abrirMenu();

    // Act
    fireEvent.mouseDown(screen.getByRole('main'));

    // Assert
    expect(screen.queryByRole('navigation', { name: 'Menú de usuario' })).toBeNull();
  });

  it('cerrar sesión solo está dentro del menú', () => {
    // Arrange
    iniciarSesion();

    // Act
    renderEn('/perfil');

    // Assert
    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).toBeNull();
  });

  it('sin sesión no muestra el menú de usuario', () => {
    // Arrange
    const ruta = '/explorar';

    // Act
    renderEn(ruta);

    // Assert
    expect(within(screen.getByRole('banner')).queryByRole('button')).toBeNull();
  });

  it('las páginas no repiten su propia cabecera', () => {
    // Arrange
    iniciarSesion();

    // Act
    renderEn('/explorar');

    // Assert
    expect(screen.getAllByRole('banner')).toHaveLength(1);
  });
});
