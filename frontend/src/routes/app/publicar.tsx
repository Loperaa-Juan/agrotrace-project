import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ErrorApi } from '../auth-api';
import { crearOferta, obtenerCatalogo, type NuevaOferta, type Producto } from '../perfil-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';

type Paso = 1 | 2;

type Formulario = {
  productoId: string;
  cantidad: string;
  precio: string;
  descripcion: string;
  fecha: string;
};

const FORMULARIO_VACIO: Formulario = {
  productoId: '',
  cantidad: '',
  precio: '',
  descripcion: '',
  fecha: '',
};

const PASOS: { numero: Paso; etiqueta: string }[] = [
  { numero: 1, etiqueta: 'Datos de la cosecha' },
  { numero: 2, etiqueta: 'Cuándo se recoge' },
];

const ERROR_CARGA = 'No pudimos cargar el catálogo. Intente de nuevo.';
const ERROR_PUBLICAR = 'No pudimos publicar su cosecha. Intente de nuevo.';
const ERROR_PRODUCTO = 'Elija un producto del catálogo para continuar.';
const ERROR_CANTIDAD = 'La cantidad debe ser un número entero mayor que cero.';
const ERROR_PRECIO = 'El precio debe ser un valor en pesos mayor que cero, sin decimales.';

const BOTON_PRIMARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const BOTON_SECUNDARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-white hover:bg-gray-100 text-[#15803d] text-sm font-semibold border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const CAMPO =
  'w-full h-12 px-4 rounded-xl bg-gray-50 border text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors';

const formatoCOP = (valor: number) => `$ ${valor.toLocaleString('es-CO')}`;

/** RF-06: precio en COP y cantidad, enteros y estrictamente mayores que cero. */
const esEnteroPositivo = (valor: string) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
};

/** Fecha local de hoy en formato YYYY-MM-DD, el mínimo para la fecha de cosecha. */
const hoy = () => new Date().toLocaleDateString('en-CA');

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

function ErrorCampo({ id, children }: Readonly<{ id: string; children: ReactNode }>) {
  return (
    <p className="flex items-center gap-1 text-sm text-red-700" id={id}>
      <Icono className="text-base" nombre="error" />
      {children}
    </p>
  );
}

