// api/send-otp.js
const { initAdmin } = require("./_lib/admin");
const { setCORS } = require("./_lib/cors");
const crypto = require("crypto");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "SIU Studio <no-reply@example.com>";
const OTP_TTL_MS = 5 * 60 * 1000;   // 5분
const RESEND_URL = "https://api.resend.com/emails";

function rnd6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
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
    const idToken = (req.headers.authorization || "").replace(/^Bearer\s+/, "") || (req.body && req.body.idToken);
    if (!idToken) return res.status(401).json({ ok: false, error: "NO_ID_TOKEN" });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;
    if (!email) return res.status(400).json({ ok: false, error: "NO_EMAIL_ON_ACCOUNT" });

    const db = admin.database();
    const now = Date.now();

    // rate limit: 30초 쿨다운
    const ref = db.ref(`otp/${uid}`);
    const snap = await ref.get();
    const prev = snap.exists() ? snap.val() : null;
    if (prev && prev.lastSentAt && now - prev.lastSentAt < 30 * 1000) {
      return res.status(429).json({ ok: false, error: "TOO_SOON" });
    }

    const code = rnd6();
    const pepper = process.env.OTP_PEPPER || "";
    const hash = sha256(`${uid}:${code}:${pepper}`);

    // 저장
    await ref.set({
      hash,
      exp: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      ip: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").toString().slice(0, 200),
      ua: (req.headers["user-agent"] || "").toString().slice(0, 500),
      email
    });

    if (!RESEND_API_KEY) throw new Error("NO_RESEND_API_KEY");

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,sans-serif">
        <p>안녕하세요, SIU Studio 입니다.</p>
        <p>인증번호는 <strong style="font-size:18px">${code}</strong> 입니다.</p>
        <p>유효시간: 5분. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
      </div>
    `;

    const r = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: "[태양계정복] 이메일 인증번호",
        html
      })
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`RESEND_FAIL ${r.status} ${t}`);
    }

    return res.json({ ok: true, ttlMs: OTP_TTL_MS });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "INTERNAL", detail: String(e && e.message || e) });
  }
};
