"use client";
import { useState } from "react";
import { townFromAddress, type ListStatus, type PlaceDetails, type RestaurantInput } from "@/lib/types";
import { NameSearch } from "./NameSearch";

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
    name: "", address: "", town: "", cuisine: "", price: 0, note: "", status: defaultStatus, ...initial,
  });
  const set = <K extends keyof RestaurantInput>(k: K, val: RestaurantInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const editing = !!initial?.name;
  const idp = editing ? "edit" : "add";

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        const address = v.address.trim();
        if (!v.name.trim() || !address) return;
        // A picked Google place knows its town; for a typed address, take it from the address.
        const town = (v.placeId && v.town) || townFromAddress(address);
        onSave({ ...v, name: v.name.trim(), address, town, cuisine: v.cuisine.trim(), note: v.note.trim() });
      }}
    >
      <label className="full">
        Restaurant name
        {editing ? (
          <input id={`${idp}-name`} required maxLength={80} autoFocus value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Tasca do Chico" />
        ) : (
          <NameSearch
            id={`${idp}-name`}
            value={v.name}
            onChange={(name) => setV((p) => ({ ...p, name, placeId: undefined, mapsUrl: undefined, lat: undefined, lng: undefined }))}
            onPick={(d: PlaceDetails) =>
              setV((p) => ({
                ...p,
                name: d.name || p.name,
                address: d.address || p.address,
                town: d.town,
                cuisine: d.cuisine || p.cuisine,
                price: d.price || p.price,
                placeId: d.placeId,
                mapsUrl: d.mapsUrl || undefined,
                lat: d.lat,
                lng: d.lng,
              }))
            }
          />
        )}
      </label>
      <label className="full">
        Address
        <input
          id={`${idp}-address`}
          required
          maxLength={160}
          autoComplete="off"
          value={v.address}
          // A new address means the old map position and Google link no longer apply.
          onChange={(e) => setV((p) => ({ ...p, address: e.target.value, town: "", placeId: undefined, mapsUrl: undefined, lat: undefined, lng: undefined }))}
          placeholder="e.g. Rua das Flores 12, Lisboa"
        />
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

      <datalist id="types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
    </form>
  );
}
