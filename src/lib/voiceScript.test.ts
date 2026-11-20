import { describe, expect, it } from "vitest";
import { briefSpoken, CueGate, praiseForRep, repCallout, spanishNumber, statusReport } from "./voiceScript";
import { pickSpanishVoice, VoiceCoach, VoicePriority, type SpeechSynthesisLike, type SpeechSynthesisUtteranceLike } from "./speech";

describe("guion hablado", () => {
  it("dice los números en palabras", () => {
    expect([1, 2, 3, 10, 21].map(spanishNumber)).toEqual(["uno", "dos", "tres", "diez", "veintiuno"]);
    expect(spanishNumber(45)).toBe("45");
  });

  it("anuncia la última repetición y la serie completa", () => {
    expect(repCallout(4, 12)).toBe("cuatro");
    expect(repCallout(11, 12)).toMatch(/Una más/);
    expect(repCallout(12, 12)).toMatch(/Serie completa/);
  });

  it("anima cada cuatro repeticiones salvo al final", () => {
    expect(praiseForRep(3, 12)).toBeNull();
    expect(praiseForRep(4, 12)).not.toBeNull();
    expect(praiseForRep(8, 12)).not.toBeNull();
    expect(praiseForRep(12, 12)).toBeNull();
  });

  it("recorta el mensaje del servidor a una frase corta", () => {
    expect(briefSpoken("Cadera más atrás. Respira y mantén la espalda recta durante todo el movimiento.")).toBe("Cadera más atrás.");
    expect(briefSpoken("x".repeat(30) + " " + "y".repeat(100)).length).toBeLessThanOrEqual(80);
  });

  it("resume el avance para 'cómo voy'", () => {
    expect(statusReport(5, 12, 85, 75)).toBe("Llevas 5 repeticiones de 12, precisión 85 por ciento, 1 minuto y 15 segundos.");
  });
});

describe("CueGate", () => {
  it("solo habla un aviso cuando se mantiene (no por un frame)", () => {
    const gate = new CueGate(500, 9000, 3500);
    expect(gate.consider("Pecho arriba", 0)).toBeNull();
    expect(gate.consider("Pecho arriba", 200)).toBeNull();
    expect(gate.consider("Pecho arriba", 600)).toBe("Pecho arriba");
  });

  it("un aviso intermitente se descarta", () => {
    const gate = new CueGate(500, 9000, 3500);
    gate.consider("Pecho arriba", 0);
    gate.consider(null, 100);
    expect(gate.consider("Pecho arriba", 700)).toBeNull();
  });

  it("no repite el mismo aviso antes del enfriamiento y deja hueco entre avisos", () => {
    const gate = new CueGate(100, 9000, 3500);
    gate.consider("A", 0);
    expect(gate.consider("A", 200)).toBe("A");
    expect(gate.consider("A", 4000)).toBeNull(); // mismo aviso en enfriamiento
    gate.consider("B", 4100);
    expect(gate.consider("B", 4300)).toBe("B"); // otro aviso, ya pasó el hueco
    gate.consider("C", 4400);
    expect(gate.consider("C", 4600)).toBeNull(); // dentro del hueco mínimo
    gate.consider("A", 9400);
    expect(gate.consider("A", 9500)).toBe("A"); // enfriamiento de A vencido
  });
});

describe("selección de voz", () => {
  const v = (name: string, lang: string) => ({ name, lang });
  it("prefiere es-CO sobre es-ES", () => {
    expect(pickSpanishVoice([v("Helena", "es-ES"), v("Salome", "es-CO"), v("Jorge", "es-MX")])?.lang).toBe("es-CO");
  });
  it("sin es-CO prefiere latino sobre España y voces naturales", () => {
    expect(pickSpanishVoice([v("Helena", "es-ES"), v("Paulina", "es-MX")])?.lang).toBe("es-MX");
    expect(pickSpanishVoice([v("Microsoft Dalia", "es-MX"), v("Microsoft Dalia Online (Natural)", "es-MX")])?.name).toMatch(/Natural/);
  });
  it("devuelve null si no hay voces en español", () => {
    expect(pickSpanishVoice([v("Samantha", "en-US")])).toBeNull();
    expect(pickSpanishVoice([])).toBeNull();
  });
});

describe("VoiceCoach con prioridades", () => {
  function make() {
    const spoken: string[] = [];
    const pending: SpeechSynthesisUtteranceLike[] = [];
    let cancels = 0;
    const synth: SpeechSynthesisLike = {
      speak(u) {
        spoken.push(u.text);
        pending.push(u);
      },
      cancel() {
        cancels++;
      },
    };
    const coach = new VoiceCoach(synth, (text) => ({ text, lang: "es-CO", rate: 1, onend: null, onerror: null }), () => 0);
    return { coach, spoken, pending, cancels: () => cancels };
  }

  it("el conteo corta un aviso menor en curso y descarta los menores en cola", () => {
    const { coach, spoken, pending, cancels } = make();
    coach.say("Pecho arriba, no te inclines tanto.", { force: true, priority: VoicePriority.form });
    coach.say("Otro aviso", { force: true, priority: VoicePriority.form });
    const old = pending[0]!;
    coach.say("tres", { force: true, priority: VoicePriority.count });
    expect(cancels()).toBe(1);
    expect(spoken).toEqual(["Pecho arriba, no te inclines tanto.", "tres"]);
    old.onend?.(); // el callback de la frase cortada no debe romper la cola
    expect(spoken).toEqual(["Pecho arriba, no te inclines tanto.", "tres"]);
    pending[1]!.onend?.();
    expect(spoken.length).toBe(2); // "Otro aviso" fue descartado
  });

  it("el conteo no corta a otro conteo, lo encola", () => {
    const { coach, spoken, pending, cancels } = make();
    coach.say("uno", { force: true, priority: VoicePriority.count });
    coach.say("dos", { force: true, priority: VoicePriority.count });
    expect(cancels()).toBe(0);
    pending[0]!.onend?.();
    expect(spoken).toEqual(["uno", "dos"]);
  });

  it("notifica cuando empieza y termina de hablar y repite la última corrección", () => {
    const { coach, spoken, pending } = make();
    const events: boolean[] = [];
    coach.onSpeakingChange = (s) => events.push(s);
    coach.say("Cadera atrás", { force: true, priority: VoicePriority.form });
    expect(coach.speaking).toBe(true);
    pending[0]!.onend?.();
    expect(coach.speaking).toBe(false);
    expect(events).toEqual([true, false]);
    expect(coach.repeatLast()).toBe(true);
    expect(spoken).toEqual(["Cadera atrás", "Cadera atrás"]);
  });
});
