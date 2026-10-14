import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import Landing from '../../src/routes/Landing';

describe('Landing page', () => {
  it('muestra el logo de AgroTrace en el encabezado', () => {
    render(<Landing />);

    const header = screen.getByRole('banner');
    expect(within(header).getByText('AgroTrace')).toBeInTheDocument();
  });

  it('el encabezado debe tener enlaces para iniciar sesión y registrarse', () => {
    render(<Landing />);

    const header = screen.getByRole('banner');
    expect(
      within(header).getByRole('link', { name: 'Iniciar Sesión' }),
    ).toHaveAttribute('href', '/login');
    expect(
      within(header).getByRole('link', { name: 'Registrarse' }),
    ).toHaveAttribute('href', '/register');
  });

  it('se debe mostrar el título principal', () => {
    render(<Landing />);

    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent(
      'Comercio agrícola justo y directo, desde la vereda hasta tu mesa.',
    );
  });

  it('se debe mostrar la descripción de la plataforma', () => {
    render(<Landing />);

    expect(
      screen.getByText(/conectamos agricultores locales con hogares y restaurantes/i),
    ).toBeInTheDocument();
  });

  it('el botón "Registrarse gratis" debe llevar al registro', () => {
    render(<Landing />);

    expect(
      screen.getByRole('link', { name: /registrarse gratis/i }),
    ).toHaveAttribute('href', '/register');
  });

  it('el enlace "¿Ya tienes cuenta? Inicia sesión" debe llevar al login', () => {
    render(<Landing />);

    expect(
      screen.getByRole('link', { name: '¿Ya tienes cuenta? Inicia sesión' }),
    ).toHaveAttribute('href', '/login');
  });
});
