/**
 * @file Estructura general de diseño (Layout) para las vistas protegidas de la aplicación.
 * Mantiene la cabecera fija, gestiona el menú desplegable del usuario y renderiza el contenido dinámico mediante {@link Outlet}.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import type { RolUsuario, Usuario } from '../auth-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';

/** Mapeo de los roles de usuario a etiquetas legibles para la interfaz. */
const ROLES: Record<RolUsuario, string> = {
  Agricultor: 'Agricultor',
  Persona: 'Comprador',
  Negocio: 'Negocio / Restaurante',
  Admin: 'Administrador',
};

const OPCION_MENU =
  'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:bg-gray-100';

/**
 * Genera las iniciales a partir de las dos primeras palabras de un nombre (ej. "Juan Pérez" -> "JP").
 * @function iniciales
 * @param {string} nombre Nombre completo del usuario.
 * @returns {string} Iniciales en mayúsculas.
 */
function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');
}

/**
 * Componente reutilizable para renderizar iconos de Google Material Symbols.
 * @component
 */
function Icono({
  nombre,
  className = '',
}: Readonly<{ nombre: string; className?: string }>) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {nombre}
    </span>
  );
}

/**
 * Componente de menú desplegable de usuario ubicado en la cabecera. Permite navegar
 * entre las distintas secciones según el rol y cerrar la sesión actual.
 * @component
 */
function MenuUsuario({ usuario }: Readonly<{ usuario: Usuario }>) {
  const { cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Mientras está abierto, Escape o un clic fuera lo cierran
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    const alHacerClic = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false);
    };
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('mousedown', alHacerClic);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('mousedown', alHacerClic);
    };
  }, [abierto]);

  // Desde cualquier página, incluso las públicas, cerrar sesión lleva al login
  const salirAlLogin = () => {
    cerrarSesion();
    navigate(routes.login, { replace: true });
  };

  return (
    <div className="relative" ref={contenedor}>
      <button
        aria-controls="menu-usuario"
        aria-expanded={abierto}
        aria-label={`${usuario.name}, ${ROLES[usuario.role]}`}
        className="flex items-center gap-3 rounded-xl py-1 pl-3 pr-1 hover:bg-gray-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600"
        onClick={() => setAbierto((previo) => !previo)}
        type="button"
      >
        <span className="hidden sm:flex flex-col items-end leading-tight">
          <span className="flex items-center gap-1 text-sm font-semibold text-gray-900">
            {usuario.name}
            <Icono
              className={`text-base transition-transform ${abierto ? 'rotate-180' : ''}`}
              nombre="expand_more"
            />
          </span>
          <span className="text-xs font-semibold text-gray-500">
            {ROLES[usuario.role]}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="w-10 h-10 rounded-full bg-[#15803d] text-white text-sm font-bold flex items-center justify-center ring-2 ring-green-200"
        >
          {iniciales(usuario.name)}
        </span>
      </button>

      {abierto && (
        <nav
          aria-label="Menú de usuario"
          className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-lg border border-gray-100 py-2 overflow-hidden"
          id="menu-usuario"
        >
          <Link
            className={`${OPCION_MENU} text-gray-800 hover:bg-gray-50`}
            onClick={() => setAbierto(false)}
            to={routes.explorar}
          >
            <Icono className="text-lg text-[#15803d]" nombre="storefront" />
            Explorar cosechas
          </Link>
          <Link
            className={`${OPCION_MENU} text-gray-800 hover:bg-gray-50`}
            onClick={() => setAbierto(false)}
            to={routes.filtros}
          >
            <Icono className="text-lg text-[#15803d]" nombre="filter_alt" />
            Filtros y búsqueda
          </Link>
          {/* Solo el agricultor publica cosechas */}
          {usuario.role === 'Agricultor' && (
            <Link
              className={`${OPCION_MENU} bg-[#15803d] text-white font-semibold hover:bg-[#166534] focus:bg-[#166534]`}
              onClick={() => setAbierto(false)}
              to={routes.publicar}
            >
              <Icono className="text-lg" nombre="add_circle" />
              Publicar cosecha
            </Link>
          )}
          <Link
            className={`${OPCION_MENU} text-gray-800 hover:bg-gray-50`}
            onClick={() => setAbierto(false)}
            to={routes.perfil}
          >
            <Icono className="text-lg text-[#15803d]" nombre="person" />
            Mi perfil
          </Link>
          <Link
            className={`${OPCION_MENU} text-gray-800 hover:bg-gray-50`}
            onClick={() => setAbierto(false)}
            to={routes.pedidos}
          >
            <Icono className="text-lg text-[#15803d]" nombre="inventory_2" />
            Mis pedidos
          </Link>
          <div className="my-1 border-t border-gray-100" />
          <button
            className={`${OPCION_MENU} text-red-700 hover:bg-red-50`}
            onClick={salirAlLogin}
            type="button"
          >
            <Icono className="text-lg" nombre="logout" />
            Cerrar sesión
          </button>
        </nav>
      )}
    </div>
  );
}

/**
 * Componente de diseño principal (`AppLayout`). La cabecera se mantiene montada de forma persistente
 * mientras el usuario navega entre las diferentes páginas internas de la plataforma.
 * @component
 */
export function AppLayout() {
  const { usuario } = useSesion();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            className="rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            to={routes.inicio}
          >
            <img
              alt="AgroTrace"
              className="h-10 sm:h-11 w-auto object-contain"
              src="/img/agrotrace-logo.webp"
            />
          </Link>
          {usuario && <MenuUsuario usuario={usuario} />}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
