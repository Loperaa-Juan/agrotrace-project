import { useEffect, useState } from 'react';
import {
  obtenerCatalogo,
  obtenerOfertas,
  type Oferta,
  type Producto,
} from '../perfil-api';
import { Icono, TarjetaCosecha } from './explorar';

/** Solo A y B: el grado C no se publica, así que no hay nada que filtrar. */
const CALIDADES = [
  {
    grado: 'A',
    titulo: 'Calidad buena',
    descripcion: 'Calibre uniforme y sin golpes. Para restaurantes y mesas exigentes.',
    marcada: 'bg-[#15803d] text-white',
  },
  {
    grado: 'B',
    titulo: 'Calidad regular',
    descripcion: 'Leves asimetrías o roces en la piel. Para el consumo diario en casa.',
    marcada: 'bg-orange-300 text-orange-950',
  },
];

const ETIQUETA_FILTRO = 'flex items-center gap-2 text-sm font-bold text-gray-900';
const CAMPO_FILTRO =
  'w-full h-11 px-3 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#15803d]';

function FilterPage() {
  const [nombre, setNombre] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [grados, setGrados] = useState(['A', 'B']);
  const [precioMaximo, setPrecioMaximo] = useState('');
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    Promise.all([obtenerOfertas(), obtenerCatalogo()]).then(
      ([ofertasCargadas, productosCargados]) => {
        setOfertas(ofertasCargadas);
        setProductos(productosCargados);
      },
    );
  }, []);

  const productoDe = (productId: string) =>
    productos.find((producto) => producto.ProductId === productId);

  const nombreDe = (productId: string) => productoDe(productId)?.name ?? '';

  const ofertasFiltradas = ofertas.filter(
    (oferta) =>
      nombreDe(oferta.productId).toLowerCase().includes(busqueda.toLowerCase()) &&
      grados.some((grado) => grado === oferta.aiQuality) &&
      (precioMaximo === '' || oferta.pricePerUnit <= Number(precioMaximo)),
  );

  const alternarGrado = (grado: string) =>
    setGrados(
      grados.includes(grado)
        ? grados.filter((marcado) => marcado !== grado)
        : [...grados, grado],
    );

  return (
    <main className="flex-1 w-full">
      <section className="bg-green-50 px-4 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15803d] text-white text-xs font-semibold shadow-sm">
              <Icono className="text-sm" nombre="tune" />
              <span>BÚSQUEDA CON FILTROS</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              Encuentra tu cosecha
            </h1>
            <p className="text-gray-600">
              Busca por producto y ajusta el precio y la calidad evaluada por la IA.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-sm self-start md:self-auto">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15803d] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#15803d]" />
            </span>
            <div>
              <p className="text-sm text-gray-600">Ofertas disponibles hoy</p>
              <p className="text-lg font-bold text-[#15803d]">
                {`${ofertas.length} cosechas activas`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 flex items-center">
            <Icono
              className="absolute left-4 text-gray-500 pointer-events-none"
              nombre="search"
            />
            <input
              id="input-filtro"
              type="text"
              placeholder="Filtra por nombre de producto"
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#15803d]"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
            />
          </div>
          <button
            type="button"
            className="h-14 px-8 rounded-xl bg-[#15803d] text-white font-bold shadow-md hover:bg-[#166534] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={nombre === ''}
            onClick={() => setBusqueda(nombre)}
          >
            <Icono nombre="search" />
            <span>Enviar</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <aside className="lg:col-span-4 space-y-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <fieldset className="space-y-3">
              <legend className="flex items-center gap-2 mb-3 font-bold text-gray-900">
                <Icono className="text-[#15803d]" nombre="verified_user" />
                <span>1. Calidad por IA</span>
              </legend>
              {CALIDADES.map((calidad) => {
                const marcada = grados.includes(calidad.grado);
                return (
                  <label
                    key={calidad.grado}
                    className={`cursor-pointer flex flex-col gap-1 p-4 rounded-xl transition-all hover:shadow-md ${
                      marcada ? calidad.marcada : 'bg-gray-50 text-gray-900'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={marcada}
                      onChange={() => alternarGrado(calidad.grado)}
                    />
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        {`Grado ${calidad.grado} · ${calidad.titulo}`}
                      </span>
                      <Icono
                        className="text-xl"
                        nombre={marcada ? 'check_box' : 'check_box_outline_blank'}
                      />
                    </span>
                    <span className="text-sm opacity-90">{calidad.descripcion}</span>
                  </label>
                );
              })}
              <p className="flex items-start gap-2 p-3 rounded-xl border border-dashed border-gray-300 text-xs text-gray-600">
                <Icono className="text-base shrink-0" nombre="info" />
                <span>El grado C no se publica en AgroTrace: nunca aparece en la búsqueda.</span>
              </p>
            </fieldset>

            <div className="space-y-2">
              <label className={ETIQUETA_FILTRO} htmlFor="filtro-precio-maximo">
                Precio máximo
              </label>
              <input
                id="filtro-precio-maximo"
                type="number"
                min="0"
                placeholder="Sin límite"
                className={CAMPO_FILTRO}
                value={precioMaximo}
                onChange={(evento) => setPrecioMaximo(evento.target.value)}
              />
              <p className="text-xs text-gray-600">Por unidad de venta de cada oferta, en COP.</p>
            </div>
          </aside>

          <section className="lg:col-span-8 space-y-4">
            <p aria-live="polite" className="text-sm text-gray-600">
              {`${ofertasFiltradas.length} ${ofertasFiltradas.length === 1 ? 'oferta' : 'ofertas'}`}
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ofertasFiltradas.map((oferta) => (
                <TarjetaCosecha
                  key={oferta.OffertId}
                  oferta={oferta}
                  producto={productoDe(oferta.productId)}
                />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

export default FilterPage;
