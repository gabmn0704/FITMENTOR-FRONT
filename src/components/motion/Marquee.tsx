interface MarqueeProps {
  items: string[];
  /** Etiqueta accesible; el contenido repetido se oculta a lectores de pantalla. */
  label: string;
}

/** Cinta de texto que se desplaza sin fin. Se duplica el contenido para que el bucle no tenga saltos. */
export function Marquee({ items, label }: MarqueeProps) {
  return (
    <div className="marquee" role="group" aria-label={label}>
      <div className="marquee__track" aria-hidden="true">
        {[0, 1].map((copy) => (
          <ul className="marquee__list" key={copy}>
            {items.map((item) => (
              <li key={item}>
                <span className="marquee__dot" />
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
      <span className="sr-only">{items.join(", ")}</span>
    </div>
  );
}
