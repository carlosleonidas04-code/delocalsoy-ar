/**
 * Demo TV por teclado/HDMI - UX-004 (#228). Prototipo de LABORATORIO:
 * valida jerarquia, overscan, legibilidad 10-foot y navegacion D-pad
 * consumiendo el contrato REAL de UX-002 (#223): InputManager + spatialDom.
 *
 * R15 (declaracion honesta):
 * - El perfil TV esta FORZADO solo dentro de este demo (en producto la
 *   plataforma la detecta UX-002; nunca se fuerza).
 * - El dato es ilustrativo (fichas.ts: isSynthetic) y se declara en el pie.
 * - Sin TWA, sin fecha de Play, sin promesa de Android TV: si algun dia se
 *   prueba en hardware real, se abre verificacion separada (decision DH).
 */
import { InputManager } from '../platform/InputManager';
import { collectFocusables, rectOf } from '../platform/spatialDom';
import {
  FICHAS_DEMO,
  ETIQUETA_CATEGORIA,
  ETIQUETA_ESTADO,
  ETIQUETA_NODO,
  type FichaIlustrativa,
} from './fichas';
import './estilos.css';

function iniciarDemoTv(): void {
  const raiz = document.getElementById('raiz-demo-tv');
  if (raiz === null) return; // este script solo vive en demo-tv.html

  raiz.className = 'demo-tv';

  const zonaSegura = document.createElement('div');
  zonaSegura.className = 'demo-tv__zona-segura';

  const encabezado = document.createElement('header');
  encabezado.className = 'demo-tv__encabezado';
  const titulo = document.createElement('h1');
  titulo.className = 'demo-tv__titulo';
  titulo.textContent = 'DELocalSoy.AR ';
  const marca = document.createElement('small');
  marca.textContent = '- perfil TV (demo de laboratorio, UX-004)';
  titulo.appendChild(marca);
  const controles = document.createElement('p');
  controles.className = 'demo-tv__controles';
  controles.textContent =
    'D-pad: flechas mueven - Enter abre detalle - Back/Escape cierra';
  encabezado.appendChild(titulo);
  encabezado.appendChild(controles);

  const grilla = document.createElement('div');
  grilla.className = 'demo-tv__grilla';

  const detalle = document.createElement('section');
  detalle.className = 'demo-tv__detalle';
  detalle.setAttribute('role', 'status');
  detalle.setAttribute('aria-live', 'polite');

  const pie = document.createElement('footer');
  pie.className = 'demo-tv__pie';
  pie.textContent =
    'Demo de laboratorio UX-004: dato ilustrativo, perfil TV forzado, sin TWA ni fecha. ' +
    'La estetica es provisional y converge con agent.google (ADR-034).';

  for (const ficha of FICHAS_DEMO) {
    grilla.appendChild(crearFicha(ficha));
  }

  function mensajeNeutro(): void {
    const h = document.createElement('h2');
    h.textContent = 'Sin ficha seleccionada';
    const p = document.createElement('p');
    p.textContent = 'Enter abre el detalle de la ficha con foco.';
    detalle.replaceChildren(h, p);
  }

  function abrirDetalle(id: string): void {
    const ficha = FICHAS_DEMO.find((f) => f.id === id);
    if (ficha === undefined) return;
    const h = document.createElement('h2');
    h.textContent = ficha.titulo;
    const meta = document.createElement('p');
    meta.textContent =
      ETIQUETA_NODO[ficha.nodo] +
      ' - ' +
      ETIQUETA_CATEGORIA[ficha.categoria] +
      ' - ' +
      ETIQUETA_ESTADO[ficha.estado] +
      ' - fuente: ' +
      ficha.fuente;
    const cuerpo = document.createElement('p');
    cuerpo.textContent = ficha.detalle;
    detalle.replaceChildren(h, meta, cuerpo);
  }

  function crearFicha(ficha: FichaIlustrativa): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'demo-tv__ficha delocal-focusable';
    btn.dataset.fichaId = ficha.id;
    btn.setAttribute(
      'aria-label',
      ficha.titulo + ' - ' + ETIQUETA_ESTADO[ficha.estado],
    );
    const cat = document.createElement('span');
    cat.className = 'demo-tv__ficha-categoria';
    cat.textContent = ETIQUETA_CATEGORIA[ficha.categoria];
    const t = document.createElement('span');
    t.className = 'demo-tv__ficha-titulo';
    t.textContent = ficha.titulo;
    const meta = document.createElement('span');
    meta.className = 'demo-tv__ficha-meta';
    meta.textContent = ETIQUETA_NODO[ficha.nodo] + ' - ' + ETIQUETA_ESTADO[ficha.estado];
    btn.appendChild(cat);
    btn.appendChild(t);
    btn.appendChild(meta);
    btn.addEventListener('click', () => abrirDetalle(ficha.id));
    return btn;
  }

  // InputManager de UX-002 con perfil TV forzado (declarado en el header).
  const input = new InputManager<HTMLElement>({
    platform: () => 'tv',
    focusables: () => collectFocusables(raiz),
    focusedRect: () =>
      rectOf(document.activeElement instanceof HTMLElement ? document.activeElement : null),
    focus: (el) => el.focus(),
    onBack: () => mensajeNeutro(),
  });

  raiz.addEventListener('keydown', (ev) => {
    const manejado = input.handleKeyDown(ev);
    if (manejado === 'moved' || manejado === 'back') {
      return;
    }
    if (ev.key === 'Enter') {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.dataset.fichaId !== undefined) {
        ev.preventDefault();
        abrirDetalle(el.dataset.fichaId);
      }
    }
  });

  zonaSegura.appendChild(encabezado);
  zonaSegura.appendChild(grilla);
  zonaSegura.appendChild(detalle);
  zonaSegura.appendChild(pie);
  raiz.appendChild(zonaSegura);

  mensajeNeutro();

  const primera = grilla.querySelector('button');
  if (primera instanceof HTMLElement) {
    primera.focus();
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  iniciarDemoTv();
}
