/**
 * @file Vista de publicación de nuevas cosechas (`PublicarPage`). Asiste al agricultor a través
 * de un flujo de tres pasos para registrar productos, definir cantidades, precios en COP y fechas de recolección,
 * y revisar la calificación de la IA antes de publicar.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ErrorApi } from '../auth-api';
import {
  crearOferta,
  obtenerCatalogo,
  previsualizarOferta,
  type NuevaOferta,
  type Producto,
  type VistaPreviaOferta,
} from '../profile-api';
import { formatoFecha } from '../formato';
import { routes } from '../routes';
import { useSesion } from '../session-context';
import { FotoCosecha } from './explore';

type Paso = 1 | 2 | 3;

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
  foto: string | null;
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
  { numero: 3, etiqueta: 'Revisar y publicar' },
];

const ERROR_CARGA = 'No pudimos cargar el catálogo. Intente de nuevo.';
const ERROR_PUBLICAR = 'No pudimos publicar su cosecha. Intente de nuevo.';
const ERROR_REVISAR = 'No pudimos revisar su cosecha. Intente de nuevo.';
const ERROR_PODRIDA =
  'La fruta se clasificó en mal estado y no se puede crear la oferta.';
const ERROR_PRODUCTO = 'Elija un producto del catálogo para continuar.';
const ERROR_CANTIDAD = 'La cantidad debe ser un número entero mayor que cero.';
const ERROR_PRECIO =
  'El precio debe ser un valor en pesos mayor que cero, sin decimales.';

const ERROR_FOTO = 'Agregue una foto de la cosecha para continuar.';
const ERROR_FOTO_TIPO = 'La foto debe ser JPG, PNG o WEBP.';
const ERROR_FOTO_PESO = 'La foto no puede pesar más de 6 MB.';

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO_BYTES = 6 * 1024 * 1024;

const BOTON_PRIMARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const BOTON_SECUNDARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-white hover:bg-gray-100 text-[#15803d] text-sm font-semibold border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const CAMPO =
  'w-full h-12 px-4 rounded-xl bg-gray-50 border text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors';
const ETIQUETA = 'block font-semibold text-gray-900';

/** Formatea un número a moneda colombiana (COP). */
const formatoCOP = (valor: number) => `$ ${valor.toLocaleString('es-CO')}`;

/** RF-06: precio en COP y cantidad, enteros y estrictamente mayores que cero. */
const esEnteroPositivo = (valor: string) => {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0;
};

/** Obtiene la fecha local actual en formato YYYY-MM-DD para limitar fechas pasadas. */
const hoy = () => new Date().toLocaleDateString('en-CA');

/** Valida los campos obligatorios del formulario de publicación. */
function validar(
  formulario: Formulario,
  producto: Producto | undefined,
  foto: File | null,
): Errores {
  return {
    producto: producto ? null : ERROR_PRODUCTO,
    cantidad: esEnteroPositivo(formulario.cantidad) ? null : ERROR_CANTIDAD,
    precio: esEnteroPositivo(formulario.precio) ? null : ERROR_PRECIO,
    foto: foto ? null : ERROR_FOTO,
  };
}

/** Comprueba que el archivo sea JPG, PNG o WEBP de máximo 6 MB; devuelve el error o `null`. */
function errorDeFoto(archivo: File): string | null {
  if (!TIPOS_FOTO.includes(archivo.type)) return ERROR_FOTO_TIPO;
  if (archivo.size > MAX_FOTO_BYTES) return ERROR_FOTO_PESO;
  return null;
}

/** Prepara el objeto de la nueva oferta omitiendo campos opcionales vacíos. */
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

function mensajeErrorRevisar(err: unknown) {
  return err instanceof ErrorApi
    ? `No pudimos revisar su cosecha: ${err.message}`
    : ERROR_REVISAR;
}

/** Genera un mensaje de error personalizado para fallos en la publicación. */
const esSesionVencida = (err: unknown) =>
  err instanceof ErrorApi && err.status === 401;

/** Comprueba si el error corresponde a una sesión vencida (401). */
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
 * Componente para mostrar alertas de error.
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
 * Componente para mostrar mensajes de error específicos debajo de un campo de formulario.
 * @component
 */
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

/** Genera los atributos de accesibilidad y estilo para campos con validación de error. */
function conError(id: string, error: string | null) {
  return {
    id,
    'aria-describedby': error ? `${id}-error` : undefined,
    'aria-invalid': Boolean(error),
    className: `${CAMPO} ${error ? 'border-red-500' : 'border-gray-200'}`,
  };
}

/**
 * Componente reutilizable para campos numéricos del formulario.
 * @component
 */
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

/**
 * Zona para arrastrar y soltar (o elegir con clic) la foto de la cosecha, con vista previa.
 * @component
 */
