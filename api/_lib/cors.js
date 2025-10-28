// api/_lib/cors.js
const ALLOWED = process.env.ALLOWED_ORIGIN?.split(",").map(s => s.trim()).filter(Boolean) || [];

function setCORS(res, origin) {
  const ok = ALLOWED.length === 0 ? true : ALLOWED.includes(origin);
  res.setHeader("Access-Control-Allow-Origin", ok ? (origin || "*") : (ALLOWED[0] || "*"));
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  return ok;
}

module.exports = { setCORS };
