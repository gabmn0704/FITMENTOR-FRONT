import { useCallback, useEffect, useState } from "react";
import { parseRoute, routeHref, type RouteId } from "../lib/routes";

/** Ruta actual basada en el hash; sin router externo. */
export function useHashRoute(): [RouteId, (next: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next: RouteId) => {
    if (window.location.hash !== routeHref(next)) window.location.hash = routeHref(next);
    setRoute(next);
  }, []);

  return [route, navigate];
}
