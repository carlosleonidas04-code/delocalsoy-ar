/**
 * DELocalSoy.AR — Navegación de destinos (REF-R3 #636, épica REF #633)
 * IA de 5 destinos + 3 capas: barra inferior fija en móvil, barra horizontal
 * en escritorio (styles.css). Links REALES de hash (navegación nativa del
 * navegador, 0 JS de routing) con aria-current (patrón PROT-A1 R3: NO
 * role=tab, decisión REF-R1). Touch 44 px (patrón EV-122). Estilos SOLO con
 * tokens (el anillo de foco de 3 px de REF-R2 cubre los links).
 * Regla M0: App monta UNA instancia; este archivo NO toca App.tsx ni main.tsx.
 */
import { DESTINOS_IA } from '../lib/navegacionIA';
import type { DestinoIA } from '../lib/navegacionIA';

export interface PropsNavDestinos {
  destinoActivo: DestinoIA;
}

export function NavDestinos({ destinoActivo }: PropsNavDestinos) {
  return (
    <nav className="nav-destinos" aria-label="Destinos de la plataforma">
      <ul>
        {DESTINOS_IA.map((d) => (
          <li key={d.id}>
            <a
              href={d.hash === '' ? '#' : d.hash}
              aria-current={destinoActivo === d.id ? 'page' : undefined}
              title={d.descripcion}
            >
              {d.titulo}
            </a>
          </li>
        ))}
        <li>
          <a
            href="#lab"
            aria-current={destinoActivo === 'lab' ? 'page' : undefined}
            title="Transparencia: registro de aterrizajes, reglas y decisiones (equipo y auditoría)"
          >
            Transparencia
          </a>
        </li>
      </ul>
    </nav>
  );
}

export default NavDestinos;
