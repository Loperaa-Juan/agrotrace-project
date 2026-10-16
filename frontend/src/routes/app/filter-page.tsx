import { useEffect, useState } from 'react';
import {
  obtenerCatalogo,
  obtenerOfertas,
  type Oferta,
  type Producto,
} from '../perfil-api';

function FilterPage() {
  const [nombre, setNombre] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [calidad, setCalidad] = useState('');
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

  const nombreDe = (productId: string) =>
    productos.find((producto) => producto.ProductId === productId)?.name ?? '';

  const ofertasFiltradas = ofertas.filter(
    (oferta) =>
      nombreDe(oferta.productId).toLowerCase().includes(busqueda.toLowerCase()) &&
      (calidad === '' || oferta.aiQuality === calidad) &&
      (precioMaximo === '' || oferta.pricePerUnit <= Number(precioMaximo)),
  );

  return (
    <div>
      <h1>Encuentra tu cosecha</h1>
      <input
        id="input-filtro"
        type="text"
        placeholder="Filtra por nombre de producto"
        value={nombre}
        onChange={(evento) => setNombre(evento.target.value)}
      />
      <button
        type="button"
        disabled={nombre === ''}
        onClick={() => setBusqueda(nombre)}
      >
        Enviar
      </button>
      <label htmlFor="filtro-calidad">Calidad</label>
      <select
        id="filtro-calidad"
        value={calidad}
        onChange={(evento) => setCalidad(evento.target.value)}
      >
        <option value="">Todas</option>
        <option value="A">A</option>
        <option value="B">B</option>
      </select>
      <label htmlFor="filtro-precio-maximo">Precio máximo</label>
      <input
        id="filtro-precio-maximo"
        type="number"
        value={precioMaximo}
        onChange={(evento) => setPrecioMaximo(evento.target.value)}
      />
      <ul>
        {ofertasFiltradas.map((oferta) => (
          <li key={oferta.OffertId}>
            <h2>{nombreDe(oferta.productId)}</h2>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FilterPage;
