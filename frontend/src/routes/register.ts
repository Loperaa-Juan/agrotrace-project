/**
 * @file Reglas de validación y utilidades de normalización de datos para el formulario de registro de usuarios.
 * Garantiza que los campos cumplan con las restricciones exigidas por el backend.
 */

import type { TipoDocumento } from './auth-api';

/** Estructura de los datos crudos recolectados en el formulario de registro. */
export type DatosRegistro = {
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  correo: string;
  telefono: string;
  clave: string;
  direccion: string;
  municipio: string;
};

/** Mapeo de errores asociados a cada campo del formulario de registro. */
export type ErroresRegistro = Partial<Record<keyof DatosRegistro, string>>;

/** Orden lógico en que aparecen los campos en el formulario, utilizado para enfocar el primer campo con errores. */
export const ORDEN_CAMPOS: (keyof DatosRegistro)[] = [
  'nombre',
  'tipoDocumento',
  'numeroDocumento',
  'correo',
  'telefono',
  'clave',
  'direccion',
  'municipio',
];

/**
 * Valida si un correo electrónico posee una estructura correcta (usuario@dominio.extensión con al menos un punto, sin espacios).
 * @function esCorreoValido
 * @param {string} correo Correo electrónico a evaluar.
 * @returns {boolean} `true` si el formato es válido, de lo contrario `false`.
 */
function esCorreoValido(correo: string) {
  const partes = correo.split('@');
  if (partes.length !== 2 || /\s/.test(correo)) return false;
  const [usuario, dominio] = partes;
  const etiquetas = dominio.split('.');
  return usuario.length > 0 && etiquetas.length > 1 && etiquetas.every(Boolean);
}

/**
 * Normaliza una cadena de texto eliminando espacios sobrantes al inicio, final y múltiples espacios intermedios.
 * @function normalizarTexto
 * @param {string} texto Texto de entrada.
 * @returns {string} Texto normalizado.
 */
export const normalizarTexto = (texto: string) => texto.trim().replace(/\s+/g, ' ');

/**
 * Normaliza un correo electrónico convirtiéndolo a minúsculas y eliminando espacios extremos.
 * @function normalizarCorreo
 * @param {string} correo Correo de entrada.
 * @returns {string} Correo normalizado.
 */
export const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();

/**
 * Limpia un número de documento eliminando espacios y puntos intermedios.
 * @function normalizarDocumento
 * @param {string} documento Documento de entrada.
 * @returns {string} Documento sin caracteres separadores.
 */
export const normalizarDocumento = (documento: string) => documento.replace(/[\s.]/g, '');

/**
 * Limpia un número telefónico dejando solo los 10 dígitos del celular, removiendo espacios y el indicativo internacional +57 si lo posee.
 * @function normalizarTelefono
 * @param {string} telefono Teléfono de entrada.
 * @returns {string} Número telefónico limpio de 10 dígitos.
 */
export const normalizarTelefono = (telefono: string) =>
  telefono.replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');

/**
 * Remueve tildes y diacríticos de un texto y lo convierte a minúsculas para facilitar comparaciones uniformes.
 * @function sinTildes
 * @param {string} texto Texto de entrada.
 * @returns {string} Texto sin tildes y en minúsculas.
 */
const sinTildes = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Valida los datos del formulario de registro aplicando las mismas reglas de negocio que exige el `users-service`.
 * @function validarRegistro
 * @param {DatosRegistro} datos Datos ingresados por el usuario en el formulario.
 * @param {TipoDocumento[]} documentosPermitidos Lista de tipos de documentos habilitados para el perfil.
 * @returns {ErroresRegistro} Objeto con los mensajes de error encontrados en cada campo (vacío si todo es válido).
 */
export function validarRegistro(
  datos: DatosRegistro,
  documentosPermitidos: TipoDocumento[],
): ErroresRegistro {
  const errores: ErroresRegistro = {};
  const patronDocumento = datos.tipoDocumento === 'NIT' ? /^\d{5,15}(-\d)?$/ : /^\d{5,15}$/;

  if (!normalizarTexto(datos.nombre)) errores.nombre = 'Ingresa tu nombre completo';
  if (!documentosPermitidos.includes(datos.tipoDocumento)) {
    errores.tipoDocumento = 'Este tipo de documento no aplica para tu perfil';
  }
  if (!patronDocumento.test(normalizarDocumento(datos.numeroDocumento))) {
    errores.numeroDocumento = 'Ingresa entre 5 y 15 dígitos';
  }
  if (!esCorreoValido(normalizarCorreo(datos.correo))) errores.correo = 'Ingresa un correo válido';
  if (!/^3\d{9}$/.test(normalizarTelefono(datos.telefono))) {
    errores.telefono = 'Ingresa un celular de 10 dígitos que empiece por 3';
  }
  if (datos.clave.length < 8 || datos.clave.length > 72) {
    errores.clave = 'La contraseña debe tener entre 8 y 72 caracteres';
  }
  if (!normalizarTexto(datos.direccion)) errores.direccion = 'Ingresa tu dirección';
  if (sinTildes(normalizarTexto(datos.municipio)) !== 'envigado') {
    errores.municipio = 'Por ahora solo atendemos Envigado';
  }

  return errores;
}
