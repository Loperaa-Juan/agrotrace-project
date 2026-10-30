/**
 * @file Vista de exploración de cosechas (`ExplorarPage`). Permite a los compradores y negocios
 * visualizar el catálogo de productos agrícolas activos y ofertas disponibles publicadas por los agricultores.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  obtenerCatalogo,
  obtenerOfertas,
  type Oferta,
  type Producto,
} from '../profile-api';
import { detalleDe } from '../routes';

/** Estructura que agrupa las ofertas y el catálogo de productos recuperados del backend. */
type DatosCatalogo = {
  ofertas: Oferta[];
  productos: Producto[];
};

const ERROR_CARGA = 'No pudimos cargar las cosechas. Intenta de nuevo.';

/** Formatea un valor numérico utilizando separadores de miles estándar para Colombia. */
const formatoNumero = (valor: number) => valor.toLocaleString('es-CO');

/**
 * Componente reutilizable para renderizar iconos de Google Material Symbols.
 * @component
 */
export function Icono({
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
 * Foto de una cosecha guardada en S3. Si la oferta no tiene foto muestra un recuadro con un icono.
 * @component
 */
export function FotoCosecha({
  url,
  nombre,
  className = '',
}: Readonly<{ url: string | null; nombre: string; className?: string }>) {
  if (!url) {
    return (
      <div
        aria-label={`${nombre} sin foto`}
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        role="img"
      >
        <Icono className="text-5xl" nombre="image" />
      </div>
    );
  }
  return (
    <img
      alt={`Foto de ${nombre}`}
      className={`object-contain bg-gray-100 ${className}`}
      loading="lazy"
      src={url}
    />
  );
}

/**
 * Componente para mostrar mensajes de alerta destacados.
 * @component
 */
function Alerta({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p
      className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-sm font-medium text-red-700"
      role="alert"
    >
      {children}
    </p>
  );
}

/**
 * Tarjeta individual que muestra la información detallada de una oferta agrícola específica.
 * @component
 */
export function TarjetaCosecha({
  oferta,
  producto,
}: Readonly<{ oferta: Oferta; producto: Producto | undefined }>) {
  const unidad = producto?.unitOfMeasure ?? '';
  return (
    <li className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-3">
      <FotoCosecha
        className="w-full aspect-4/3 rounded-xl"
        nombre={producto?.name ?? 'Producto'}
        url={oferta.imageUrl}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-900">
          {producto?.name ?? 'Producto'}
        </h2>
        {oferta.aiQuality && (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
            {`Calidad ${oferta.aiQuality}`}
          </span>
        )}
      </div>
      {oferta.description && (
        <p className="text-sm text-gray-600">{oferta.description}</p>
      )}
      <div className="mt-auto flex items-end justify-between gap-3">
        <p className="text-base font-extrabold text-[#15803d]">
          {`$ ${formatoNumero(oferta.pricePerUnit)} COP / ${unidad}`}
        </p>
        <p className="text-sm text-gray-600">
          {`${formatoNumero(oferta.availableQuantity)} ${unidad} disponibles`}
        </p>
      </div>
      <Link
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#166534] text-white font-bold hover:bg-[#14532d] transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
        to={detalleDe(oferta.OffertId)}
      >
        Ver detalle y pedir
        <Icono className="text-base" nombre="arrow_forward" />
      </Link>
    </li>
  );
}

/**
 * Componente que renderiza la cuadrícula de tarjetas de cosechas o un mensaje si el catálogo está vacío.
 * @component
 */
function ListaCosechas({ datos }: Readonly<{ datos: DatosCatalogo }>) {
  const { ofertas, productos } = datos;
  const productoDe = (id: string) =>
    productos.find((producto) => producto.ProductId === id);

  if (ofertas.length === 0) {
    return (
      <p className="p-4 rounded-xl bg-white text-sm text-gray-600 border border-gray-100">
        Aún no hay cosechas publicadas.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ofertas.map((oferta) => (
        <TarjetaCosecha
          key={oferta.OffertId}
          oferta={oferta}
          producto={productoDe(oferta.productId)}
        />
      ))}
    </ul>
  );
}

/**
 * Componente principal de la vista de exploración (`ExplorarPage`). Gestiona la carga asíncrona
 * de las ofertas y productos disponibles en el sistema.
 * @component
 */
export function ExplorarPage() {
  const [datos, setDatos] = useState<DatosCatalogo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerOfertas(), obtenerCatalogo()])
      .then(([ofertas, productos]) => {
        if (vigente) setDatos({ ofertas, productos });
      })
      .catch(() => {
        if (vigente) setError(ERROR_CARGA);
      });
    return () => {
      vigente = false;
    };
  }, []);

  return (
    <>
      <main className="flex-1 w-full">
        <section className="bg-green-50 px-4 sm:px-8 py-10">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15803d] text-white text-xs font-semibold shadow-sm">
                <Icono className="text-sm" nombre="agriculture" />
                DIRECTO DE LA MONTAÑA A TU MESA
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                Cosechas frescas de Envigado para hoy
              </h1>
              <p className="text-gray-600">
                Frutas, café de especialidad y hortalizas de campesinos locales,
                con calidad clasificada por visión computacional.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm">
              <Icono
                className="text-xl text-[#15803d]"
                nombre="verified_user"
              />
              <div>
                <p className="text-sm font-bold text-gray-900">
                  100% Trazabilidad
                </p>
                <p className="text-sm text-gray-600">Veredas de Envigado</p>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-4">
          {error && <Alerta>{error}</Alerta>}
          {!datos && !error && (
            <output className="block text-sm text-gray-600">
              Cargando cosechas…
            </output>
          )}
          {datos && <ListaCosechas datos={datos} />}
        </div>
      </main>

      <footer className="w-full bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
          <p>© 2026 AgroTrace Envigado. Orgullo y cosecha de nuestra tierra.</p>
          <span className="font-semibold text-[#15803d]">
            soporte@agrotrace.co
          </span>
        </div>
      </footer>
    </>
  );
}
