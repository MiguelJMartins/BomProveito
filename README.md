# Bom Proveito

A small app for keeping your own lists of restaurants in Portugal:

- **Wish list**: places you want to try
- **Been there**: places you've eaten at, with a 1–5 star rating, visit date and notes

You add restaurants yourself (name, town, neighbourhood, type of food, price),
then search and filter your lists by town. Every place has a link that opens it in Google Maps.

Lists are saved in each person's browser, so anyone who opens the app gets their
own private lists with no sign-up. (They don't sync between devices yet.)

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
| `src/lib/types.ts` | The shape of a restaurant record |
| `src/app/globals.css` | All the styling (colours, fonts, layout) |
