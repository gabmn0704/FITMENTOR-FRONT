interface PoseArtProps {
  className?: string;
  /** Muestra las etiquetas de ángulo sobre las articulaciones. */
  labels?: boolean;
}

/** Ilustración vectorial de una sentadilla con articulaciones y ángulos medidos. */
export function PoseArt({ className, labels = true }: PoseArtProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 480"
      role="img"
      aria-label="Esqueleto de una sentadilla con los ángulos de rodilla y cadera medidos"
      focusable="false"
    >
      <defs>
        <linearGradient id="pose-line" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--lime)" />
          <stop offset="1" stopColor="var(--orange)" />
        </linearGradient>
      </defs>
      <g className="pose-grid" stroke="var(--surface-border)" strokeWidth="1">
        {[80, 160, 240, 320].map((x) => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="480" />
        ))}
        {[96, 192, 288, 384].map((y) => (
          <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} />
        ))}
      </g>
      <g fill="none" stroke="url(#pose-line)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M200 92 L200 190" />
        <path d="M200 190 L148 268 L228 330" />
        <path d="M228 330 L150 330" />
        <path d="M200 140 L262 188 L318 168" />
        <path d="M200 140 L142 196" />
      </g>
      <g fill="var(--bg)" stroke="var(--lime)" strokeWidth="4">
        <circle cx="200" cy="64" r="26" />
        {[
          [200, 140],
          [200, 190],
          [148, 268],
          [228, 330],
          [262, 188],
          [142, 196],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" />
        ))}
      </g>
      <g fill="none" stroke="var(--orange)" strokeWidth="2.5" strokeDasharray="5 6">
        <path d="M174 214 A42 42 0 0 0 168 258" />
        <path d="M168 250 A40 40 0 0 1 200 306" />
      </g>
      {labels && (
        <g fontFamily="var(--font-mono)" fontSize="15" fontWeight="600">
          <g transform="translate(58 244)">
            <rect width="70" height="28" rx="14" fill="var(--bg-elevated)" stroke="var(--orange)" />
            <text x="35" y="19" textAnchor="middle" fill="var(--text)">
              92°
            </text>
          </g>
          <g transform="translate(236 244)">
            <rect width="70" height="28" rx="14" fill="var(--bg-elevated)" stroke="var(--lime)" />
            <text x="35" y="19" textAnchor="middle" fill="var(--text)">
              78°
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
