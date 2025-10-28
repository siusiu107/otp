// api/verify-otp.js
const { initAdmin } = require("./_lib/admin");
const { setCORS } = require("./_lib/cors");
const crypto = require("crypto");

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  setCORS(res, origin);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const admin = initAdmin();
    const { code, idToken } = req.body || {};
    if (!code || !idToken) return res.status(400).json({ ok: false, error: "MISSING_PARAMS" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = admin.database();
    const ref = db.ref(`otp/${uid}`);
    const snap = await ref.get();
    if (!snap.exists()) return res.status(400).json({ ok: false, error: "NO_ACTIVE_OTP" });

    const row = snap.val();
    const now = Date.now();

    if (row.exp < now) {
      await ref.remove();
      return res.status(400).json({ ok: false, error: "EXPIRED" });
    }
    if (row.attempts >= 5) {
      await ref.remove();
      return res.status(429).json({ ok: false, error: "TOO_MANY_ATTEMPTS" });
    }

    const pepper = process.env.OTP_PEPPER || "";
    const expect = sha256(`${uid}:${code}:${pepper}`);

    if (expect !== row.hash) {
      await ref.update({ attempts: (row.attempts || 0) + 1 });
      return res.status(401).json({ ok: false, error: "INVALID_CODE" });
    }

    await ref.remove(); // 성공 시 삭제
    return res.json({ ok: true, unlockMinutes: 10 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "INTERNAL", detail: String(e && e.message || e) });
  }
};
