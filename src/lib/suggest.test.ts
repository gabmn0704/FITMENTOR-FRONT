import { describe, expect, it } from "vitest";
import { suggestNextExercise } from "./suggest";
import { cameraErrorMessage } from "./camera";

describe("suggestNextExercise", () => {
  it("prioriza el ejercicio nunca practicado", () => {
    const suggestion = suggestNextExercise([
      { exercise: "squat", reps: 40, accuracy: 90 },
      { exercise: "push_up", reps: 20, accuracy: 85 },
    ]);
    expect(suggestion.exercise).not.toBe("squat");
    expect(suggestion.exercise).not.toBe("push_up");
    expect(suggestion.reason).toMatch(/Aún no lo has practicado/);
  });

  it("elige la precisión más baja cuando todos tienen historial", () => {
    const suggestion = suggestNextExercise([
      { exercise: "squat", reps: 40, accuracy: 90 },
      { exercise: "push_up", reps: 20, accuracy: 60 },
      { exercise: "plank", reps: 30, accuracy: 80 },
      { exercise: "deadlift", reps: 10, accuracy: 75 },
      { exercise: "lunge", reps: 12, accuracy: 88 },
    ]);
    expect(suggestion.exercise).toBe("push_up");
    expect(suggestion.reason).toContain("60%");
  });
});

describe("cameraErrorMessage", () => {
  it("usa mensajes en español para errores conocidos", () => {
    expect(cameraErrorMessage(new Error("x"))).toMatch(/No se pudo iniciar/);
  });
});
