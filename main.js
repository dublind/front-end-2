/* =====================================================================
   ReciclaChile · Lógica de la aplicación
   ---------------------------------------------------------------------
   Cumple los criterios de la evaluación:
     2.1.1  Manipulación dinámica del DOM (crear/editar/eliminar nodos,
            eventos, modo claro/oscuro, render reactivo).
     2.1.2  Validación de formularios + seguridad (sanitización anti-XSS,
            manejo de errores con try...catch y retroalimentación visual).
     2.1.3  Gestión de datos con objetos y arreglos usando métodos de
            orden superior (.map, .filter, .reduce, .find).
     2.1.4  Código modular: funciones de responsabilidad única y utilidades
            reutilizables (principio DRY).
   ===================================================================== */

'use strict';

/* =====================================================================
   1. ESTADO Y CONSTANTES (Criterio 2.1.3 — Objetos y Arreglos)
   ===================================================================== */

/* Arreglo principal: cada residuo registrado es un OBJETO con la misma
   forma. Es la única fuente de verdad de la aplicación. */
let registros = [];

/* Filtro de material actualmente activo. */
let filtroActivo = 'todos';

/* Catálogo de materiales como OBJETO-diccionario. Centraliza el ícono,
   el nombre legible y el factor de CO₂ evitado por kilo (valores
   referenciales con fines educativos). Evita repetir "switch" por todo
   el código (DRY). */
const MATERIALES = {
  papel:    { nombre: 'Papel y cartón', icono: '📄', factorCo2: 0.9 },
  plastico: { nombre: 'Plástico',       icono: '🧴', factorCo2: 1.5 },
  vidrio:   { nombre: 'Vidrio',         icono: '🫙', factorCo2: 0.3 },
  metal:    { nombre: 'Metales',        icono: '🥫', factorCo2: 5.0 },
  organico: { nombre: 'Orgánico',       icono: '🍂', factorCo2: 0.5 },
  tetrapak: { nombre: 'Tetra Pak',      icono: '📦', factorCo2: 0.8 }
};

/* Clave de almacenamiento local del navegador. */
const CLAVE_ALMACEN = 'reciclachile.registros';

/* =====================================================================
   2. REFERENCIAS AL DOM (se cachean una sola vez)
   ===================================================================== */

const form          = document.getElementById('formReciclaje');
const listaEl       = document.getElementById('listaRegistros');
const estadoVacioEl = document.getElementById('estadoVacio');
const avisoGlobal   = document.getElementById('avisoGlobal');
const filtrosEl     = document.getElementById('filtros');
const btnTema       = document.getElementById('btnTema');

/* =====================================================================
   3. UTILIDADES REUTILIZABLES (Criterio 2.1.4 — DRY)
   ===================================================================== */

/**
 * Sanitiza texto del usuario para PREVENIR XSS (Criterio 2.1.2).
 * Convierte caracteres peligrosos en entidades HTML inofensivas, de modo
 * que cualquier intento de inyectar <script> quede como texto plano.
 * @param {string} texto
 * @returns {string} texto seguro
 */
function sanitizarTexto(texto) {
  const temp = document.createElement('div');
  temp.textContent = String(texto); // textContent NO interpreta HTML
  return temp.innerHTML.trim();
}

/**
 * Formatea un número al estilo chileno (coma decimal, 1 decimal).
 * @param {number} n
 * @returns {string}
 */
