"use client";
import { useRef, useState } from "react";
import type { PlaceDetails, PlaceSuggestion } from "@/lib/types";

type Props = {
  id: string;
  value: string;
  onChange: (name: string) => void;
  /** Called with the restaurant's details once the person picks a suggestion. */
  onPick: (d: PlaceDetails) => void;
};

const newSession = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * The restaurant name field. While you type, it looks the name up (OpenStreetMap, or Google
 * Maps when a key is set) and lists matching places in Portugal; picking one fills in the rest.
 * If the search isn't set up or fails, it behaves like a normal text field.
 */
export function NameSearch({ id, value, onChange, onPick }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState<"google" | "osm">("osm");
  const enabled = useRef<boolean | null>(null); // null = not known yet
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);
  // Google bills a typing session plus the pick as one lookup when they share a token.
  const session = useRef<string>("");

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (enabled.current === false || q.trim().length < 3) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      if (!session.current) session.current = newSession();
      const n = ++latest.current;
      setBusy(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(q.trim())}&session=${session.current}`);
        const data = await res.json();
        if (n !== latest.current) return; // a newer search has started
        if (data.enabled === false) { enabled.current = false; setOpen(false); return; }
        enabled.current = true;
        if (data.source) setFrom(data.source);
        setSuggestions(data.suggestions || []);
        setActive(-1);
        setOpen(true);
        setMessage(data.error || "");
      } catch {
        if (n === latest.current) { setSuggestions([]); setMessage("The restaurant search isn't working right now. You can type the details yourself."); setOpen(true); }
      } finally {
        if (n === latest.current) setBusy(false);
      }
    }, 300);
  };

  const pick = async (s: PlaceSuggestion) => {
    setOpen(false);
    onChange(s.name);
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/places/details?id=${encodeURIComponent(s.placeId)}&session=${session.current}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onPick(data as PlaceDetails);
      setMessage(`Filled in from ${from === "google" ? "Google Maps" : "OpenStreetMap"}. Check the details before saving.`);
    } catch {
      setMessage("Couldn't get that restaurant's details. You can type them yourself.");
    } finally {
      setBusy(false);
      session.current = ""; // the next search starts a new session
    }
  };

  const listId = `${id}-suggestions`;
  const showList = open && (suggestions.length > 0 || !!message);

  return (
    <div className="namesearch">
      <div className="namesearch-field">
        <input
          id={id}
          required
          maxLength={80}
          autoFocus
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={value}
          placeholder="Start typing, e.g. Zé da Mouraria"
          onChange={(e) => { onChange(e.target.value); setMessage(""); search(e.target.value); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          onKeyDown={(e) => {
            if (!showList || !suggestions.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % suggestions.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1)); }
            else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
            else if (e.key === "Escape") { setOpen(false); }
          }}
        />
        {busy && <span className="spinner" aria-label="Searching" />}
      </div>

      {showList && (
        <div className="suggest">
          {suggestions.length > 0 ? (
            <ul role="listbox" id={listId} aria-label="Matching restaurants">
              {suggestions.map((s, i) => (
                <li
                  key={s.placeId}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  onMouseEnter={() => setActive(i)}
                >
                  <span className="s-name">{s.name}</span>
                  {s.detail && <span className="s-detail">{s.detail}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="s-empty">{message}</p>
          )}
          <p className="s-foot">
            {suggestions.length > 0 ? "Not in the list? Keep typing, or fill in the details yourself." : ""}
            <span className="s-attrib">{from === "google" ? "Results from Google Maps" : "Results © OpenStreetMap contributors"}</span>
          </p>
        </div>
      )}
      {!showList && message && <p className="s-msg" role="status">{message}</p>}
    </div>
  );
}
