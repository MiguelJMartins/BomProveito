# Bom Proveito

A small app for keeping your own lists of restaurants in Portugal:

- **Wish list**: places you want to try
- **Been there**: places you've eaten at, with a 1–5 star rating, visit date and notes

You add restaurants yourself (name, address, type of food, price), then search and
filter your lists by town. Every place has a link that opens it in Google Maps, and the
**Map** tab shows all your restaurants as pins (orange for the wish list, green for
places you've been). Map tiles come from [OpenStreetMap](https://www.openstreetmap.org/copyright).

Lists are saved in each person's browser, so anyone who opens the app gets their
own private lists with no sign-up. (They don't sync between devices yet.)

## Restaurant search

When you type a restaurant's name in the add form, the app suggests matching places
in Portugal. Picking one fills in the address, the type of food (when known) and its
position on the map. Restaurants you type in yourself are placed on the map by address.

**OpenStreetMap (default, free, no setup).** Suggestions come from
[Photon](https://photon.komoot.io) and details and addresses from
[Nominatim](https://nominatim.org). Both are free public services with fair-use rules,
which the app follows (it identifies itself, caches results, and calls Nominatim at most
once a second). OpenStreetMap doesn't record prices, and small places may be missing.
Optionally set `OSM_USER_AGENT` to something like `BomProveito/1.0 (you@example.com)`
so the OpenStreetMap operators can contact you if needed.

**Google Maps (optional, better coverage).** Set `GOOGLE_PLACES_API_KEY` and the app
switches to Google automatically, which also fills in prices:

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and turn on billing.
2. Enable **Places API (New)**.
3. Under **APIs & Services → Credentials**, create an API key and restrict it to **Places API (New)**.
4. Under **Places API (New) → Quotas**, set daily limits (for example 300 requests per day for
   Autocomplete, Place Details and Text Search) so costs can't run away.
5. Add the key as an environment variable called `GOOGLE_PLACES_API_KEY`:
   - on Vercel: **Project → Settings → Environment Variables** (mark it Sensitive), then redeploy
   - on your computer: in a file called `.env.local` (never commit this file)

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Put it online

The easiest host for a Next.js app is [Vercel](https://vercel.com): push this folder to a
GitHub repository, then "Import Project" on Vercel. It's free for personal projects.

## Where things are

| File | What it does |
| --- | --- |
| `src/components/MesaApp.tsx` | The main screen: tabs, search, town filter, sorting |
| `src/components/RestaurantCard.tsx` | One restaurant in the list: rating, notes, move, edit, delete |
| `src/components/RestaurantForm.tsx` | The add / edit form |
| `src/lib/useLists.ts` | Saving and loading your lists (browser storage) |
| `src/components/MapView.tsx` | The map of your restaurants (Leaflet + OpenStreetMap) |
| `src/components/NameSearch.tsx` | The name field that searches Google Maps as you type |
| `src/lib/places.ts` | Picks OpenStreetMap or Google for the restaurant search |
| `src/lib/osmPlaces.ts` | Restaurant search with OpenStreetMap (Photon + Nominatim) |
| `src/lib/googlePlaces.ts` | Restaurant search with Google Places (keeps the key secret) |
| `src/app/api/places/` | The app's search and details endpoints |
| `src/lib/types.ts` | The shape of a restaurant record |
| `src/app/globals.css` | All the styling (colours, fonts, layout) |