function formatearNumero(n) {
  return Number(n).toLocaleString('es-CL', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

/**
 * Genera un identificador único simple para cada registro.
 * @returns {string}
 */
function generarId() {
  return 'r-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

/**
 * Calcula el CO₂ evitado por un registro según su material y cantidad.
 * @param {object} registro
 * @returns {number} kg de CO₂
 */
function calcularCo2(registro) {
  const material = MATERIALES[registro.material];
  return material ? registro.cantidad * material.factorCo2 : 0;
}

/* =====================================================================
   4. PERSISTENCIA LOCAL (procesar datos localmente)
   ===================================================================== */

/** Guarda el arreglo de registros en localStorage. */
function guardarEnAlmacen() {
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(registros));
  } catch (error) {
    console.warn('No se pudo guardar localmente:', error);
  }
}

/** Carga los registros guardados al iniciar la app. */
function cargarDesdeAlmacen() {
  try {
    const datos = localStorage.getItem(CLAVE_ALMACEN);
    registros = datos ? JSON.parse(datos) : [];
  } catch (error) {
    console.warn('No se pudieron leer los datos guardados:', error);
    registros = [];
  }
}

/* =====================================================================
   5. VALIDACIÓN DEL FORMULARIO (Criterio 2.1.2)
   ===================================================================== */

/**
 * Muestra u oculta el error de un campo concreto.
 * @param {string} idCampo  id del input/select
 * @param {string} idError  id del <p> de error
 * @param {string} mensaje  texto del error ('' = sin error)
 */
function marcarError(idCampo, idError, mensaje) {
  const campo = document.getElementById(idCampo).closest('.campo');
  const errorEl = document.getElementById(idError);
  errorEl.textContent = mensaje;            // textContent => seguro
  campo.classList.toggle('campo--error', Boolean(mensaje));
}

/**
 * Valida todos los campos. Devuelve un objeto con el resultado.
 * Función de responsabilidad única: solo valida, no toca el estado.
 * @param {object} datos  valores crudos del formulario
 * @returns {{valido: boolean, errores: object}}
 */
function validarFormulario(datos) {
  const errores = {};

  // Material: obligatorio y debe existir en el catálogo.
  if (!datos.material || !MATERIALES[datos.material]) {
    errores.material = 'Debes seleccionar un material válido.';
  }

  // Cantidad: número positivo dentro de un rango razonable.
  const cantidad = parseFloat(datos.cantidad);
  if (isNaN(cantidad) || cantidad <= 0) {
    errores.cantidad = 'Ingresa una cantidad mayor a 0.';
  } else if (cantidad > 500) {
    errores.cantidad = 'El máximo permitido es 500 kg por registro.';
  }

  // Punto/comuna: obligatorio, longitud controlada y sin caracteres raros.
  const punto = datos.punto.trim();
  if (punto.length < 3) {
    errores.punto = 'Indica un punto limpio o comuna (mínimo 3 caracteres).';
  } else if (punto.length > 50) {
    errores.punto = 'Máximo 50 caracteres.';
  } else if (!/^[\wáéíóúñ0-9 .,°#-]+$/i.test(punto)) {
    errores.punto = 'El texto contiene caracteres no permitidos.';
  }

  // Fecha: obligatoria y no puede ser futura.
  if (!datos.fecha) {
    errores.fecha = 'Selecciona una fecha.';
  } else if (new Date(datos.fecha) > new Date()) {
    errores.fecha = 'La fecha no puede ser futura.';
  }

  return { valido: Object.keys(errores).length === 0, errores };
}

/** Pinta en pantalla todos los errores devueltos por la validación. */
function mostrarErrores(errores) {
  marcarError('material', 'errMaterial', errores.material || '');
  marcarError('cantidad', 'errCantidad', errores.cantidad || '');
  marcarError('punto',    'errPunto',    errores.punto    || '');
  marcarError('fecha',    'errFecha',    errores.fecha    || '');
}

/** Muestra un aviso global temporal (éxito o error). */
function mostrarAviso(mensaje, tipo) {
  avisoGlobal.textContent = mensaje;
  avisoGlobal.className = 'aviso aviso--' + tipo;
  setTimeout(() => { avisoGlobal.className = 'aviso'; avisoGlobal.textContent = ''; }, 3500);
}

/* =====================================================================
   6. OPERACIONES SOBRE LOS DATOS (Criterio 2.1.3 — orden superior)
   ===================================================================== */

/** Agrega un nuevo registro al arreglo. */
function agregarRegistro(registro) {
  registros.push(registro);
  guardarEnAlmacen();
}

/**
 * Elimina un registro por id usando .filter() (no muta el original).
 * @param {string} id
 */
function eliminarRegistro(id) {
  registros = registros.filter((registro) => registro.id !== id);
  guardarEnAlmacen();
}

/**
 * Busca un registro por id usando .find().
 * @param {string} id
 * @returns {object|undefined}
 */
function buscarRegistro(id) {
  return registros.find((registro) => registro.id === id);
}

/**
 * Devuelve los registros visibles según el filtro activo (.filter()).
 * @returns {object[]}
 */
function obtenerRegistrosFiltrados() {
  if (filtroActivo === 'todos') return registros;
  return registros.filter((registro) => registro.material === filtroActivo);
}

/**
 * Calcula todas las estadísticas con .reduce(), .map() y demás.
 * @returns {object} resumen agregado
 */
function calcularEstadisticas() {
  // Total de kilos con .reduce()
  const totalKg = registros.reduce((suma, r) => suma + r.cantidad, 0);

  // Total de CO₂ evitado: .map() para transformar y .reduce() para sumar
  const totalCo2 = registros
    .map(calcularCo2)
    .reduce((suma, co2) => suma + co2, 0);

  // Material principal: acumula kilos por material con .reduce()
  const kgPorMaterial = registros.reduce((acc, r) => {
    acc[r.material] = (acc[r.material] || 0) + r.cantidad;
    return acc;
  }, {});

  // Encuentra la clave con más kilos
  const topMaterial = Object.keys(kgPorMaterial).reduce(
    (top, clave) => (kgPorMaterial[clave] > (kgPorMaterial[top] || 0) ? clave : top),
    null
  );

  return {
    totalKg,
    totalCo2,
    cantidadRegistros: registros.length,
    topMaterial: topMaterial ? MATERIALES[topMaterial].nombre : '—'
  };
}

/* =====================================================================
   7. RENDERIZADO DEL DOM (Criterio 2.1.1)
   ===================================================================== */

/**
 * Construye el nodo DOM de una tarjeta de registro de forma SEGURA.
 * Usa createElement + textContent en lugar de innerHTML con datos del
 * usuario, lo que neutraliza cualquier intento de XSS.
 * @param {object} registro
 * @returns {HTMLElement}
 */
function crearTarjeta(registro) {
  const material = MATERIALES[registro.material];
  const co2 = calcularCo2(registro);

  const tarjeta = document.createElement('article');
  tarjeta.className = 'registro';
  tarjeta.dataset.id = registro.id;

  // Ícono
  const icono = document.createElement('div');
  icono.className = 'registro__icono';
  icono.textContent = material.icono;

  // Datos (material + meta). textContent evita inyección de HTML.
  const datos = document.createElement('div');
  datos.className = 'registro__datos';

  const nombre = document.createElement('span');
  nombre.className = 'registro__material';
  nombre.textContent = material.nombre;

  const meta = document.createElement('span');
  meta.className = 'registro__meta';
  const lugar = document.createElement('span');
  lugar.textContent = registro.punto;        // dato del usuario => seguro
  meta.append('📍 ', lugar, ' · ' + formatearFecha(registro.fecha));

  datos.append(nombre, meta);

  // Cifras
  const cifras = document.createElement('div');
  cifras.className = 'registro__cifras';
  const kg = document.createElement('span');
  kg.className = 'registro__kg';
  kg.textContent = formatearNumero(registro.cantidad) + ' kg';
  const co2El = document.createElement('span');
  co2El.className = 'registro__co2';
  co2El.textContent = '−' + formatearNumero(co2) + ' kg CO₂';
  cifras.append(kg, co2El);

  // Acciones (eliminar)
  const acciones = document.createElement('div');
  acciones.className = 'registro__acciones';
  const btnBorrar = document.createElement('button');
  btnBorrar.className = 'icono-btn icono-btn--borrar';
  btnBorrar.type = 'button';
  btnBorrar.textContent = '🗑';
  btnBorrar.setAttribute('aria-label', 'Eliminar registro de ' + material.nombre);
  btnBorrar.addEventListener('click', () => manejarEliminar(registro.id, tarjeta));
  acciones.append(btnBorrar);
  cifras.append(acciones);

  tarjeta.append(icono, datos, cifras);
  return tarjeta;
}

/** Formatea una fecha ISO a formato chileno dd-mm-aaaa. */
function formatearFecha(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}-${m}-${a}`;
}

/**
 * Renderiza la lista completa (crea/elimina nodos del DOM).
 * Usa .map() para transformar cada objeto en una tarjeta.
 */
function renderizarLista() {
  const visibles = obtenerRegistrosFiltrados();

  listaEl.innerHTML = '';                    // limpia el contenedor
  const tarjetas = visibles.map(crearTarjeta); // datos -> nodos DOM
  tarjetas.forEach((tarjeta) => listaEl.appendChild(tarjeta));

  // Alterna el estado vacío
  estadoVacioEl.style.display = visibles.length === 0 ? 'block' : 'none';
}

/** Actualiza el panel de estadísticas en el DOM. */
function renderizarEstadisticas() {
  const stats = calcularEstadisticas();
  document.getElementById('statTotalKg').textContent = formatearNumero(stats.totalKg);
  document.getElementById('statCo2').textContent = formatearNumero(stats.totalCo2);
  document.getElementById('statRegistros').textContent = stats.cantidadRegistros;
  document.getElementById('statTopMaterial').textContent = stats.topMaterial;
}

/** Render maestro: actualiza lista + estadísticas en un solo lugar (DRY). */
function actualizarVista() {
  renderizarLista();
  renderizarEstadisticas();
}

/* =====================================================================
   8. MANEJADORES DE EVENTOS (Criterio 2.1.1)
   ===================================================================== */

/** Establece la fecha de hoy como valor y tope del campo fecha. */
function establecerFechaHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  form.fecha.value = hoy;
  form.fecha.max = hoy;
}

/** Maneja el envío del formulario con manejo de errores (try...catch). */
function manejarEnvio(evento) {
  evento.preventDefault();
  try {
    // Lee los valores crudos del formulario
    const datos = {
      material: form.material.value,
      cantidad: form.cantidad.value,
      punto:    form.punto.value,
      fecha:    form.fecha.value
    };

    // Valida
    const { valido, errores } = validarFormulario(datos);
    mostrarErrores(errores);
    if (!valido) {
      mostrarAviso('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    // Construye el OBJETO registro con datos ya saneados
    const registro = {
      id: generarId(),
      material: datos.material,
      cantidad: parseFloat(datos.cantidad),
      punto: sanitizarTexto(datos.punto),   // anti-XSS
      fecha: datos.fecha
    };

    agregarRegistro(registro);
    actualizarVista();
    form.reset();
    establecerFechaHoy();
    mostrarAviso('¡Registro agregado! Gracias por reciclar 🌿', 'exito');

  } catch (error) {
    // Cualquier fallo inesperado se captura aquí sin romper la app
    console.error('Error al guardar el registro:', error);
    mostrarAviso('Ocurrió un error inesperado. Intenta nuevamente.', 'error');
  }
}

/** Maneja la eliminación de un registro con animación de salida. */
function manejarEliminar(id, tarjeta) {
  if (!buscarRegistro(id)) return;
  tarjeta.classList.add('saliendo');
  tarjeta.addEventListener('animationend', () => {
    eliminarRegistro(id);
    actualizarVista();
    mostrarAviso('Registro eliminado.', 'exito');
  }, { once: true });
}

/** Maneja el cambio de filtro (delegación de eventos). */
function manejarFiltro(evento) {
  const chip = evento.target.closest('.chip');
  if (!chip) return;
  filtroActivo = chip.dataset.filtro;

  // Actualiza el chip activo en el DOM
  filtrosEl.querySelectorAll('.chip').forEach((c) =>
    c.classList.toggle('chip--activo', c === chip)
  );
  renderizarLista();
}

/** Alterna entre modo claro y oscuro (manipulación de atributos del DOM). */
function manejarTema() {
  const esOscuro = document.body.dataset.tema === 'oscuro';
  document.body.dataset.tema = esOscuro ? 'claro' : 'oscuro';

  btnTema.querySelector('.btn-tema__texto').textContent = esOscuro ? 'Modo oscuro' : 'Modo claro';
  btnTema.querySelector('.btn-tema__icono').textContent = esOscuro ? '☾' : '☀';
  btnTema.setAttribute('aria-pressed', String(!esOscuro));
}

/** Limpia los errores visuales al reiniciar el formulario. */
function manejarReset() {
  mostrarErrores({});
  avisoGlobal.className = 'aviso';
  avisoGlobal.textContent = '';
  // El reset nativo vacía la fecha; la restauramos tras completarse.
  setTimeout(establecerFechaHoy, 0);
}

/* =====================================================================
   9. INICIALIZACIÓN
   ===================================================================== */

/** Conecta todos los eventos y dibuja el estado inicial. */
function iniciarApp() {
  cargarDesdeAlmacen();
  actualizarVista();

  form.addEventListener('submit', manejarEnvio);
  form.addEventListener('reset', manejarReset);
  filtrosEl.addEventListener('click', manejarFiltro);
  btnTema.addEventListener('click', manejarTema);

  // Fecha por defecto: hoy, y límite máximo = hoy
  establecerFechaHoy();
}

// Arranca cuando el DOM está listo
document.addEventListener('DOMContentLoaded', iniciarApp);
