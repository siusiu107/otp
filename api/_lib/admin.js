// api/_lib/admin.js
const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return admin;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY || "";
  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  return admin;
}

module.exports = { initAdmin };
