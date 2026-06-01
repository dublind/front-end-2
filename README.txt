============================================================
 RECICLACHILE — Gestor de residuos reciclables del hogar
 Evaluación Sumativa 2 · Programación Frontend
============================================================

------------------------------------------------------------
1. DESCRIPCIÓN DEL PROYECTO
------------------------------------------------------------
ReciclaChile es una aplicación web funcional que aborda una
problemática actual chilena: la gestión domiciliaria de residuos
reciclables en el marco de la Ley REP (Ley 20.920 de
Responsabilidad Extendida del Productor).

La aplicación permite a una persona o familia:
  - Registrar cuánto reciclan, de qué material y en qué punto
    limpio o comuna.
  - Visualizar en tiempo real su impacto: kilos totales, CO₂
    evitado (estimación referencial), número de registros y
    material que más recicla.
  - Filtrar los registros por tipo de material.
  - Eliminar registros y alternar entre modo claro y oscuro.

Los datos se procesan localmente en el navegador (localStorage),
por lo que no se envía información a ningún servidor.

------------------------------------------------------------
2. ESTRUCTURA DEL PROYECTO
------------------------------------------------------------
  reciclachile/
  ├── index.html        Estructura HTML semántica y formulario
  ├── css/
  │   └── style.css      Estilos, variables CSS, modo claro/oscuro
  ├── js/
  │   └── main.js        Toda la lógica de la aplicación
  └── README.txt         Este archivo

------------------------------------------------------------
3. CÓMO EJECUTAR
------------------------------------------------------------
Abre el archivo index.html en cualquier navegador moderno.
No requiere instalación ni dependencias. Para publicarlo en
GitHub Pages: Settings > Pages > Branch: main > /root.

------------------------------------------------------------
4. CÓMO SE CUMPLE CADA CRITERIO
------------------------------------------------------------
2.1.1 Manipulación dinámica del DOM
  - crearTarjeta() crea nodos con createElement.
  - renderizarLista() inserta y elimina tarjetas dinámicamente.
  - manejarTema() alterna modo claro/oscuro vía data-attributes.
  - Eventos: submit, click, reset y delegación en los filtros.

2.1.2 Validación, seguridad e IA
  - validarFormulario() valida material, cantidad, punto y fecha.
  - sanitizarTexto() neutraliza ataques XSS.
  - manejarEnvio() usa try...catch y retroalimentación visual
    accesible (role="alert", aria-live, color + texto).

2.1.3 Arreglos y objetos
  - Cada residuo es un OBJETO; se agrupan en el arreglo "registros".
  - Se usan .map(), .filter(), .reduce() y .find() para procesar
    datos (ver calcularEstadisticas, eliminarRegistro, buscarRegistro).

2.1.4 Modularidad y buenas prácticas
  - Funciones de responsabilidad única y utilidades reutilizables
    (sanitizarTexto, formatearNumero, calcularCo2) — principio DRY.

------------------------------------------------------------
5. BITÁCORA DE PROMPTS DE IA (Prompt Engineering Log)
------------------------------------------------------------

PROMPT 1 — Seguridad de las validaciones (Criterio 2.1.2)
.........................................................
Prompt utilizado:
  "Estoy capturando texto libre de un usuario en un formulario
   y lo muestro luego en una tarjeta. ¿Cómo evito una
   vulnerabilidad XSS en JavaScript puro, sin frameworks?"

Sugerencia adoptada:
  La IA recomendó NO usar innerHTML con datos del usuario y, en su
  lugar, usar textContent o crear nodos con createElement. También
  sugirió una función de saneamiento que convierte caracteres como
  < > & en entidades HTML.

Reflexión:
  Adopté ambas ideas. La función sanitizarTexto() escapa el texto y,
  además, todo el render de datos del usuario usa textContent en vez
  de innerHTML (ver crearTarjeta). Así, aunque alguien escriba
  "<script>alert(1)</script>" como nombre de comuna, se muestra como
  texto inofensivo y nunca se ejecuta.


PROMPT 2 — Eficiencia de las estructuras de datos (Criterio 2.1.3)
..................................................................
Prompt utilizado:
  "Tengo un arreglo de objetos {material, cantidad}. Quiero calcular
   el total de kilos y agrupar los kilos por material para saber cuál
   es el material más reciclado. ¿Conviene usar bucles for o métodos
   de arreglo? ¿Cuál es más eficiente y legible?"

Sugerencia adoptada:
  La IA explicó que .reduce() es la opción idónea para acumular un
  total o construir un objeto-acumulador en una sola pasada, y que
  .map() + .reduce() encadenados son más declarativos y legibles que
  varios for anidados para transformar y luego sumar.

Reflexión:
  Reemplacé los bucles for por .reduce() en calcularEstadisticas():
  un reduce para el total de kilos, map+reduce para el CO₂ y otro
  reduce para agrupar kilos por material. El código quedó más corto,
  más fácil de leer y recorre el arreglo el mínimo de veces necesario.

============================================================
