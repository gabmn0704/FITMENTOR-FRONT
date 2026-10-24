import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
  interactive?: boolean;
  title?: string;
  action?: ReactNode;
}

export function Card({
  as: Tag = "section",
  interactive,
  title,
  action,
  className = "",
  children,
  ...rest
}: CardProps) {
  const classes = ["card", interactive && "card--interactive", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes} {...rest}>
      {(title || action) && (
        <header className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </Tag>
  );
}
