/** Formatea una fecha local evitando desfases por zona horaria. */
export const formatoFecha = (fecha: string) =>
  new Date(`${fecha}T00:00:00`).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
