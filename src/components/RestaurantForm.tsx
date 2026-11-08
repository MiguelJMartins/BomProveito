"use client";
import { useState } from "react";
import type { ListStatus, RestaurantInput } from "@/lib/types";

const TOWNS = ["Lisboa", "Porto", "Braga", "Coimbra", "Faro", "Aveiro", "Évora", "Sintra", "Cascais", "Matosinhos", "Guimarães", "Funchal"];
const TYPES = ["Tasca", "Marisqueira", "Churrasqueira", "Petiscos", "Pastelaria", "Café", "Cervejaria", "Francesinha", "Pizza", "Sushi", "Vegetarian", "Fine dining"];

type Props = {
  initial?: Partial<RestaurantInput>;
  defaultStatus: ListStatus;
  submitLabel?: string;
  onSave: (v: RestaurantInput) => void;
  onCancel: () => void;
};

export function RestaurantForm({ initial, defaultStatus, submitLabel, onSave, onCancel }: Props) {
  const [v, setV] = useState<RestaurantInput>({
    name: "", town: "", area: "", cuisine: "", price: 0, note: "", status: defaultStatus, ...initial,
  });
  const set = <K extends keyof RestaurantInput>(k: K, val: RestaurantInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const editing = !!initial?.name;
  const idp = editing ? "edit" : "add";

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.name.trim() || !v.town.trim()) return;
        onSave({ ...v, name: v.name.trim(), town: v.town.trim(), area: v.area.trim(), cuisine: v.cuisine.trim(), note: v.note.trim() });
      }}
    >
      <label className="full">
        Restaurant name
        <input id={`${idp}-name`} required maxLength={80} autoFocus value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tasca do Chico" />
      </label>
      <label>
        Town
        <input id={`${idp}-town`} required maxLength={40} list="towns" value={v.town} onChange={(e) => set("town", e.target.value)} placeholder="e.g. Lisboa" />
      </label>
      <label>
        <span>Neighbourhood <span className="opt">optional</span></span>
        <input id={`${idp}-area`} maxLength={40} value={v.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. Alfama" />
      </label>
      <label>
        <span>Type of food <span className="opt">optional</span></span>
        <input id={`${idp}-cuisine`} maxLength={40} list="types" value={v.cuisine} onChange={(e) => set("cuisine", e.target.value)} placeholder="e.g. Tasca" />
      </label>
      <label>
        Price
        <select id={`${idp}-price`} value={v.price} onChange={(e) => set("price", +e.target.value)}>
          <option value={0}>Not sure</option>
          <option value={1}>€ cheap</option>
          <option value={2}>€€ mid-range</option>
          <option value={3}>€€€ pricey</option>
          <option value={4}>€€€€ special occasion</option>
        </select>
      </label>
      <label className="full">
        <span>Notes <span className="opt">optional</span></span>
        <input id={`${idp}-note`} maxLength={500} value={v.note} onChange={(e) => set("note", e.target.value)} placeholder={v.status === "want" ? "Who recommended it? What to order?" : "What did you eat? Would you go back?"} />
      </label>

      {!editing && (
        <fieldset className="full seg">
          <legend>Add to</legend>
          <button type="button" className="segbtn want" aria-pressed={v.status === "want"} onClick={() => set("status", "want")}>Wish list</button>
          <button type="button" className="segbtn been" aria-pressed={v.status === "been"} onClick={() => set("status", "been")}>Been there</button>
        </fieldset>
      )}

      <div className="full formbtns">
        <button type="submit" className="btn primary">{submitLabel ?? (editing ? "Save changes" : "Add restaurant")}</button>
        <button type="button" className="btn quiet" onClick={onCancel}>Cancel</button>
      </div>

      <datalist id="towns">{TOWNS.map((t) => <option key={t} value={t} />)}</datalist>
      <datalist id="types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
    </form>
  );
}
