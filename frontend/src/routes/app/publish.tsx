import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ErrorApi } from '../auth-api';
import {
  crearOferta,
  obtenerCatalogo,
  type NuevaOferta,
  type Producto,
} from '../profile-api';
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

type CambiarCampo = (campo: keyof Formulario, valor: string) => void;

type Errores = {
  producto: string | null;
  cantidad: string | null;
  precio: string | null;
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
const ERROR_PRECIO =
  'El precio debe ser un valor en pesos mayor que cero, sin decimales.';

const BOTON_PRIMARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const BOTON_SECUNDARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-white hover:bg-gray-100 text-[#15803d] text-sm font-semibold border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const CAMPO =
  'w-full h-12 px-4 rounded-xl bg-gray-50 border text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors';
const ETIQUETA = 'block font-semibold text-gray-900';

const formatoCOP = (valor: number) => `$ ${valor.toLocaleString('es-CO')}`;

/** RF-06: precio en COP y cantidad, enteros y estrictamente mayores que cero. */
const esEnteroPositivo = (valor: string) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
};

/** Fecha local de hoy en formato YYYY-MM-DD, el mínimo para la fecha de cosecha. */
const hoy = () => new Date().toLocaleDateString('en-CA');

function validar(
  formulario: Formulario,
  producto: Producto | undefined,
): Errores {
  return {
    producto: producto ? null : ERROR_PRODUCTO,
    cantidad: esEnteroPositivo(formulario.cantidad) ? null : ERROR_CANTIDAD,
    precio: esEnteroPositivo(formulario.precio) ? null : ERROR_PRECIO,
  };
}

/** Los campos opcionales vacíos no se envían. */
function aOferta(formulario: Formulario): NuevaOferta {
  const descripcion = formulario.descripcion.trim();
  return {
    productId: formulario.productoId,
    pricePerUnit: Number(formulario.precio),
    availableQuantity: Number(formulario.cantidad),
    ...(descripcion && { description: descripcion }),
    ...(formulario.fecha && { harvestDate: formulario.fecha }),
  };
}

function mensajeErrorPublicar(err: unknown) {
  return err instanceof ErrorApi
    ? `No pudimos publicar su cosecha: ${err.message}`
    : ERROR_PUBLICAR;
}

const esSesionVencida = (err: unknown) =>
  err instanceof ErrorApi && err.status === 401;

/** Productos activos del catálogo: solo esos se pueden publicar. */
function useCatalogoActivo(habilitado: boolean, salir: () => void) {
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    obtenerCatalogo()
      .then((catalogo) => {
        if (vigente)
          setProductos(catalogo.filter((producto) => producto.isActive));
      })
      .catch((err) => {
        if (!vigente) return;
        if (esSesionVencida(err)) salir();
        else setError(ERROR_CARGA);
      });
    return () => {
      vigente = false;
    };
  }, [habilitado, salir]);

  return { productos, error };
}

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

function ErrorCampo({
  id,
  children,
}: Readonly<{ id: string; children: ReactNode }>) {
  return (
    <p className="flex items-center gap-1 text-sm text-red-700" id={id}>
      <Icono className="text-base" nombre="error" />
      {children}
    </p>
  );
}

/** Atributos de un campo que puede mostrar un error debajo. */
function conError(id: string, error: string | null) {
  return {
    id,
    'aria-describedby': error ? `${id}-error` : undefined,
    'aria-invalid': Boolean(error),
    className: `${CAMPO} ${error ? 'border-red-500' : 'border-gray-200'}`,
  };
}

function CampoNumero({
  id,
  etiqueta,
  valor,
  error,
  step,
  onChange,
}: Readonly<{
  id: string;
  etiqueta: string;
  valor: string;
  error: string | null;
  step?: string;
  onChange: (valor: string) => void;
}>) {
  return (
    <div className="space-y-2">
      <label className={ETIQUETA} htmlFor={id}>
        {etiqueta}
      </label>
      <input
        {...conError(id, error)}
        inputMode="numeric"
        min="1"
        onChange={(evento) => onChange(evento.target.value)}
        step={step}
        type="number"
        value={valor}
      />
      {error && <ErrorCampo id={`${id}-error`}>{error}</ErrorCampo>}
    </div>
  );
}

function Progreso({ paso }: Readonly<{ paso: Paso }>) {
  return (
    <ol
      aria-label="Progreso de la publicación"
      className="flex items-center gap-3"
    >
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
                activo || completado
                  ? 'bg-[#15803d] text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {completado ? (
                <Icono className="text-xl" nombre="check" />
              ) : (
                item.numero
              )}
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

