# ALURA — Contemporary Luxury Atelier & Clothing Brand

A bespoke, editorial e-commerce website for the luxury clothing brand **ALURA**. Designed with an emphasis on authentic high-fashion aesthetics (inspired by minimalist luxury houses such as The Row, Lemaire, and Toteme), avoiding "vibe-coded" tropes (no purple/cyan neon gradients, generic glassmorphism, or cookie-cutter SaaS templates).

---

## Project Structure

```
alura-clothing/
├── server.js               # Zero-dependency Node.js HTTP & REST API server
├── package.json            # Project manifest & start script
├── README.md               # Documentation and execution guide
├── data/
│   └── products.json       # Curated database of 10 luxury garments with provenance & sizing
└── public/
    ├── index.html          # Editorial storefront with lookbook, grid, drawer, and checkout
    ├── styles.css          # Bespoke CSS (warm alabaster palette, serif typography, responsive)
    └── app.js              # Vanilla JavaScript (API client, bag drawer, filtering, checkout)
```

---

## Getting Started

### 1. Run the Backend Server
The backend is built with pure Node.js standard libraries—**zero external npm installations required**.

```bash
# From the alura-clothing directory:
node server.js
```
Or with npm:
```bash
npm start
```

You will see:
```text
=================================================
  ALURA ATELIER — SERVER ACTIVE
  Local URL:  http://localhost:3000
  API Ready:  http://localhost:3000/api/products
=================================================
```

### 2. Open in Browser
Visit [http://localhost:3000](http://localhost:3000) in any web browser.

---

## Features & Highlights

- **Anti-"Vibe-Coded" Luxury Aesthetic**:
  - Warm architectural palette: Alabaster (`#FAF8F5`), Warm Linen (`#F2EFEB`), Obsidian (`#151514`), and Sienna (`#8C5B32`).
  - High-contrast editorial typography pairing `Cormorant Garamond` (classic serif) with tightly letterspaced uppercase neo-grotesque metadata.
  - Generous whitespace, razor-thin hairline borders, and sharp architectural corners (no rounded bubble buttons).
- **Interactive E-Commerce Capabilities**:
  - **Dynamic Catalog**: Filter by category (*Outerwear*, *Tailoring*, *Knitwear*, *Trousers*, *Accessories*) and sort by price/newest.
  - **Live Search**: Instant keyword filtering across garments, fabric compositions, and cuts.
  - **Quick Size Selector**: Add specific sizes (XS, S, M, L, XL) directly from card hover.
  - **Product Detail Modal**: High-res lookbook images, fabric origin details, fit notes, color swatches, and size selection.
  - **Slide-Out Bag Drawer**: LocalStorage-backed cart with quantity steppers, subtotal updates, and complimentary white-glove shipping perk.
  - **Simulated Atelier Checkout**: Multi-step checkout with address validation, order calculation (including tax and complimentary shipping), and official order confirmation (`ALR-2026-XXXXXX`).
  - **The ALURA Dispatch**: Newsletter registration with instant response.
  - **Client Services Modals**: Bespoke modals for private fittings, garment care & lifelong repair, delivery, and circular traceability.
- **REST API Endpoints**:
  - `GET /api/products`: Full catalog with query filtering (`?category=`, `?sort=`, `?q=`).
  - `GET /api/products/:id`: Fetch single garment details.
  - `GET /api/categories`: Category counts.
  - `POST /api/checkout`: Process bag checkout and return unique confirmation order.
  - `POST /api/newsletter`: Subscribe client email.
