import { useMemo, useState } from "react";
import { EXERCISE_LIST, type ExerciseMeta } from "../../lib/exercises";
import { Trie } from "../../structures";
import type { ExerciseId } from "../../types";

interface ExercisePickerProps {
  value: ExerciseId;
  disabled?: boolean;
  onChange: (next: ExerciseId) => void;
}

/** Trie con etiquetas y alias: "sent", "flex" o "muerto" encuentran el ejercicio. */
function buildIndex(): Trie<ExerciseMeta> {
  const trie = new Trie<ExerciseMeta>();
  for (const meta of EXERCISE_LIST) {
    trie.insert(meta.label, meta);
    for (const alias of meta.aliases) trie.insert(alias, meta);
  }
  return trie;
}

export function ExercisePicker({ value, disabled, onChange }: ExercisePickerProps) {
  const index = useMemo(buildIndex, []);
  const [query, setQuery] = useState("");
  const matches = query.trim() ? index.suggest(query, 6) : [];
  const current = EXERCISE_LIST.find((meta) => meta.id === value);

  const pick = (id: ExerciseId) => {
    onChange(id);
    setQuery("");
  };

  return (
    <div className="stack">
      <div className="search">
        <label className="field">
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            Buscar ejercicio
          </span>
          <input
            className="input"
            type="search"
            value={query}
            disabled={disabled}
            placeholder={`Actual: ${current?.label ?? ""}. Prueba "sent" o "flex"`}
            aria-controls="exercise-suggestions"
            aria-expanded={matches.length > 0}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) pick(matches[0].id);
              if (event.key === "Escape") setQuery("");
            }}
          />
        </label>
        {matches.length > 0 && (
          <ul id="exercise-suggestions" className="search__list" role="listbox">
            {matches.map((meta) => (
              <li key={meta.id} role="option" aria-selected={meta.id === value}>
                <button type="button" onClick={() => pick(meta.id)}>
                  {meta.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="exercise-picker" role="group" aria-label="Ejercicios">
        {EXERCISE_LIST.map((meta) => (
          <button
            key={meta.id}
            type="button"
            className="exercise-option"
            aria-pressed={meta.id === value}
            disabled={disabled}
            onClick={() => onChange(meta.id)}
          >
            {meta.label}
            <span className="muted" style={{ display: "block", fontSize: 12, fontWeight: 500 }}>
              Meta: {meta.target} {meta.unit === "seconds" ? "s" : "reps"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
