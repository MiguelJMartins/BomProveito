"use client";
import { useState } from "react";
import type { Restaurant, RestaurantInput } from "@/lib/types";
import { RestaurantForm } from "./RestaurantForm";

type Props = {
  r: Restaurant;
  onEdit: (patch: Partial<Restaurant>) => void;
  onMove: () => void;
  onRemove: () => void;
};

const mapsUrl = (r: Restaurant) =>
  r.mapsUrl || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([r.name, r.area, r.town, "Portugal"].filter(Boolean).join(", "));

export function RestaurantCard({ r, onEdit, onMove, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState(r.note);

  if (editing) {
    return (
      <li className="row">
        <RestaurantForm
          initial={r}
          defaultStatus={r.status}
          onSave={(v: RestaurantInput) => { onEdit(v); setNote(v.note); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const meta = [r.cuisine, [r.area, r.town].filter(Boolean).join(", ")].filter(Boolean);

  return (
    <li className="row">
      <div className="rowtop">
        <div className="info">
          <h3 className="name">{r.name}</h3>
          <p className="meta">
            {meta.join(" · ")}
            {r.price > 0 && <> · <span className="price" aria-label={`Price ${r.price} of 4`}>{"€".repeat(r.price)}</span></>}
            {" · "}
            <a href={mapsUrl(r)} target="_blank" rel="noopener noreferrer">Map</a>
          </p>
        </div>
        <div className="actions">
          <button className={`btn ${r.status === "want" ? "been" : "want"}`} onClick={onMove}>
            {r.status === "want" ? "✓ I've been" : "Back to wish list"}
          </button>
          <button className="btn quiet" onClick={() => setEditing(true)}>Edit</button>
          {confirming ? (
            <span className="confirm">
              <button className="btn danger" onClick={onRemove}>Delete</button>
              <button className="btn quiet" onClick={() => setConfirming(false)}>Keep</button>
            </span>
          ) : (
            <button className="btn quiet" onClick={() => setConfirming(true)} aria-label={`Delete ${r.name}`}>Delete</button>
          )}
        </div>
      </div>

      <div className="extra">
        {r.status === "been" && (
          <>
            <span className="stars" role="group" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={n <= r.rating ? "on" : ""} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={n <= r.rating}
                  onClick={() => onEdit({ rating: r.rating === n ? 0 : n })}>★</button>
              ))}
            </span>
            <label className="visited">
              Visited
              <input id={`visited-${r.id}`} type="date" value={r.visited} onChange={(e) => onEdit({ visited: e.target.value })} />
            </label>
          </>
        )}
        <input
          id={`note-${r.id}`}
          className="note"
          aria-label={`Notes about ${r.name}`}
          maxLength={500}
          value={note}
          placeholder={r.status === "want" ? "Why go? Who recommended it?" : "What did you eat? Would you go back?"}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== r.note) onEdit({ note }); }}
        />
      </div>
    </li>
  );
}