function Progreso({ paso }: Readonly<{ paso: Paso }>) {
  return (
    <ol aria-label="Progreso de la publicación" className="flex items-center gap-3">
      {PASOS.map((item) => {
        const activo = item.numero === paso;
        const completado = item.numero < paso;
        return (
          <li
            aria-current={activo ? 'step' : undefined}
            className="flex items-center gap-2"
            key={item.numero}
          >
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                activo || completado ? 'bg-[#15803d] text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {completado ? <Icono className="text-xl" nombre="check" /> : item.numero}
            </span>
            <span
              className={`text-sm ${activo ? 'font-bold text-[#15803d]' : 'text-gray-600'}`}
            >
              {item.etiqueta}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Publicada() {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center space-y-4">
      <span className="w-16 h-16 mx-auto rounded-full bg-green-100 text-[#15803d] flex items-center justify-center">
        <Icono className="text-4xl" nombre="task_alt" />
      </span>
      <h2 className="text-2xl font-extrabold text-gray-900">¡Su cosecha quedó publicada!</h2>
      <p className="text-gray-600">
        Los compradores ya pueden verla en el catálogo de cosechas de AgroTrace.
      </p>
      <Link className={BOTON_PRIMARIO} to={routes.perfil}>
        <Icono className="text-xl" nombre="person" />
        Volver a mi perfil
      </Link>
    </section>
  );
}

/** El agricultor publica una cosecha en dos pasos: qué vende y a qué precio, y cuándo se recoge. */
export function PublicarPage() {
  const { usuario, salir } = useSesion();
  const esAgricultor = usuario?.role === 'Agricultor';
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [paso, setPaso] = useState<Paso>(1);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  /** Los errores de los campos aparecen después del primer intento de avanzar. */
  const [intento, setIntento] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [publicada, setPublicada] = useState(false);

  useEffect(() => {
    if (!esAgricultor) return;
    let vigente = true;
    obtenerCatalogo()
      .then((catalogo) => {
        // Solo se publican productos del catálogo que estén activos
        if (vigente) setProductos(catalogo.filter((producto) => producto.isActive));
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof ErrorApi && err.status === 401) salir();
        else setErrorCarga(ERROR_CARGA);
      });
    return () => {
      vigente = false;
    };
  }, [esAgricultor, salir]);

  if (!usuario) return <Navigate replace to={routes.login} />;
  if (!esAgricultor) return <Navigate replace to={routes.explorar} />;

  const producto = productos?.find((item) => item.ProductId === formulario.productoId);
  const unidad = producto?.unitOfMeasure ?? 'unidad';
  const errores = {
    producto: producto ? null : ERROR_PRODUCTO,
    cantidad: esEnteroPositivo(formulario.cantidad) ? null : ERROR_CANTIDAD,
    precio: esEnteroPositivo(formulario.precio) ? null : ERROR_PRECIO,
  };
  const datosValidos = !errores.producto && !errores.cantidad && !errores.precio;

  const cambiar = (campo: keyof Formulario, valor: string) =>
    setFormulario((previo) => ({ ...previo, [campo]: valor }));

  const avanzar = () => {
    setIntento(true);
    if (datosValidos) setPaso(2);
  };

  const publicar = async () => {
    const descripcion = formulario.descripcion.trim();
    const oferta: NuevaOferta = {
      productId: formulario.productoId,
      pricePerUnit: Number(formulario.precio),
      availableQuantity: Number(formulario.cantidad),
      // Los campos opcionales vacíos no se envían
      ...(descripcion && { description: descripcion }),
      ...(formulario.fecha && { harvestDate: formulario.fecha }),
    };
    setPublicando(true);
    setErrorPublicar(null);
    try {
      await crearOferta(oferta);
      setPublicada(true);
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 401) salir();
      else if (err instanceof ErrorApi) setErrorPublicar(`No pudimos publicar su cosecha: ${err.message}`);
      else setErrorPublicar(ERROR_PUBLICAR);
    } finally {
      setPublicando(false);
    }
  };

  const errorVisible = (campo: keyof typeof errores) => (intento ? errores[campo] : null);

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          Publicar nueva cosecha
        </h1>
        <p className="text-gray-600">
          Son dos pasos y puede ir con calma: primero nos cuenta qué vende y a qué precio, y
          después cuándo se recoge.
        </p>
      </div>

      {publicada ? (
        <Publicada />
      ) : (
        <>
          <Progreso paso={paso} />
          {errorCarga && <Alerta>{errorCarga}</Alerta>}
          {!productos && !errorCarga && (
            <output className="block text-sm text-gray-600">Cargando el catálogo…</output>
          )}

          {productos && paso === 1 && (
            <form
              className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6"
              noValidate
              onSubmit={(evento) => {
                evento.preventDefault();
                avanzar();
              }}
            >
              <h2 className="text-xl font-bold text-gray-900">Paso 1: Qué vende y a qué precio</h2>

              <div className="space-y-2">
                <label className="block font-semibold text-gray-900" htmlFor="productoSelect">
                  Producto que vende
                </label>
                <select
                  aria-describedby={errorVisible('producto') ? 'productoError' : undefined}
                  aria-invalid={Boolean(errorVisible('producto'))}
                  className={`${CAMPO} ${errorVisible('producto') ? 'border-red-500' : 'border-gray-200'}`}
                  id="productoSelect"
                  onChange={(evento) => cambiar('productoId', evento.target.value)}
                  value={formulario.productoId}
                >
                  <option disabled value="">
                    Elija un producto
                  </option>
                  {productos.map((item) => (
                    <option key={item.ProductId} value={item.ProductId}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {errorVisible('producto') && (
                  <ErrorCampo id="productoError">{errores.producto}</ErrorCampo>
                )}
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-gray-900" htmlFor="cantidadInput">
                  {`Cantidad disponible (${unidad})`}
                </label>
                <input
                  aria-describedby={errorVisible('cantidad') ? 'cantidadError' : undefined}
                  aria-invalid={Boolean(errorVisible('cantidad'))}
                  className={`${CAMPO} ${errorVisible('cantidad') ? 'border-red-500' : 'border-gray-200'}`}
                  id="cantidadInput"
                  inputMode="numeric"
                  min="1"
                  onChange={(evento) => cambiar('cantidad', evento.target.value)}
                  type="number"
                  value={formulario.cantidad}
                />
                {errorVisible('cantidad') && (
                  <ErrorCampo id="cantidadError">{errores.cantidad}</ErrorCampo>
                )}
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-gray-900" htmlFor="precioInput">
                  {`Precio de venta por ${unidad} (COP)`}
                </label>
                <input
                  aria-describedby={errorVisible('precio') ? 'precioError' : undefined}
                  aria-invalid={Boolean(errorVisible('precio'))}
                  className={`${CAMPO} ${errorVisible('precio') ? 'border-red-500' : 'border-gray-200'}`}
                  id="precioInput"
                  inputMode="numeric"
                  min="1"
                  onChange={(evento) => cambiar('precio', evento.target.value)}
                  step="50"
                  type="number"
                  value={formulario.precio}
                />
                {errorVisible('precio') && <ErrorCampo id="precioError">{errores.precio}</ErrorCampo>}
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-gray-900" htmlFor="descripcionInput">
                  Descripción (opcional)
                </label>
                <textarea
                  className="w-full min-h-24 p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors"
                  id="descripcionInput"
                  onChange={(evento) => cambiar('descripcion', evento.target.value)}
                  placeholder="Por ejemplo: recogido esta semana, sin químicos"
                  value={formulario.descripcion}
                />
              </div>

              {!errores.cantidad && !errores.precio && (
                <p className="p-4 rounded-xl bg-green-50 font-semibold text-[#15803d]">
                  {`Ganancia estimada: ${formatoCOP(Number(formulario.cantidad) * Number(formulario.precio))} COP`}
                </p>
              )}

              <button className={`${BOTON_PRIMARIO} w-full`} type="submit">
                Siguiente: cuándo se recoge
                <Icono className="text-xl" nombre="arrow_forward" />
              </button>
            </form>
          )}

          {productos && paso === 2 && (
            <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Paso 2: Cuándo se recoge</h2>

              <p className="p-4 rounded-xl bg-gray-50 text-gray-700">
                {`${Number(formulario.cantidad).toLocaleString('es-CO')} ${unidad} de ${producto?.name} a ${formatoCOP(Number(formulario.precio))} COP / ${unidad}`}
              </p>

              <div className="space-y-2">
                <label className="block font-semibold text-gray-900" htmlFor="fechaInput">
                  Fecha de cosecha (opcional)
                </label>
                <input
                  className={`${CAMPO} border-gray-200`}
                  id="fechaInput"
                  min={hoy()}
                  onChange={(evento) => cambiar('fecha', evento.target.value)}
                  type="date"
                  value={formulario.fecha}
                />
              </div>

              {errorPublicar && <Alerta>{errorPublicar}</Alerta>}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button className={BOTON_SECUNDARIO} onClick={() => setPaso(1)} type="button">
                  <Icono className="text-xl" nombre="arrow_back" />
                  Volver
                </button>
                <button
                  className={`${BOTON_PRIMARIO} flex-1`}
                  disabled={publicando}
                  onClick={publicar}
                  type="button"
                >
                  {publicando ? 'Publicando…' : 'Publicar cosecha'}
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
