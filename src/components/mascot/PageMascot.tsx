import { Mascot } from "./Mascot";
import type { MascotState } from "../../lib/mascot";

/** Rep dentro del encabezado de una página: abajo a la derecha, con frases que cambian. */
export function PageMascot({ state = "idle", size = 120 }: { state?: MascotState; size?: number }) {
  return (
    <div className="page-header__mascot">
      <Mascot state={state} size={size} message placement="left" interactive />
    </div>
  );
}
