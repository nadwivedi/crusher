// Days ("today", a sale's date, month totals, invoice years) are counted in the business's time zone, not the
// server's. A VPS usually runs on UTC: there an entry dated today in India before 5:30 AM, and every sale saved
// without a time (browser midnight = 18:30 UTC the day before), would land on the previous day.
// Set APP_TIMEZONE in .env to change it.
process.env.TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";