function CampoFoto({
  foto,
  error,
  onFoto,
}: Readonly<{
  foto: File | null;
  error: string | null;
  onFoto: (foto: File) => void;
}>) {
  const [arrastrando, setArrastrando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const vistaPrevia = useMemo(
    () => (foto ? URL.createObjectURL(foto) : null),
    [foto],
  );
  const mostrado = errorLocal ?? error;

  useEffect(() => {
    if (!vistaPrevia) return;
    return () => URL.revokeObjectURL(vistaPrevia);
  }, [vistaPrevia]);

  const recibir = (archivo: File | undefined) => {
    if (!archivo) return;
    const invalido = errorDeFoto(archivo);
    setErrorLocal(invalido);
    if (!invalido) onFoto(archivo);
  };

  return (
    <div className="space-y-2">
      <label className={ETIQUETA} htmlFor="foto">
        Foto de la cosecha
      </label>
      <div
        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed text-center transition-colors ${
          arrastrando
            ? 'border-[#15803d] bg-green-50'
            : 'border-gray-300 bg-gray-50'
        }`}
        data-testid="zona-foto"
        onDragLeave={() => setArrastrando(false)}
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastrando(true);
        }}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastrando(false);
          recibir(evento.dataTransfer.files[0]);
        }}
      >
        {foto && vistaPrevia && !errorLocal ? (
          <>
            <img
              alt="Vista previa de la foto"
              className="max-h-48 rounded-xl object-contain"
              src={vistaPrevia}
            />
            <span className="text-sm text-gray-700">{foto.name}</span>
          </>
        ) : (
          <Icono className="text-4xl text-gray-500" nombre="add_a_photo" />
        )}
        <span className="text-sm text-gray-700">
          Arrastre la foto aquí o haga clic para elegirla
        </span>
        <input
          accept={TIPOS_FOTO.join(',')}
          aria-describedby={mostrado ? 'foto-error' : undefined}
          aria-invalid={Boolean(mostrado)}
          className="text-sm text-gray-600"
          id="foto"
          onChange={(evento) => recibir(evento.target.files?.[0])}
          type="file"
        />
      </div>
      {mostrado && <ErrorCampo id="foto-error">{mostrado}</ErrorCampo>}
    </div>
  );
}

/**
 * Indicador visual del progreso del formulario de múltiples pasos.
 * @component
 */
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

/**
 * Paso 1 del formulario: selección de producto, cantidad, precio y descripción opcional.
 * @component
 */
function PasoDatos({
  productos,
  formulario,
  cambiar,
  foto,
  onFoto,
  onAvanzar,
}: Readonly<{
  productos: Producto[];
  formulario: Formulario;
  cambiar: CambiarCampo;
  foto: File | null;
  onFoto: (foto: File) => void;
  onAvanzar: () => void;
}>) {
  /** Los errores de los campos aparecen después del primer intento de avanzar. */
  const [intento, setIntento] = useState(false);
  const producto = productos.find(
    (item) => item.ProductId === formulario.productoId,
  );
  const unidad = producto?.unitOfMeasure ?? 'unidad';
  const errores = validar(formulario, producto, foto);
  const visibles: Errores = intento
    ? errores
    : { producto: null, cantidad: null, precio: null, foto: null };
  const montosValidos = !errores.cantidad && !errores.precio;

  const avanzar = () => {
    setIntento(true);
    if (!errores.producto && !errores.foto && montosValidos) onAvanzar();
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

      <CampoFoto error={visibles.foto} foto={foto} onFoto={onFoto} />

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

/**
 * Paso 2 del formulario: fecha de cosecha opcional; al continuar se pide la calificación de la IA.
 * @component
 */
function PasoFecha({
  producto,
  formulario,
  cambiar,
  revisando,
  error,
  onVolver,
  onRevisar,
}: Readonly<{
  producto: Producto | undefined;
  formulario: Formulario;
  cambiar: CambiarCampo;
  revisando: boolean;
  error: string | null;
  onVolver: () => void;
  onRevisar: () => void;
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
          disabled={revisando}
          onClick={onRevisar}
          type="button"
        >
          {revisando ? 'Revisando…' : 'Revisar información'}
        </button>
      </div>
    </section>
  );
}

/**
 * Fila del resumen de la cosecha en la revisión (etiqueta y valor).
 * @component
 */
function DatoResumen({
  etiqueta,
  valor,
}: Readonly<{ etiqueta: string; valor: string }>) {
  return (
    <div className="p-4 rounded-xl bg-gray-50">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {etiqueta}
      </dt>
      <dd className="text-sm font-bold text-gray-900">{valor}</dd>
    </div>
  );
}

/**
 * Paso 3 del formulario: resumen de lo que ingresó el agricultor, la foto con el recuadro que dibujó
 * YOLO y la calidad que le asignó el ai-service. Si la fruta salió podrida no se puede publicar.
 * @component
 */
function PasoRevision({
  producto,
  formulario,
  revision,
  publicando,
  error,
  onVolver,
  onPublicar,
}: Readonly<{
  producto: Producto | undefined;
  formulario: Formulario;
  revision: VistaPreviaOferta;
  publicando: boolean;
  error: string | null;
  onVolver: () => void;
  onPublicar: () => void;
}>) {
  const nombre = producto?.name ?? 'Producto';
  const unidad = producto?.unitOfMeasure ?? 'unidad';
  const descripcion = formulario.descripcion.trim();
  const podrida = revision.aiQuality === null;

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-gray-900">
        Paso 3: Revisar y publicar
      </h2>

      <FotoCosecha
        className="w-full aspect-video rounded-xl"
        etiqueta="Foto analizada de"
        nombre={nombre}
        url={revision.annotatedImageUrl}
      />

      {podrida ? (
        <Alerta>{ERROR_PODRIDA}</Alerta>
      ) : (
        <p className="flex items-center justify-center gap-2 p-4 rounded-xl bg-green-50 font-bold text-[#15803d]">
          <Icono className="text-xl text-amber-500" nombre="verified_user" />
          <span>Certificación AgroTrace IA</span>
          <span>{`Calidad ${revision.aiQuality}`}</span>
        </p>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DatoResumen etiqueta="Producto" valor={nombre} />
        <DatoResumen
          etiqueta="Cantidad disponible"
          valor={`${Number(formulario.cantidad).toLocaleString('es-CO')} ${unidad}`}
        />
        <DatoResumen
          etiqueta="Precio de venta"
          valor={`${formatoCOP(Number(formulario.precio))} COP / ${unidad}`}
        />
        {formulario.fecha && (
          <DatoResumen
            etiqueta="Fecha de cosecha"
            valor={formatoFecha(formulario.fecha)}
          />
        )}
        {descripcion && (
          <DatoResumen etiqueta="Descripción" valor={descripcion} />
        )}
      </dl>

      {error && <Alerta>{error}</Alerta>}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button className={BOTON_SECUNDARIO} onClick={onVolver} type="button">
          <Icono className="text-xl" nombre="arrow_back" />
          Volver
        </button>
        <button
          className={`${BOTON_PRIMARIO} flex-1`}
          disabled={podrida || publicando}
          onClick={onPublicar}
          type="button"
        >
          {publicando ? 'Publicando…' : 'Publicar cosecha'}
        </button>
      </div>
    </section>
  );
}

/**
 * Componente de éxito mostrado al finalizar con éxito la publicación de la cosecha.
 * @component
 */
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

/**
 * Página principal de la ruta `/publicar` (`PublicarPage`). Gestiona el estado completo de los pasos
 * de publicación de ofertas agrícolas.
 * @component
 */
export function PublicarPage() {
  const { usuario, salir } = useSesion();
  const esAgricultor = usuario?.role === 'Agricultor';
  const { productos, error: errorCarga } = useCatalogoActivo(
    esAgricultor,
    salir,
  );
  const [paso, setPaso] = useState<Paso>(1);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [foto, setFoto] = useState<File | null>(null);
  const [revision, setRevision] = useState<VistaPreviaOferta | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [publicada, setPublicada] = useState(false);

  if (!usuario) return <Navigate replace to={routes.login} />;
  if (!esAgricultor) return <Navigate replace to={routes.explorar} />;

  const cambiar: CambiarCampo = (campo, valor) =>
    setFormulario((previo) => ({ ...previo, [campo]: valor }));

  const irAPaso = (nuevo: Paso) => {
    setErrorPublicar(null);
    setPaso(nuevo);
  };

  /** Pide a la IA que clasifique la foto, sin crear la oferta, y pasa a la pantalla de revisión. */
  const revisar = async () => {
    if (!foto) return;
    setRevisando(true);
    setErrorPublicar(null);
    try {
      setRevision(await previsualizarOferta(foto));
      setPaso(3);
    } catch (err) {
      if (esSesionVencida(err)) salir();
      else setErrorPublicar(mensajeErrorRevisar(err));
    } finally {
      setRevisando(false);
    }
  };

  const publicar = async () => {
    if (!foto) return;
    setPublicando(true);
    setErrorPublicar(null);
    try {
      await crearOferta(aOferta(formulario), foto);
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
          foto={foto}
          onAvanzar={() => setPaso(2)}
          onFoto={setFoto}
          productos={productos}
        />
      );
    }
    const producto = productos.find(
      (item) => item.ProductId === formulario.productoId,
    );
    if (paso === 3 && revision) {
      return (
        <PasoRevision
          error={errorPublicar}
          formulario={formulario}
          onPublicar={publicar}
          onVolver={() => irAPaso(2)}
          producto={producto}
          publicando={publicando}
          revision={revision}
        />
      );
    }
    return (
      <PasoFecha
        cambiar={cambiar}
        error={errorPublicar}
        formulario={formulario}
        onRevisar={revisar}
        onVolver={() => irAPaso(1)}
        producto={producto}
        revisando={revisando}
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
          Son tres pasos y puede ir con calma: primero nos cuenta qué vende y a
          qué precio, después cuándo se recoge y al final revisa la calificación
          de su cosecha antes de publicar.
        </p>
      </div>
      {!publicada && <Progreso paso={paso} />}
      {contenido()}
    </main>
  );
}
