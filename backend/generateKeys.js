const crypto = require("crypto");

// Generate a 32-byte key (base64 or hex encoded)
const ENC_KEY = crypto.randomBytes(32).toString("hex"); // 64-char hex string

// Generate a 16-byte IV
const IV = crypto.randomBytes(16).toString("hex"); // 32-char hex string

console.log("ENC_KEY:", ENC_KEY);
console.log("IV:", IV);

const JWT_SECRET = crypto.randomBytes(32).toString("hex"); // 128 hex chars
console.log("JWT_SECRET=", JWT_SECRET);
