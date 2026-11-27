// REF-R5 (#638, épica REF #633): pie de fuente por panel — nota pequeña
// con token muted, mínimo accesible 0.875rem (cierre REF-R2/REF-R4).

export interface PieDeFuenteProps {
  texto: string;
  id?: string;
}

export function PieDeFuente({ texto, id }: PieDeFuenteProps) {
  return (
    <p className="pie-fuente" id={id}>
      {texto}
    </p>
  );
}
