import type { MascotState } from "../../lib/mascot";

type Gsap = typeof import("gsap").gsap;

/*
 * Movimiento de Rep con GSAP. Cada estado arma su línea de tiempo sobre las capas internas del SVG
 * (`.m-rig`, `.m-torso`, `.m-arm`, `.m-fore`, `.m-lid`…): las capas externas guardan la pose de reposo,
 * así que revertir una línea de tiempo deja a Rep exactamente como lo dibujó React.
 * Se llama dentro de `gsap.matchMedia()` con movimiento permitido; al revertirse se limpia sola.
 */

const FEET = "60 134";
const HIPS = "60 114";
const KNOT = "97 46.5";
const JOINT = "0 0";
const CONFETTI = ["#ff3d1f", "#ffc400", "#3b5bff", "#ffffff", "#8f46ff", "#22d3a6"];
const SVG_NS = "http://www.w3.org/2000/svg";

/** Respiración, puntas de la cinta y parpadeo: lo que Rep hace siempre que no esté saltando. */
function alive(gsap: Gsap, q: (s: string) => Element[], state: MascotState) {
  const deep = state === "rest";
  gsap.to(q(".m-torso"), {
    scaleY: deep ? 1.04 : 1.024,
    scaleX: deep ? 0.985 : 0.992,
    svgOrigin: HIPS,
    duration: deep ? 2.4 : 1.7,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
  gsap.to(q(".m-arm"), { y: deep ? 0.8 : 0.5, duration: deep ? 2.4 : 1.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.fromTo(q(".m-tail--a"), { rotation: -6 }, { rotation: 8, svgOrigin: KNOT, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.fromTo(
    q(".m-tail--b"),
    { rotation: 6 },
    { rotation: -7, svgOrigin: KNOT, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.2 },
  );

  if (deep || state === "cheer" || state === "celebrate") return;
  // Parpadeos con ritmo irregular (uno doble) en un ciclo de unos diez segundos.
  const lids = q(".m-lid");
  const blink = gsap.timeline({ repeat: -1, delay: 0.6 });
  for (const at of [0.4, 3.6, 3.85, 8.2]) {
    blink.to(lids, { y: 21, duration: 0.07, ease: "power2.in" }, at).to(lids, { y: 0, duration: 0.12, ease: "power2.out" }, at + 0.08);
  }
  blink.to({}, { duration: 1.6 });
}

/** Salto con squash & stretch: se agacha, se estira en el aire y se aplasta al caer. */
function hop(gsap: Gsap, q: (s: string) => Element[], height: number, gap: number) {
  const rig = q(".m-rig");
  const shadow = q(".m-shadow");
  const tl = gsap.timeline({ repeat: -1, repeatDelay: gap });
  tl.to(rig, { scaleY: 0.86, scaleX: 1.1, svgOrigin: FEET, duration: 0.16, ease: "power2.out" })
    .to(rig, { y: -height, scaleY: 1.1, scaleX: 0.93, svgOrigin: FEET, duration: 0.3, ease: "power3.out" })
    .to(shadow, { scale: 0.62, opacity: 0.5, svgOrigin: "60 135", duration: 0.3, ease: "power3.out" }, "<")
    .to(rig, { scaleY: 1, scaleX: 1, svgOrigin: FEET, duration: 0.14, ease: "sine.inOut" }, ">-0.08")
    .to(rig, { y: 0, scaleY: 1.06, scaleX: 0.95, svgOrigin: FEET, duration: 0.26, ease: "power2.in" })
    .to(shadow, { scale: 1, opacity: 1, svgOrigin: "60 135", duration: 0.26, ease: "power2.in" }, "<")
    .to(rig, { scaleY: 0.88, scaleX: 1.09, svgOrigin: FEET, duration: 0.09, ease: "power2.out" })
    .to(rig, { scaleY: 1, scaleX: 1, svgOrigin: FEET, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  // Las rodillas se doblan al tomar impulso y al caer.
  tl.to(q(".m-shin"), { rotation: (i) => (i === 0 ? 14 : -14), svgOrigin: JOINT, duration: 0.16, ease: "power2.out" }, 0)
    .to(q(".m-shin"), { rotation: 0, svgOrigin: JOINT, duration: 0.24, ease: "power2.out" }, 0.18)
    .to(q(".m-shin"), { rotation: (i) => (i === 0 ? 12 : -12), svgOrigin: JOINT, duration: 0.09 }, 0.92)
    .to(q(".m-shin"), { rotation: 0, svgOrigin: JOINT, duration: 0.4, ease: "elastic.out(1, 0.5)" }, 1.01);
  return tl;
}

/** Chispas de confeti que salen de Rep, suben y caen girando. Se crean aquí y se borran al revertir. */
function confetti(gsap: Gsap, svg: SVGSVGElement, every: number) {
  const host = svg.querySelector(".m-confetti");
  if (!host) return () => undefined;
  const bits: SVGElement[] = [];
  for (let i = 0; i < 18; i += 1) {
    const shape = i % 3;
    const el = document.createElementNS(SVG_NS, shape === 0 ? "circle" : shape === 1 ? "rect" : "path");
    if (shape === 0) {
      el.setAttribute("r", "1.9");
    } else if (shape === 1) {
      el.setAttribute("x", "-1.4");
      el.setAttribute("y", "-3");
      el.setAttribute("width", "2.8");
      el.setAttribute("height", "6");
      el.setAttribute("rx", "0.8");
    } else {
      el.setAttribute("d", "M0 -4l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z");
    }
    el.setAttribute("fill", CONFETTI[i % CONFETTI.length]);
    host.appendChild(el);
    bits.push(el);
  }
  const tl = gsap.timeline({ repeat: -1, repeatDelay: every, repeatRefresh: true });
  bits.forEach((bit, i) => {
    const angle = (i / bits.length) * Math.PI * 2;
    tl.fromTo(
      bit,
      { x: 60, y: 46, scale: 0, opacity: 1, rotation: 0 },
      {
        x: () => 60 + Math.cos(angle) * gsap.utils.random(34, 58),
        y: () => 46 + Math.sin(angle) * gsap.utils.random(26, 44) - 14,
        scale: () => gsap.utils.random(0.7, 1.3),
        rotation: () => gsap.utils.random(-220, 220),
        duration: 0.55,
        ease: "power3.out",
      },
      0,
    ).to(bit, { y: "+=34", opacity: 0, rotation: "+=120", duration: 0.9, ease: "power1.in" }, 0.5);
  });
  return () => {
    tl.kill();
    bits.forEach((bit) => bit.remove());
  };
}

export function animateMascot(gsap: Gsap, svg: SVGSVGElement, state: MascotState): (() => void) | void {
  const q = gsap.utils.selector(svg) as (s: string) => Element[];
  alive(gsap, q, state);

  switch (state) {
    case "idle": {
      // Mira de reojo, levanta la mancuerna de vez en cuando y se balancea.
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.8, delay: 1.2 });
      tl.to(q(".m-fore--r"), { rotation: 70, svgOrigin: JOINT, duration: 0.5, ease: "power2.inOut" })
        .to(q(".m-fore--r"), { rotation: 0, svgOrigin: JOINT, duration: 0.6, ease: "power2.inOut" }, "+=0.15")
        .to(q(".m-fore--r"), { rotation: 70, svgOrigin: JOINT, duration: 0.5, ease: "power2.inOut" })
        .to(q(".m-fore--r"), { rotation: 0, svgOrigin: JOINT, duration: 0.6, ease: "power2.inOut" }, "+=0.15")
        .to(q(".m-mouth"), { scaleX: 0.86, svgOrigin: "60 83", duration: 0.25, yoyo: true, repeat: 3 }, 0);
      gsap.to(q(".m-rig"), { rotation: 1.6, svgOrigin: FEET, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      return;
    }
    case "wave": {
      gsap.fromTo(
        q(".m-fore--r"),
        { rotation: -26 },
        { rotation: 22, svgOrigin: JOINT, duration: 0.3, ease: "sine.inOut", yoyo: true, repeat: -1 },
      );
      gsap.fromTo(q(".m-arm--r"), { rotation: -4 }, { rotation: 6, svgOrigin: JOINT, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(q(".m-rig"), { rotation: -2 }, { rotation: 3, svgOrigin: FEET, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(q(".m-brows"), { y: 0 }, { y: -2, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
      return;
    }
    case "cheer": {
      hop(gsap, q, 12, 0.25);
      gsap.fromTo(q(".m-arm--l"), { rotation: -14 }, { rotation: 14, svgOrigin: JOINT, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(q(".m-arm--r"), { rotation: 14 }, { rotation: -14, svgOrigin: JOINT, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(
        q(".m-spark"),
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(3)", stagger: { each: 0.12, repeat: -1, yoyo: true } },
      );
      return;
    }
    case "count": {
      // Curl con la mancuerna y media sentadilla; la boca sopla al subir.
      const tl = gsap.timeline({ repeat: -1, defaults: { svgOrigin: JOINT } });
      tl.fromTo(q(".m-fore--r"), { rotation: -110 }, { rotation: 0, duration: 0.55, ease: "power2.inOut" })
        .to(q(".m-fore--r"), { rotation: -110, duration: 0.75, ease: "power1.inOut" }, "+=0.1");
      gsap.to(q(".m-rig"), { y: 3, scaleY: 0.97, scaleX: 1.02, svgOrigin: FEET, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(q(".m-shin--l"), { rotation: 0 }, { rotation: 10, svgOrigin: JOINT, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(q(".m-shin--r"), { rotation: 0 }, { rotation: -10, svgOrigin: JOINT, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(q(".m-mouth--puff"), { scale: 0.8 }, { scale: 1.2, svgOrigin: "60 84", duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
      return;
    }
    case "rest": {
      gsap.fromTo(q(".m-rig"), { rotation: -1.5 }, { rotation: 2.5, svgOrigin: FEET, duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(
        q(".m-zzz text"),
        { y: 6, x: -2, opacity: 0, scale: 0.6 },
        { y: -8, x: 4, opacity: 1, scale: 1, transformOrigin: "50% 50%", duration: 1.6, ease: "sine.out", stagger: { each: 0.5, repeat: -1 } },
      );
      return;
    }
    case "celebrate": {
      hop(gsap, q, 20, 0.5);
      gsap.fromTo(q(".m-fore--l"), { rotation: -20 }, { rotation: 20, svgOrigin: JOINT, duration: 0.18, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(q(".m-fore--r"), { rotation: 20 }, { rotation: -20, svgOrigin: JOINT, duration: 0.18, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(
        q(".m-spark"),
        { scale: 0, opacity: 0, rotation: 0 },
        { scale: 1.2, opacity: 1, rotation: 90, transformOrigin: "50% 50%", duration: 0.6, ease: "back.out(3)", stagger: { each: 0.1, repeat: -1, yoyo: true } },
      );
      return confetti(gsap, svg, 1.1);
    }
    case "worried": {
      gsap.fromTo(q(".m-rig"), { x: -0.7 }, { x: 0.7, duration: 0.07, ease: "none", yoyo: true, repeat: -1, repeatDelay: 0.02 });
      gsap.fromTo(q(".m-brows"), { y: 0 }, { y: -1.6, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.fromTo(
        q(".m-sweat"),
        { y: -4, opacity: 0, scale: 0.6 },
        { y: 12, opacity: 1, scale: 1, transformOrigin: "50% 0%", duration: 1.4, ease: "power1.in", repeat: -1, repeatDelay: 0.6 },
      );
      return;
    }
  }
}

/** El número del contador salta y aparece un "+1" que sube y se desvanece. */
export function popCount(gsap: Gsap, svg: SVGSVGElement): () => void {
  const q = gsap.utils.selector(svg) as (s: string) => Element[];
  const tl = gsap.timeline();
  tl.fromTo(q(".m-count circle"), { scale: 0.4 }, { scale: 1, transformOrigin: "50% 50%", duration: 0.55, ease: "elastic.out(1.1, 0.4)" })
    .fromTo(q(".m-count__num"), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.42, ease: "back.out(2.4)" }, 0.04)
    .fromTo(q(".m-count__plus"), { y: 6, opacity: 0 }, { y: -8, opacity: 1, duration: 0.35, ease: "power2.out" }, 0.05)
    .to(q(".m-count__plus"), { opacity: 0, y: -14, duration: 0.4, ease: "power1.in" }, 0.5);
  return () => {
    tl.kill();
  };
}
