import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Usuario } from '../auth-api';
import {
  obtenerCatalogo,
  obtenerOfertas,
  type Oferta,
  type Producto,
} from '../profile-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';
import { Icono } from './explore';

const ERROR_CARGA = 'No pudimos cargar la cosecha. Intenta de nuevo.';

/** Cantidad máxima por pedido para quien no compra como negocio. */
const LIMITE_PERSONA = 50;

const formatoNumero = (valor: number) => valor.toLocaleString('es-CO');

// Se lee como fecha local para que no cambie de día por la zona horaria
const formatoFecha = (fecha: string) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const BOTON_CANTIDAD =
  'w-12 h-12 shrink-0 rounded-xl bg-white text-gray-900 flex items-center justify-center shadow-sm text-2xl font-bold transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100';

function Dato({
  icono,
  etiqueta,
  valor,
}: Readonly<{ icono: string; etiqueta: string; valor: string }>) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
      <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm text-[#15803d]">
        <Icono className="text-xl" nombre={icono} />
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {etiqueta}
        </dt>
        <dd className="text-sm font-bold text-gray-900">{valor}</dd>
      </div>
    </div>
  );
}

function ProductDetail({
  oferta,
  producto,
  usuario = null,
}: Readonly<{
  oferta: Oferta;
  producto: Producto | undefined;
  usuario?: Usuario | null;
}>) {
  const idCantidad = useId();
  const unidad = producto?.unitOfMeasure ?? '';
  const [cantidad, setCantidad] = useState(1);
  const [superaLimite, setSuperaLimite] = useState(false);
  const esNegocio = usuario?.role === 'Negocio';

  const aumentar = () => {
    if (!esNegocio && cantidad >= LIMITE_PERSONA) {
      setSuperaLimite(true);
      return;
    }
    setCantidad(cantidad + 1);
  };

  const disminuir = () => {
    setSuperaLimite(false);
    setCantidad(cantidad - 1);
  };

  const sinCantidad = cantidad === 0;
  const esPropia = usuario?.userId === oferta.farmerId;
  const total = formatoNumero(cantidad * oferta.pricePerUnit);

  return (
    <main className="flex-1 w-full bg-gray-50">
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-8">
        {oferta.aiQuality && (
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-[#14532d] via-[#15803d] to-[#16a34a] p-6 text-white shadow-md">
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md shrink-0">
                <Icono className="text-2xl text-amber-300" nombre="verified_user" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-white/20 text-amber-200 text-xs font-semibold uppercase tracking-wider">
                  Certificación AgroTrace IA
                </span>
                <p className="text-xl font-bold tracking-tight">
                  {`Calidad ${oferta.aiQuality}`}
                </p>
                <p className="text-sm text-green-50/90">
                  Calificada por inspección de imágenes en el origen.
                </p>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <article className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-[#15803d] text-xs font-bold uppercase tracking-wide">
                <Icono className="text-sm" nombre="eco" />
                Cosecha disponible
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                {producto?.name ?? 'Producto'}
              </h1>
              <p className="text-gray-600 leading-relaxed">
                {oferta.description}
              </p>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Dato
                etiqueta="Cosechado el"
                icono="calendar_month"
                valor={formatoFecha(oferta.harvestDate)}
              />
              <Dato
                etiqueta="Disponibles"
                icono="inventory_2"
                valor={`${formatoNumero(oferta.availableQuantity)} ${unidad}`}
              />
            </dl>
          </article>

          <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white rounded-2xl p-6 shadow-md border border-gray-100 space-y-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#15803d]">
                {`$ ${formatoNumero(oferta.pricePerUnit)} COP`}
              </span>
              <span className="text-sm font-medium text-gray-500">{`/ ${unidad}`}</span>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 space-y-3">
              <label
                className="block text-sm font-bold text-gray-900"
                htmlFor={idCantidad}
              >
                Cantidad a ordenar
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="decrease-btn"
                  onClick={disminuir}
                  disabled={sinCantidad}
                  className={BOTON_CANTIDAD}
                >
                  −
                </button>
                <div className="flex-1 h-12 bg-white rounded-xl flex items-center justify-center gap-1 shadow-sm px-3">
                  <input
                    id={idCantidad}
                    type="number"
                    readOnly
                    value={cantidad}
                    className="w-16 bg-transparent text-center text-2xl font-bold text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-medium text-gray-500">{unidad}</span>
                </div>
                <button
                  type="button"
                  aria-label="Increase-btn"
                  onClick={aumentar}
                  className={BOTON_CANTIDAD}
                >
                  +
                </button>
              </div>
              {superaLimite && (
                <p
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-sm font-medium text-amber-800"
                >
                  <Icono className="text-lg shrink-0" nombre="warning" />
                  {`No puedes agregar más de ${LIMITE_PERSONA} libras al carrito`}
                </p>
              )}
              <p className="flex items-start gap-1.5 text-xs text-gray-500">
                <Icono className="text-base text-[#15803d] shrink-0" nombre="badge" />
                {esNegocio
                  ? 'Compras como negocio: sin límite por pedido.'
                  : `Máximo ${LIMITE_PERSONA} ${unidad} por pedido.`}
              </p>
            </div>

            <div className="flex justify-between items-baseline border-t border-gray-100 pt-4">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-extrabold text-[#15803d]">
                {`$ ${total}`}
                <span className="ml-1 text-sm font-medium text-gray-500">COP</span>
              </span>
            </div>

            {esPropia && (
              <p className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-sm font-medium text-red-700">
                <Icono className="text-lg shrink-0" nombre="storefront" />
                No puedes comprar tus propios productos
              </p>
            )}

            <button
              type="button"
              disabled={sinCantidad || esPropia}
              className="w-full h-14 rounded-xl bg-[#15803d] text-white text-lg font-bold shadow-md flex items-center justify-center gap-2 transition-all hover:bg-[#166534] hover:shadow-lg active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <Icono className="text-2xl" nombre="shopping_basket" />
              Ordenar ahora
            </button>
            <p className="text-xs text-gray-500 text-center">
              No pagas todavía: el pedido queda «Solicitado» hasta que el
              agricultor lo acepte.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

type DatosDetalle = {
  oferta: Oferta | undefined;
  producto: Producto | undefined;
};

function Aviso({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-4">
      {children}
    </main>
  );
}

/** Página de la ruta `/explorar/:offertId`: busca la oferta y su producto y muestra el detalle. */
export function DetalleProductoPage() {
  const { offertId } = useParams();
  const { usuario } = useSesion();
  const [datos, setDatos] = useState<DatosDetalle | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    // catalog-service no expone una oferta por id, así que se busca entre las publicadas
    Promise.all([obtenerOfertas(), obtenerCatalogo()])
      .then(([ofertas, productos]) => {
        if (!vigente) return;
        const oferta = ofertas.find((item) => item.OffertId === offertId);
        const producto = productos.find(
          (item) => item.ProductId === oferta?.productId,
        );
        setDatos({ oferta, producto });
      })
      .catch(() => {
        if (vigente) setError(true);
      });
    return () => {
      vigente = false;
    };
  }, [offertId]);

  if (error) {
    return (
      <Aviso>
        <p
          className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-sm font-medium text-red-700"
          role="alert"
        >
          {ERROR_CARGA}
        </p>
      </Aviso>
    );
  }

  if (!datos) {
    return (
      <Aviso>
        <output className="block text-sm text-gray-600">
          Cargando la cosecha…
        </output>
      </Aviso>
    );
  }

  if (!datos.oferta) {
    return (
      <Aviso>
        <p className="p-4 rounded-xl bg-white text-sm text-gray-600 border border-gray-100">
          Esta cosecha ya no está disponible.
        </p>
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-[#15803d] hover:underline"
          to={routes.explorar}
        >
          <Icono className="text-base" nombre="arrow_back" />
          Volver a las cosechas
        </Link>
      </Aviso>
    );
  }

  return (
    <ProductDetail
      oferta={datos.oferta}
      producto={datos.producto}
      usuario={usuario}
    />
  );
}

export default ProductDetail;
