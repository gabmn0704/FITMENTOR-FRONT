import { describe, expect, it, vi } from "vitest";
import {
  CommandListener,
  normalizeTranscript,
  parseVoiceCommand,
  type ListenState,
  type RecognitionLike,
  type VoiceCommand,
} from "./voiceCommands";

describe("parseVoiceCommand", () => {
  const cases: Array<[string, VoiceCommand]> = [
    ["iniciar", "start"],
    ["Inicia el entrenamiento", "start"],
    ["empezar", "start"],
    ["comenzar", "start"],
    ["vamos", "start"],
    ["pausa", "pause"],
    ["pausar", "pause"],
    ["espera", "pause"],
    ["reanudar", "resume"],
    ["continuar", "resume"],
    ["siguiente ejercicio", "next"],
    ["siguiente", "next"],
    ["próximo ejercicio", "next"],
    ["cambiar de ejercicio", "next"],
    ["terminar", "finish"],
    ["terminar sesión", "finish"],
    ["finalizar", "finish"],
    ["repite", "repeat"],
    ["repítelo", "repeat"],
    ["otra vez", "repeat"],
    ["¿cómo voy?", "status"],
    ["Cómo voy", "status"],
    ["cuántas repeticiones llevo", "status"],
    ["deshacer", "undo"],
    ["guardar", "save"],
    ["silencio", "mute"],
    ["activar voz", "unmute"],
  ];
  it.each(cases)("%s -> %s", (said, expected) => {
    expect(parseVoiceCommand(said)).toBe(expected);
  });

  it("ignora ruido y conversación que no es un comando", () => {
    expect(parseVoiceCommand("")).toBeNull();
    expect(parseVoiceCommand("   ")).toBeNull();
    expect(parseVoiceCommand("qué calor hace hoy en Bogotá")).toBeNull();
    expect(parseVoiceCommand("hmm ajá")).toBeNull();
  });

  it("ignora frases largas aunque contengan una palabra clave", () => {
    expect(parseVoiceCommand("ayer le dije a mi amigo que quería empezar a entrenar en el gimnasio nuevo")).toBeNull();
  });

  it("'siguiente ejercicio' no se confunde con 'sigue' (reanudar)", () => {
    expect(parseVoiceCommand("siguiente ejercicio")).toBe("next");
    expect(parseVoiceCommand("sigue")).toBe("resume");
  });

  it("normaliza tildes, mayúsculas y signos", () => {
    expect(normalizeTranscript("¡¿CÓMO   Voy?!")).toBe("como voy");
  });
});

class FakeRecognition implements RecognitionLike {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onresult: ((event: any) => void) | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  started = 0;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started++;
    this.onstart?.();
  }
  stop() {}
  abort() {}
  results: unknown[] = [];
  say(...alternatives: string[]) {
    this.sayAt(this.results.length, ...alternatives);
  }
  sayAt(index: number, ...alternatives: string[]) {
    const result = Object.assign(
      alternatives.map((transcript) => ({ transcript, confidence: 0.9 })),
      { isFinal: false },
    );
    this.results[index] = result;
    this.onresult?.({ resultIndex: index, results: this.results });
  }
}

function setup(extra: { shouldIgnore?: () => boolean; now?: () => number } = {}) {
  FakeRecognition.instances = [];
  const commands: VoiceCommand[] = [];
  const states: ListenState[] = [];
  const listener = new CommandListener({
    ctor: FakeRecognition as never,
    onCommand: (c) => commands.push(c),
    onState: (s) => states.push(s),
    ...extra,
  });
  return { listener, commands, states, rec: () => FakeRecognition.instances[FakeRecognition.instances.length - 1]! };
}

describe("CommandListener", () => {
  it("configura es-CO continuo con resultados parciales y reporta que escucha", () => {
    const { listener, rec, states } = setup();
    listener.start();
    expect(rec().lang).toBe("es-CO");
    expect(rec().continuous).toBe(true);
    expect(rec().interimResults).toBe(true);
    expect(states[states.length - 1]).toBe("listening");
  });

  it("emite el comando y prueba las alternativas del reconocedor", () => {
    const { listener, rec, commands } = setup();
    listener.start();
    rec().say("hinchar", "iniciar");
    expect(commands).toEqual(["start"]);
  });

  it("no repite el mismo comando por resultado parcial + final", () => {
    let t = 0;
    const { listener, rec, commands } = setup({ now: () => t });
    listener.start();
    rec().sayAt(0, "pausa"); // parcial
    t = 300;
    rec().sayAt(0, "pausa"); // final del mismo resultado
    t = 600;
    rec().sayAt(1, "pausa"); // eco reconocido como resultado nuevo, muy seguido
    expect(commands).toEqual(["pause"]);
    t = 3000;
    rec().say("pausa");
    expect(commands).toEqual(["pause", "pause"]);
  });

  it("ignora lo oído mientras el entrenador habla", () => {
    let speaking = true;
    const { listener, rec, commands } = setup({ shouldIgnore: () => speaking });
    listener.start();
    rec().say("terminar");
    expect(commands).toEqual([]);
    speaking = false;
    rec().say("terminar");
    expect(commands).toEqual(["finish"]);
  });

  it("se reinicia solo cuando el navegador corta la escucha", () => {
    vi.useFakeTimers();
    const { listener, rec } = setup();
    listener.start();
    const first = rec();
    first.onend?.();
    vi.advanceTimersByTime(400);
    expect(FakeRecognition.instances.length).toBe(2);
    expect(rec().started).toBe(1);
    listener.stop();
    vi.useRealTimers();
  });

  it("si el micrófono está bloqueado no insiste y lo informa", () => {
    vi.useFakeTimers();
    const { listener, rec, states } = setup();
    listener.start();
    rec().onerror?.({ error: "not-allowed" });
    rec().onend?.();
    vi.advanceTimersByTime(10_000);
    expect(states).toContain("blocked");
    expect(FakeRecognition.instances.length).toBe(1);
    vi.useRealTimers();
  });

  it("degrada sin error cuando el navegador no soporta SpeechRecognition", () => {
    const states: ListenState[] = [];
    const listener = new CommandListener({ ctor: null, onCommand: () => {}, onState: (s) => states.push(s) });
    expect(listener.supported).toBe(false);
    listener.start();
    listener.stop();
    expect(states).toEqual(["unsupported", "unsupported"]);
  });
});
