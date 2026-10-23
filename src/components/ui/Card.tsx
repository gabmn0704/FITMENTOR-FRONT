import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
  interactive?: boolean;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function Card({
  as: Tag = "section",
  interactive,
  title,
  eyebrow,
  action,
  className = "",
  children,
  ...rest
}: CardProps) {
  const classes = ["card", interactive && "card--interactive", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} {...rest}>
      {(title || eyebrow || action) && (
        <header className="card__header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="card__title">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </Tag>
  );
}