function PasoDatos({
  productos,
  formulario,
  cambiar,
  onAvanzar,
}: Readonly<{
  productos: Producto[];
  formulario: Formulario;
  cambiar: CambiarCampo;
  onAvanzar: () => void;
}>) {
  /** Los errores de los campos aparecen después del primer intento de avanzar. */
  const [intento, setIntento] = useState(false);
  const producto = productos.find(
    (item) => item.ProductId === formulario.productoId,
  );
  const unidad = producto?.unitOfMeasure ?? 'unidad';
  const errores = validar(formulario, producto);
  const visibles: Errores = intento
    ? errores
    : { producto: null, cantidad: null, precio: null };
  const montosValidos = !errores.cantidad && !errores.precio;

  const avanzar = () => {
    setIntento(true);
    if (!errores.producto && montosValidos) onAvanzar();
  };

  return (
    <form
      className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        avanzar();
      }}
    >
      <h2 className="text-xl font-bold text-gray-900">
        Paso 1: Qué vende y a qué precio
      </h2>

      <div className="space-y-2">
        <label className={ETIQUETA} htmlFor="producto">
          Producto que vende
        </label>
        <select
          {...conError('producto', visibles.producto)}
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
        {visibles.producto && (
          <ErrorCampo id="producto-error">{visibles.producto}</ErrorCampo>
        )}
      </div>

      <CampoNumero
        error={visibles.cantidad}
        etiqueta={`Cantidad disponible (${unidad})`}
        id="cantidad"
        onChange={(valor) => cambiar('cantidad', valor)}
        valor={formulario.cantidad}
      />
      <CampoNumero
        error={visibles.precio}
        etiqueta={`Precio de venta por ${unidad} (COP)`}
        id="precio"
        onChange={(valor) => cambiar('precio', valor)}
        step="50"
        valor={formulario.precio}
      />

      <div className="space-y-2">
        <label className={ETIQUETA} htmlFor="descripcion">
          Descripción (opcional)
        </label>
        <textarea
          className="w-full min-h-24 p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors"
          id="descripcion"
          onChange={(evento) => cambiar('descripcion', evento.target.value)}
          placeholder="Por ejemplo: recogido esta semana, sin químicos"
          value={formulario.descripcion}
        />
      </div>

      {montosValidos && (
        <p className="p-4 rounded-xl bg-green-50 font-semibold text-[#15803d]">
          {`Ganancia estimada: ${formatoCOP(Number(formulario.cantidad) * Number(formulario.precio))} COP`}
        </p>
      )}

      <button className={`${BOTON_PRIMARIO} w-full`} type="submit">
        Siguiente: cuándo se recoge
        <Icono className="text-xl" nombre="arrow_forward" />
      </button>
    </form>
  );
}

function PasoFecha({
  producto,
  formulario,
  cambiar,
  publicando,
  error,
  onVolver,
  onPublicar,
}: Readonly<{
  producto: Producto | undefined;
  formulario: Formulario;
  cambiar: CambiarCampo;
  publicando: boolean;
  error: string | null;
  onVolver: () => void;
  onPublicar: () => void;
}>) {
  const unidad = producto?.unitOfMeasure ?? 'unidad';
  const cantidad = Number(formulario.cantidad).toLocaleString('es-CO');
  const precio = formatoCOP(Number(formulario.precio));

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-gray-900">
        Paso 2: Cuándo se recoge
      </h2>

      <p className="p-4 rounded-xl bg-gray-50 text-gray-700">
        {`${cantidad} ${unidad} de ${producto?.name} a ${precio} COP / ${unidad}`}
      </p>

      <div className="space-y-2">
        <label className={ETIQUETA} htmlFor="fecha">
          Fecha de cosecha (opcional)
        </label>
        <input
          className={`${CAMPO} border-gray-200`}
          id="fecha"
          min={hoy()}
          onChange={(evento) => cambiar('fecha', evento.target.value)}
          type="date"
          value={formulario.fecha}
        />
      </div>

      {error && <Alerta>{error}</Alerta>}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button className={BOTON_SECUNDARIO} onClick={onVolver} type="button">
          <Icono className="text-xl" nombre="arrow_back" />
          Volver
        </button>
        <button
          className={`${BOTON_PRIMARIO} flex-1`}
          disabled={publicando}
          onClick={onPublicar}
          type="button"
        >
          {publicando ? 'Publicando…' : 'Publicar cosecha'}
        </button>
      </div>
    </section>
  );
}

function Publicada() {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center space-y-4">
      <span className="w-16 h-16 mx-auto rounded-full bg-green-100 text-[#15803d] flex items-center justify-center">
        <Icono className="text-4xl" nombre="task_alt" />
      </span>
      <h2 className="text-2xl font-extrabold text-gray-900">
        ¡Su cosecha quedó publicada!
      </h2>
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
  const { productos, error: errorCarga } = useCatalogoActivo(
    esAgricultor,
    salir,
  );
  const [paso, setPaso] = useState<Paso>(1);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [publicada, setPublicada] = useState(false);

  if (!usuario) return <Navigate replace to={routes.login} />;
  if (!esAgricultor) return <Navigate replace to={routes.explorar} />;

  const cambiar: CambiarCampo = (campo, valor) =>
    setFormulario((previo) => ({ ...previo, [campo]: valor }));

  const publicar = async () => {
    setPublicando(true);
    setErrorPublicar(null);
    try {
      await crearOferta(aOferta(formulario));
      setPublicada(true);
    } catch (err) {
      if (esSesionVencida(err)) salir();
      else setErrorPublicar(mensajeErrorPublicar(err));
    } finally {
      setPublicando(false);
    }
  };

  const contenido = () => {
    if (publicada) return <Publicada />;
    if (errorCarga) return <Alerta>{errorCarga}</Alerta>;
    if (!productos) {
      return (
        <output className="block text-sm text-gray-600">
          Cargando el catálogo…
        </output>
      );
    }
    if (paso === 1) {
      return (
        <PasoDatos
          cambiar={cambiar}
          formulario={formulario}
          onAvanzar={() => setPaso(2)}
          productos={productos}
        />
      );
    }
    return (
      <PasoFecha
        cambiar={cambiar}
        error={errorPublicar}
        formulario={formulario}
        onPublicar={publicar}
        onVolver={() => setPaso(1)}
        producto={productos.find(
          (item) => item.ProductId === formulario.productoId,
        )}
        publicando={publicando}
      />
    );
  };

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
          Publicar nueva cosecha
        </h1>
        <p className="text-gray-600">
          Son dos pasos y puede ir con calma: primero nos cuenta qué vende y a
          qué precio, y después cuándo se recoge.
        </p>
      </div>
      {!publicada && <Progreso paso={paso} />}
      {contenido()}
    </main>
  );
}
