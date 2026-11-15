This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Dovatech POS — what's in the app

- **Selling:** New Sale (invoice + PDF receipt) and Sales History (search by customer name, phone, IMEI or invoice; date filter; customer history; Excel download).
- **Buying:** New Purchase records phones bought in — who you bought from, their phone number, IMEI, price paid and how you paid (cash / transfer…). Purchase History shows what's in stock and what's sold, with an Excel download.
- When a phone is sold, its IMEI links the sale to the purchase, so you can see where it came from and the profit.

### Backend settings (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | Database connection |
| `DATABASE_NAME` | `dovatech` | Database name |
| `CORS_ORIGINS` | `*` | Comma-separated site URLs allowed to call the API. Set this to your site's URL in production. |

Install backend dependencies with `pip install -r backend/requirements.txt` (adds `openpyxl` for Excel exports).
