# FoodMania

A responsive food-ordering website built with HTML, CSS and JavaScript. Orders are prepared in the browser and handed off to WhatsApp; the current site has no server-side order database.

## Run locally

Open the folder in VS Code and start **Live Server**, or deploy it to a static host such as Netlify. Do not open `index.html` directly with `file://`: browsers block the JSON fetches used to load the menu and site settings.

## Project files

| Purpose | File |
|---|---|
| Homepage | `index.html` |
| Full menu, filters, search and product details | `menu.html`, `js/menu.js` |
| Shared layout and responsive styling | `css/style.css` |
| Mobile navigation | `js/navigation.js` |
| Cart, customer details and WhatsApp handoff | `js/app.js` |
| Product and site data loading | `js/products.js` |
| Menu items, prices, photos and tags | `data/products.json` |
| WhatsApp number, hours, delivery and payment settings | `data/site.json` |
| Chat assistant answers | `data/agent-questions.json` |
| Privacy policy | `privacy.html` |
| Netlify response security headers | `_headers` |
| Search crawler rules | `robots.txt` |

## How ordering works

1. The cart is saved in the customer's browser using local storage.
2. The customer enters delivery details and selects a payment method.
3. The website builds a WhatsApp order link. The customer reviews it and presses **Send** in WhatsApp.

Customer details are not protected by a backend in this version. Do not treat browser local storage as secure storage, and do not collect passwords, card details or other sensitive information in the chat assistant.

## Before publishing

- Confirm the real business phone number, opening hours, delivery areas, fees and payment methods in `data/site.json`.
- Replace any placeholder photos you want to upgrade and verify every product's `image` field (all 46 items now have a photo).
- Test all pages and checkout flows on desktop and mobile.
- Add the production-domain sitemap after the final domain is confirmed, then submit it through Google Search Console.
- Verify the deployed Netlify headers and the privacy policy against the final data practices.
