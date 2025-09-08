// server.js (or index.js)
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const Admin = require("./models/Admin");
const User = require("./models/User");
const Product = require("./models/Product");
const PromoCode = require("./models/PromoCode");
const Order = require("./models/Order")

const Razorpay = require("razorpay");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// -------------------- Database Connection --------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

// -------------------- Middleware --------------------
// User auth (customers)
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    // This token is issued on /login (customer) and contains { id, email }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// -------------------- ADMIN AUTH MIDDLEWARE --------------------
const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// -------------------- Multer Config --------------------
// create upload dir if not exists
const imageDir = path.join(__dirname, "upload", "images");
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

// sanitize filename
function sanitizeFilename(originalName) {
  const base = path.parse(originalName).name;
  const ext = path.extname(originalName).toLowerCase();

  const safeBase = base
    .toLowerCase()
    .replace(/\s+/g, "-")        // spaces → "-"
    .replace(/[^a-z0-9-_]/g, ""); // remove invalid chars

  const finalBase = safeBase || "file";
  const uniqueSuffix = Date.now(); // prevents overwrite

  return `${finalBase}-${uniqueSuffix}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imageDir),
  filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname)),
});

const upload = multer({ storage });

// serve uploaded images
app.use("/images", express.static(imageDir));

app.post("/api/upload", adminAuth, upload.single("product"), (req, res) => {
  const protocol = req.protocol; // 'http' or 'https'
  const host = req.get("host");  // e.g. 'kapiladairy.com'

  const imageUrl = `${protocol}://${host}/images/${req.file.filename}`;
  console.log("IMAGE URL:", imageUrl);

  res.json({
    success: 1,
    filename: req.file.filename, // sanitized + unique
    image_url: imageUrl,
  });
});

app.get("/images/:filename", (req, res) => {
  const filePath = path.join(imageDir, req.params.filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.sendFile(path.join(__dirname, "upload/default.png")); // placeholder
    }
    res.sendFile(filePath);
  });
});


// -------------------- Routes --------------------

// Health
app.get("/api", (req, res) => res.send("Backend running 🚀"));

// -------------------- ADMIN AUTH --------------------
const ALGO = "aes-256-cbc";
const ENC_KEY = process.env.ADMIN_ENC_KEY || "12345678901234567890123456789012"; // 32 chars
const IV = process.env.ADMIN_IV || "1234567890123456"; // 16 chars

function encrypt(text) {
  if (!text) return null;
  const cipher = crypto.createCipheriv(ALGO, ENC_KEY, IV);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

function decrypt(encrypted) {
  if (!encrypted) return null;
  const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, IV);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

app.get("/api/public-admin", async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json({ deliverableAreas: admin.deliverableAreas });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- SEND OTP --------------------
let adminotpStore = {};

app.post("/api/admin/send-otp", async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin || !admin.companyEmail || !admin.companyEmailAppPassword) {
      return res.status(500).json({ message: "Company email not configured" });
    }

    const companyEmail = decrypt(admin.companyEmail);
    const companyEmailAppPassword = decrypt(admin.companyEmailAppPassword);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    adminotpStore[companyEmail] = otp;

    // transporter with company email + app password from DB
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: companyEmail,
        pass: companyEmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: `"Ecommerce Admin" <${companyEmail}>`,
      to: companyEmail,
      subject: "🔐 Admin Credentials Reset - Ecommerce",
      text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1a1a1a; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: #262626; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.4);">
            
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #0f2027, #203a43, #2c5364); padding: 25px; text-align: center;">
              <img src="cid:ecommerceAdminLogo" alt="Ecommerce Logo" style="max-width: 100px; margin-bottom: 10px; filter: brightness(0) invert(1);" />
              <h1 style="color: #fff; margin: 0; font-size: 22px;">Ecommerce Admin</h1>
              <p style="color: #bbb; font-size: 14px; margin-top: 5px;">Secure Access Portal</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px; text-align: center;">
              <h2 style="color: #f5f5f5; margin-bottom: 10px;">Admin Credentials Reset</h2>
              <p style="color: #ccc; font-size: 15px; margin-bottom: 20px;">
                Use the One-Time Password (OTP) below to reset your admin credentials.
              </p>
              
              <div style="background: #111; border: 2px solid #444; display: inline-block; padding: 15px 30px; border-radius: 10px; font-size: 28px; font-weight: bold; color: #00e676; letter-spacing: 6px;">
                ${otp}
              </div>
              
              <p style="color: #888; font-size: 13px; margin-top: 25px;">
                ⏳ This OTP will expire in <b>5 minutes</b>. <br/>Do not share this with anyone.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #1f1f1f; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              © ${new Date().getFullYear()} Ecommerce Shopping Admin Panel. All rights reserved.
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: "logo.png",
          path: "./logo.png",
          cid: "ecommerceAdminLogo"
        }
      ]
    });

    // auto-expire OTP after 5 min
    setTimeout(() => delete adminotpStore[companyEmail], 5 * 60 * 1000);

    res.json({ message: "OTP sent to company email" });
  } catch (err) {
    console.error("OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// -------------------- ADMIN INIT (run manually) --------------------
app.post("/api/admin/init", async (req, res) => {
  try {
    const { 
      username, password, companyEmail, 
      companyEmailAppPassword, deliveryAgentEmails = [], 
      deliverableAreas = [] 
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const existing = await Admin.findOne();
    if (existing) {
      return res.status(400).json({ message: "Admin already exists. Use /admin to edit." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      username: encrypt(username),
      password: hashedPassword,
      companyEmail: companyEmail ? encrypt(companyEmail) : null,
      companyEmailAppPassword: companyEmailAppPassword ? encrypt(companyEmailAppPassword) : null,
      deliveryAgentEmails: deliveryAgentEmails.map(email => encrypt(email)), // ✅ encrypt all
      deliverableAreas
    });

    await admin.save();

    res.json({ message: "✅ Admin initialized", admin: { username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- LOGIN --------------------
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const encryptedUsername = encrypt(username);
    const admin = await Admin.findOne({ username: encryptedUsername });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { role: "admin", username, id: admin._id },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "2h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- GET ADMIN DETAILS --------------------
app.get("/api/admin", adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.json({
      username: decrypt(admin.username),
      companyEmail: decrypt(admin.companyEmail),
      deliveryAgentEmails: admin.deliveryAgentEmails.map(email => decrypt(email)), // ✅ decrypt all
      companyEmailAppPassword: "********",
      deliverableAreas: admin.deliverableAreas
    });
  } catch (err) {
    console.error("Get admin error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- RESET CREDS --------------------
app.post("/api/admin/reset-creds", async (req, res) => {
  try {
    const { 
      otp, username, password, 
      companyEmail, companyEmailAppPassword, deliveryAgentEmails, 
      deliverableAreas 
    } = req.body;

    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const adminEmail = decrypt(admin.companyEmail);
    if (!otp) {
      return res.status(400).json({ message: "OTP required" });
    }

    if (adminotpStore[adminEmail] !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (username) admin.username = encrypt(username);
    if (password) admin.password = await bcrypt.hash(password, 10);
    if (companyEmail) admin.companyEmail = encrypt(companyEmail);
    if (companyEmailAppPassword) admin.companyEmailAppPassword = encrypt(companyEmailAppPassword);

    if (deliveryAgentEmails && Array.isArray(deliveryAgentEmails)) {
      admin.deliveryAgentEmails = deliveryAgentEmails.map(email => encrypt(email));
    }

    if (deliverableAreas) admin.deliverableAreas = deliverableAreas;

    await admin.save();
    delete adminotpStore[adminEmail];

    res.json({
      message: "✅ Credentials reset successfully",
      admin: { 
        username, 
        deliverableAreas,
        deliveryAgentEmails 
      }
    });
  } catch (err) {
    console.error("Reset creds error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- ADD A NEW DELIVERABLE AREA --------------------
app.post("/api/admin/delivery-area", adminAuth, async (req, res) => {
  try {
    const { label, formattedAddress, latitude, longitude, placeId, mapUrl, radiusKm } = req.body;

    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const newArea = { label, formattedAddress, latitude, longitude, placeId, mapUrl, radiusKm };
    admin.deliverableAreas.push(newArea);
    await admin.save();

    res.json({ message: "✅ Deliverable area added", deliverableAreas: admin.deliverableAreas });
  } catch (err) {
    console.error("Add area error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- UPDATE A DELIVERABLE AREA --------------------
app.put("/api/admin/delivery-area/:index", adminAuth, async (req, res) => {
  try {
    const { index } = req.params;
    const updates = req.body;

    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (!admin.deliverableAreas[index]) {
      return res.status(404).json({ message: "Deliverable area not found" });
    }

    admin.deliverableAreas[index] = { 
      ...admin.deliverableAreas[index].toObject(), 
      ...updates 
    };
    await admin.save();

    // 🔍 Recheck all users’ addresses
    const users = await User.find();
    for (let user of users) {
      user.addresses = user.addresses.filter(addr =>
        addr.latitude && addr.longitude 
          ? isDeliverable(addr.latitude, addr.longitude, admin.deliverableAreas)
          : true // keep if no lat/long provided
      );

      // If selectedAddress is now deleted, unset it
      if (user.selectedAddress && !user.addresses.id(user.selectedAddress)) {
        user.selectedAddress = undefined;
      }

      await user.save();
    }

    res.json({ message: "✅ Deliverable area updated & user addresses revalidated", deliverableAreas: admin.deliverableAreas });
  } catch (err) {
    console.error("Update area error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


app.delete("/api/admin/delivery-area/:index", adminAuth, async (req, res) => {
  try {
    const { index } = req.params;
    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (!admin.deliverableAreas[index]) {
      return res.status(404).json({ message: "Deliverable area not found" });
    }

    admin.deliverableAreas.splice(index, 1);
    await admin.save();

    // 🔍 Recheck all users’ addresses
    const users = await User.find();
    for (let user of users) {
      user.addresses = user.addresses.filter(addr =>
        addr.latitude && addr.longitude 
          ? isDeliverable(addr.latitude, addr.longitude, admin.deliverableAreas)
          : true
      );

      if (user.selectedAddress && !user.addresses.id(user.selectedAddress)) {
        user.selectedAddress = undefined;
      }

      await user.save();
    }

    res.json({ message: "✅ Deliverable area deleted & user addresses revalidated", deliverableAreas: admin.deliverableAreas });
  } catch (err) {
    console.error("Delete area error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// -------------------- CUSTOMER AUTH --------------------



// ------------------ TEMP OTP STORE ------------------
let otpStore = {}; // { email: { otp: "123456", expires: 123456789 } }

// ------------------ SEND OTP ------------------
app.post("/api/send-otp", async (req, res) => {
  console.log("Received OTP request", req.body);
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });
  const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const companyEmail = decrypt(admin.companyEmail);
    const appPassword = decrypt(admin.companyEmailAppPassword);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: companyEmail,
        pass: appPassword,
      },
    });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    const expires = Date.now() + 5 * 60 * 1000; // valid for 5 min

    otpStore[email] = { otp, expires };

    await transporter.sendMail({
      from: `"Ecommerce Shopping" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔐 Verify Your Email - Ecommerce Shopping",
      text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
      html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fb; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08);">
          
          <!-- Header with Logo -->
          <div style="background: linear-gradient(135deg, #ff7e5f, #feb47b); padding: 20px; text-align: center;">
            <img src="cid:ecommerceLogo" alt="Ecommerce Shopping Logo" style="max-width: 120px; margin-bottom: 10px;" />
            <h1 style="color: #fff; margin: 0; font-size: 24px;">Ecommerce Shopping</h1>
          </div>
          
          <!-- Body -->
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 10px;">Email Verification</h2>
            <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
              Use the One-Time Password (OTP) below to complete your verification.
            </p>
            
            <div style="background: #fef4f2; border: 2px dashed #ff7e5f; display: inline-block; padding: 15px 30px; border-radius: 10px; font-size: 28px; font-weight: bold; color: #ff5722; letter-spacing: 6px;">
              ${otp}
            </div>
            
            <p style="color: #777; font-size: 14px; margin-top: 25px;">
              ⏳ This OTP will expire in <b>5 minutes</b>. <br/>For your security, do not share it with anyone.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background: #fafafa; padding: 15px; text-align: center; font-size: 13px; color: #888;">
            © ${new Date().getFullYear()} Ecommerce Shopping. All rights reserved.
          </div>
          
        </div>
      </div>
      `,
      attachments: [
        {
          filename: "logo.png", // name you want it to appear as
          path: "./logo.png", // <-- path to your local logo
          cid: "ecommerceLogo" // same as used in <img src="cid:ecommerceLogo" />
        }
      ]
    });

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

// ------------------ VERIFY OTP ------------------
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Missing fields" });

  const record = otpStore[email];
  if (!record) return res.status(400).json({ message: "No OTP sent" });

  if (record.expires < Date.now()) {
    delete otpStore[email];
    return res.status(400).json({ message: "OTP expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  delete otpStore[email];
  res.json({ message: "OTP verified" });
});


app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Build cartData dynamically from current products
    const products = await Product.find();
    let cartData = {};
    products.forEach((product) => {
      cartData[product._id] = {};
      Object.keys(product.quantity_price).forEach((size) => {
        cartData[product._id][size] = 0;
      });
    });

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      cartData,
    });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ------------------ FORGOT PASSWORD ------------------

// store OTP + flag for reset
let resetOtpStore = {}; // { email: { otp, expires, verified: false } }

// Step 1: Forgot Password - Send OTP
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "Unregistered email. Please signup." });
  const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const companyEmail = decrypt(admin.companyEmail);
    const appPassword = decrypt(admin.companyEmailAppPassword);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: companyEmail,
        pass: appPassword,
      },
    });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 5 * 60 * 1000;

  resetOtpStore[email] = { otp, expires, verified: false };

  await transporter.sendMail({
    from: `"Ecommerce Shopping" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔑 Reset Your Password - Ecommerce Shopping",
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
    html: `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fb; padding: 30px;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08);">
        
        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #36d1dc, #5b86e5); padding: 20px; text-align: center;">
          <img src="cid:ecommercelogo" alt="Ecommerce Shopping Logo" style="max-width: 120px; margin-bottom: 10px;" />
          <h1 style="color: #fff; margin: 0; font-size: 24px;">Ecommerce Shopping</h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 30px; text-align: center;">
          <h2 style="color: #333; margin-bottom: 10px;">Password Reset Request</h2>
          <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
            Use the One-Time Password (OTP) below to reset your password.
          </p>
          
          <div style="background: #f0f7ff; border: 2px dashed #5b86e5; display: inline-block; padding: 15px 30px; border-radius: 10px; font-size: 28px; font-weight: bold; color: #1e40af; letter-spacing: 6px;">
            ${otp}
          </div>
          
          <p style="color: #777; font-size: 14px; margin-top: 25px;">
            ⏳ This OTP will expire in <b>5 minutes</b>. <br/>For your security, do not share it with anyone.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #fafafa; padding: 15px; text-align: center; font-size: 13px; color: #888;">
          © ${new Date().getFullYear()} Ecommerce Shopping. All rights reserved.
        </div>
        
      </div>
    </div>
    `,
    attachments: [
      {
        filename: "logo.png",
        path: "./logo.png",
        cid: "ecommercelogo" // must match <img src="cid:ecommercelogo" />
      }
    ]
  });


  res.json({ message: "OTP sent to email" });
});

// Step 2: Verify OTP for Reset
app.post("/api/verify-reset-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = resetOtpStore[email];
  if (!record) return res.status(400).json({ message: "No OTP sent" });
  if (record.expires < Date.now()) return res.status(400).json({ message: "OTP expired" });
  if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

  resetOtpStore[email].verified = true;
  res.json({ message: "OTP verified, you may now reset password" });
});

// Step 3: Reset Password
app.post("/api/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  const record = resetOtpStore[email];
  if (!record || !record.verified) {
    return res.status(400).json({ message: "OTP verification required" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ email }, { $set: { password: hashedPassword } });

  delete resetOtpStore[email];
  res.json({ message: "Password reset successful" });
});

// -------------------- PRODUCTS --------------------

// Add a new product (Admin only)
app.post("/api/products", adminAuth, async (req, res) => {
  try {
    const { name, image, quantity_price, category } = req.body;

    if (!name || !quantity_price) {
      return res
        .status(400)
        .json({ message: "Name and quantity_price are required" });
    }

    let parsedPrices;
    try {
      parsedPrices =
        typeof quantity_price === "string"
          ? JSON.parse(quantity_price)
          : quantity_price;
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid quantity_price format" });
    }

    const newProduct = new Product({
      name,
      image,
      quantity_price: parsedPrices,
      category: category || "Sweets",
    });

    await newProduct.save();
    res
      .status(201)
      .json({ message: "Product added successfully", product: newProduct });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update product (Admin only)
app.put("/api/products/:id", adminAuth, async (req, res) => {
  try {
    const { name, image, quantity_price, category } = req.body;

    let parsedPrices;
    if (quantity_price) {
      try {
        parsedPrices =
          typeof quantity_price === "string"
            ? JSON.parse(quantity_price)
            : quantity_price;
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Invalid quantity_price format" });
      }
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(image && { image }),
        ...(parsedPrices && { quantity_price: parsedPrices }),
        ...(category && { category }),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product updated successfully", product: updated });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all products (Public)
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a product (Admin only) + delete local image if applicable
app.delete("/api/products/:id", adminAuth, async (req, res) => {
  try {
    // Find product first to extract image path
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Attempt to delete image if it's a local /images URL
    if (product.image) {
      try {
        // Expect stored image like: http://localhost:5000/images/<filename>
        const url = new URL(product.image);
        if (url.pathname.startsWith("/images/")) {
          const filename = url.pathname.replace("/images/", "");
          const filePath = path.join(imageDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (e) {
        // If not a valid URL or different format, ignore
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------------------- CART --------------------

// Add item to cart (Customer)
app.post("/api/cart/add", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, size } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.cartData[productId]) user.cartData[productId] = {};
    if (user.cartData[productId][size] === undefined)
      user.cartData[productId][size] = 0;

    user.cartData[productId][size] += 1;

    user.markModified("cartData");
    await user.save();
    res.json({ message: "Item added to cart", cartData: user.cartData });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Remove item from cart (Customer)
app.post("/api/cart/remove", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, size } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.cartData[productId]?.[size] > 0) {
      user.cartData[productId][size] -= 1;
    }

    user.markModified("cartData");
    await user.save();
    res.json({ message: "Item removed from cart", cartData: user.cartData });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Fetch cart (Customer) — auto-sync with latest products
app.get("/api/cart", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const products = await Product.find();
    products.forEach((product) => {
      if (!user.cartData[product._id]) user.cartData[product._id] = {};
      Object.keys(product.quantity_price).forEach((size) => {
        if (user.cartData[product._id][size] === undefined) {
          user.cartData[product._id][size] = 0;
        }
      });
    });

    user.markModified("cartData");
    await user.save();

    res.json(user.cartData);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Remove ALL of a product-size (Customer)
app.post("/api/cart/removeAll", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, size } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.cartData[productId] && user.cartData[productId][size] !== undefined) {
      delete user.cartData[productId][size];
      if (Object.keys(user.cartData[productId]).length === 0) {
        delete user.cartData[productId];
      }
    }

    user.markModified("cartData");
    await user.save();

    res.json({
      message: "Item completely removed from cart",
      cartData: user.cartData,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

//CLEAR CART 
app.post("/api/cart/clear", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.cartData = {}; // 🔥 Empty the cart
    user.markModified("cartData");
    await user.save();

    res.json({ message: "Cart cleared", cartData: user.cartData });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================= CHARGES (Admin Only) =================
const Charge = require("./models/Charge");

// Create or Update Charges
app.post("/api/charges", adminAuth, async (req, res) => {
  try {
    console.log("Charges Accessed")
    const { deliveryCharge, otherCharges } = req.body;

    if (!deliveryCharge || deliveryCharge.freeUptoKm == null || deliveryCharge.ratePerKm == null) {
      return res.status(400).json({ message: "Delivery charge details are required" });
    }

    // Since we usually want only one Charge document, we update existing or create new
    let charge = await Charge.findOne();
    if (charge) {
      charge.deliveryCharge = deliveryCharge;
      charge.otherCharges = otherCharges || [];
    } else {
      charge = new Charge({ deliveryCharge, otherCharges });
    }

    await charge.save();
    res.status(201).json({ message: "Charges saved successfully", charge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



// Get Charges (Public)
app.get("/api/charges", async (req, res) => {
  try {
    const charge = await Charge.findOne();
    if (!charge) return res.status(404).json({ message: "Charges not found" });

    res.json(charge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Edit a specific Other Charge (Admin)
app.put("/api/charges/other/:id", adminAuth, async (req, res) => {
  try {
    const { name, percent } = req.body;
    let charge = await Charge.findOne();
    if (!charge) return res.status(404).json({ message: "Charges not found" });

    const otherCharge = charge.otherCharges.id(req.params.id);
    if (!otherCharge) return res.status(404).json({ message: "Other charge not found" });

    if (name) otherCharge.name = name;
    if (percent != null) otherCharge.percent = percent;

    await charge.save();
    res.json({ message: "Other charge updated successfully", charge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a specific Other Charge (Admin)
app.delete("/api/charges/other/:id", adminAuth, async (req, res) => {
  try {
    let charge = await Charge.findOne();
    if (!charge) return res.status(404).json({ message: "Charges not found" });

    const exists = charge.otherCharges.id(req.params.id);
    if (!exists) return res.status(404).json({ message: "Other charge not found" });

    // ✅ Correct way to delete in Mongoose 6+
    charge.otherCharges.pull({ _id: req.params.id });
    await charge.save();

    res.json({ message: "Other charge deleted successfully", charge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// -------------------- PROMO CODES (Admin only) --------------------
app.post("/api/promos", adminAuth, async (req, res) => {
  try {
    const { code, type, value } = req.body;

    if (!code || !type || !value) {
      return res
        .status(400)
        .json({ message: "Code, type, and value are required" });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "Promo code already exists" });
    }

    const promo = new PromoCode({
      code: code.toUpperCase(),
      type,
      value,
    });

    await promo.save();
    res.status(201).json({ message: "Promo created", promo });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Public list (if you prefer admin-only, add adminAuth here too)
app.get("/api/promos", async (req, res) => {
  try {
    const promos = await PromoCode.find();
    res.json(promos);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.delete("/api/promos/:id", adminAuth, async (req, res) => {
  try {
    const deleted = await PromoCode.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Promo not found" });

    res.json({ message: "Promo deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Validate (Public)
app.get("/api/promos/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const promo = await PromoCode.findOne({ code: code.toUpperCase() });

    if (!promo) {
      return res.status(404).json({ message: "Invalid code" });
    }

    res.json(promo);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

function isDeliverable(latitude, longitude, areas) {
  for (let area of areas) {
    const dist = getDistanceKm(latitude, longitude, area.latitude, area.longitude);
    if (dist <= area.radiusKm) {
      return true;
    }
  }
  return false;
}

// Haversine formula
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get all addresses of logged-in user
app.get("/api/addresses", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.selectedAddress && user.addresses.length > 0) {
      const defaultAddr =
        user.addresses.find((a) => a.isDefault)?._id || user.addresses[0]._id;
      user.selectedAddress = defaultAddr;
      await user.save();
    }

    res.json({
      addresses: user.addresses,
      selectedAddress: user.selectedAddress,
    });
  } catch (err) {
    console.log("Address Fetching Error " + err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Add a new address
app.post("/api/addresses", auth, async (req, res) => {
  try {
    const {
      label,
      fullName,
      phone,
      street,
      landmark,
      city,
      state,
      postalCode,
      country,
      isDefault,
      formattedAddress,
      latitude,
      longitude,
      placeId,
      mapUrl,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🚚 Fetch deliverable areas from Admin
    const admin = await Admin.findOne();
    const areas = admin?.deliverableAreas || [];

    let deliverable = false;
    for (let area of areas) {
      const dist = getDistanceKm(latitude, longitude, area.latitude, area.longitude);
      if (dist <= area.radiusKm) {
        deliverable = true;
        break;
      }
    }

    if (!deliverable) {
      return res.status(400).json({ message: "❌ Sorry, we do not deliver here at the moment." });
    }

    if (isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    const newAddress = {
      label,
      fullName,
      phone,
      street,
      landmark,
      city,
      state,
      postalCode,
      country,
      formattedAddress,
      latitude,
      longitude,
      placeId,
      mapUrl,
      isDefault,
    };

    user.addresses.push(newAddress);
    await user.save();

    console.log("Address Added");
    res.status(201).json({ message: "Address added", addresses: user.addresses });
  } catch (err) {
    console.log("Address Addition Error " + err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Edit an existing address
app.put("/api/addresses/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ message: "Address not found" });

    // 🚚 Check deliverability again if lat/lng are updated
    if (req.body.latitude && req.body.longitude) {
      const admin = await Admin.findOne();
      const areas = admin?.deliverableAreas || [];

      let deliverable = false;
      for (let area of areas) {
        const dist = getDistanceKm(req.body.latitude, req.body.longitude, area.latitude, area.longitude);
        if (dist <= area.radiusKm) {
          deliverable = true;
          break;
        }
      }

      if (!deliverable) {
        return res.status(400).json({ message: "❌ Sorry, we do not deliver here at the moment." });
      }
    }

    if (req.body.isDefault) {
      user.addresses.forEach((addr) => (addr.isDefault = false));
    }

    Object.assign(address, req.body);

    await user.save();
    console.log("Address updated");
    res.json({ message: "Address updated", addresses: user.addresses });
  } catch (err) {
    console.log("Address Editing Error " + err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Delete an address
app.delete("/api/addresses/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ message: "Address not found" });

    address.deleteOne();

    if (String(user.selectedAddress) === String(req.params.id)) {
      user.selectedAddress = undefined;
    }

    await user.save();
    console.log("Address deleted");
    res.json({ message: "Address deleted", addresses: user.addresses });
  } catch (err) {
    console.log("Address Deleting Error " + err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Set selected address
app.put("/api/addresses/select/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const address = user.addresses.id(req.params.id);
    if (!address) return res.status(404).json({ message: "Address not found" });

    user.selectedAddress = address._id;
    await user.save();
    console.log("Selected address updated");
    res.json({
      message: "Selected address updated",
      selectedAddress: user.selectedAddress,
    });
  } catch (err) {
    console.log("Address Selection Error " + err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// -------------------- ORDERS --------------------

// 🆕 Place New Order
app.post("/api/orders", auth, async (req, res) => {
  try {
    const { items, totalPrice, deliveryAddress, razorpay_order_id } = req.body; // ✅ include razorpay_order_id

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const order = new Order({
      user: user._id,
      name: user.name,
      email: user.email,
      items,
      totalPrice,
      deliveryAddress,
      razorpay_order_id,         
      status: "Pending",
      deliveryStatus: "Received"
    });

    await order.save();
    console.log("✅ User's Order Saved");

    res.status(201).json(order);
  } catch (err) {
    console.error("❌ Order creation error:", err);
    res.status(500).json({ message: "Failed to create order" });
  }
});

// 📧 Send order emails (admin + customer)
app.post("/api/orders/send-mails", auth, async (req, res) => {
  try {
    const { orderId } = req.body;

    // 🔍 fetch order + user
    const order = await Order.findById(orderId).populate("user");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const user = order.user;
    const items = order.items;
    const totalPrice = order.totalPrice;
    const deliveryAddress = order.deliveryAddress;

    const admin = await Admin.findOne();
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const companyEmail = decrypt(admin.companyEmail);
    const appPassword = decrypt(admin.companyEmailAppPassword);

    const deliveryAgentEmails = admin.deliveryAgentEmails.map(email => decrypt(email));

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: companyEmail,
        pass: appPassword,
      },
    });

    // --- Mail to Admin ---
        const adminMail = {
        from: `"Ecommerce Shopping Orders" <${companyEmail}>`,
        to: companyEmail,
        subject: `🆕 New Order Received - ${order._id}`,
        html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fb; padding: 30px;">
          <div style="max-width: 650px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #43cea2, #185a9d); padding: 20px; text-align: center;">
              <img src="cid:ecommerceLogo" alt="Ecommerce Shopping Logo" style="max-width: 120px; margin-bottom: 10px;" />
              <h1 style="color: #fff; margin: 0; font-size: 24px;">New Order Received</h1>
            </div>

            <!-- Body -->
            <div style="padding: 30px; color: #333;">
              <h2>📦 Order ID: ${order._id}</h2>
              <p><b>Date:</b> ${new Date(order.createdAt).toLocaleString()}</p>
              
              <h3>👤 Customer:</h3>
              <p>${user.name} (${user.email})</p>
              
              <h3>🏠 Delivery Address:</h3>
              <p>${deliveryAddress.fullName}<br/>
              ${deliveryAddress.phone}<br/>
              ${deliveryAddress.landmark}<br/>
                ${deliveryAddress.formattedAddress} <br/>
                <a href="${deliveryAddress.mapUrl}" target="_blank" 
                style="display:inline-block; margin-top:8px; padding:8px 14px; 
                        background:linear-gradient(135deg,#43cea2,#185a9d); 
                        color:#fff; font-weight:600; text-decoration:none; 
                        border-radius:6px; font-size:14px;">
                📍 View on Google Maps
                </a>
              </p>
              
              <h3>🛒 Items:</h3>
              <ul style="padding-left:20px; color:#444;">
                ${items.map(item => 
                  `<li>${item.productName} (${item.size}) ×${item.quantity} — <b>₹${item.price}</b></li>`
                ).join("")}
              </ul>
              
              <h2 style="margin-top:20px;">💰 Total: ₹${totalPrice}</h2>
              
              <h3 style="margin-top:15px;">💳 Payment Method:</h3>
              <p><b>${order.status}</b></p>
            </div>

            <!-- Footer -->
            <div style="background: #fafafa; padding: 15px; text-align: center; font-size: 13px; color: #888;">
              © ${new Date().getFullYear()} Ecommerce Shopping. All rights reserved.
            </div>
          </div>
        </div>
        `,
        attachments: [
          {
            filename: "logo.png",
            path: "./logo.png",
            cid: "ecommerceLogo"
          }
        ]
      };

    await transporter.sendMail(adminMail);
    console.log("📧 Order notification sent to admin");

    // --- Mail to Delivery Agents ---
if (deliveryAgentEmails.length > 0) {
  const deliveryMail = {
    from: `"Ecommerce Shopping Orders" <${companyEmail}>`,
    to: deliveryAgentEmails, // 👈 send to all agents
    subject: `🚚 New Delivery Assigned - ${order._id}`,
    html: `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #eef5f9; padding: 30px;">
      <div style="max-width: 650px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1d976c, #93f9b9); padding: 20px; text-align: center;">
          <img src="cid:ecommerceLogo" alt="Ecommerce Shopping Logo" style="max-width: 120px; margin-bottom: 10px;" />
          <h1 style="color: #fff; margin: 0; font-size: 24px;">New Delivery Assigned</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px; color: #333;">
          <p>Hello Delivery Partner,</p>
          <p>You have been assigned a new delivery request. Please check the details below:</p>

          <h2>📦 Order ID: ${order._id}</h2>
          <p><b>Date:</b> ${new Date(order.createdAt).toLocaleString()}</p>

          <h3>🏠 Delivery Address:</h3>
          <p>${deliveryAddress.fullName}<br/>
          ${deliveryAddress.phone}<br/>
          ${deliveryAddress.landmark || ""}<br/>
          ${deliveryAddress.formattedAddress} <br/>
            <a href="${deliveryAddress.mapUrl}" target="_blank" 
              style="display:inline-block; margin-top:8px; padding:8px 14px; 
                      background:linear-gradient(135deg,#1d976c,#93f9b9); 
                      color:#fff; font-weight:600; text-decoration:none; 
                      border-radius:6px; font-size:14px;">
              📍 View on Google Maps
            </a>
          </p>

          <h3>🛒 Items to Deliver:</h3>
          <ul style="padding-left:20px; color:#444;">
            ${items.map(item => 
              `<li>${item.productName} (${item.size}) ×${item.quantity}</li>`
            ).join("")}
          </ul>

          <h2 style="margin-top:20px;">💰 Total Amount: ₹${totalPrice}</h2>
        </div>

        <!-- Footer -->
        <div style="background: #fafafa; padding: 15px; text-align: center; font-size: 13px; color: #888;">
          🚚 Please ensure timely and safe delivery.<br/>
          © ${new Date().getFullYear()} Ecommerce Shopping. All rights reserved.
        </div>
      </div>
    </div>
    `,
    attachments: [
      {
        filename: "logo.png",
        path: "./logo.png",
        cid: "ecommerceLogo"
      }
    ]
  };

  await transporter.sendMail(deliveryMail);
  console.log("📧 Order notification sent to delivery agents");
}



   // --- Mail to Customer ---
const customerMail = {
  from: `"Ecommerce Shopping" <${companyEmail}>`,
  to: user.email,
  subject: `✅ Order Confirmation - ${order._id}`,
  html: `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fb; padding: 30px;">
    <div style="max-width: 650px; margin: auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ff7e5f, #feb47b); padding: 20px; text-align: center;">
        <img src="cid:ecommerceLogo" alt="Ecommerce Shopping Logo" style="max-width: 120px; margin-bottom: 10px;" />
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Order Confirmed 🎉</h1>
      </div>

      <!-- Body -->
      <div style="padding: 30px; color: #333;">
        <p>Hi <b>${user.name}</b>,</p>
        <p>Thank you for shopping with us! Your order has been placed successfully.</p>

        <h2>📦 Order ID: ${order._id}</h2>
        <p><b>Status:</b> ${order.deliveryStatus}</p>

        <h3>🛒 Items:</h3>
        <ul style="padding-left:20px; color:#444;">
          ${items.map(item => 
            `<li>${item.productName} (${item.size}) ×${item.quantity} — <b>₹${item.price}</b></li>`
          ).join("")}
        </ul>

        <h2 style="margin-top:20px;">💰 Total Paid: ₹${totalPrice}</h2>

        <h3 style="margin-top:15px;">💳 Payment Method:</h3>
        <p><b>${order.status}</b></p>

        <h3>🏠 Delivery Address:</h3>
        <p>${deliveryAddress.fullName}<br/>
        ${deliveryAddress.phone}<br/>
        ${deliveryAddress.landmark}<br/>
        ${deliveryAddress.formattedAddress} <br/>
          <a href="${deliveryAddress.mapUrl}" target="_blank" 
          style="display:inline-block; margin-top:8px; padding:8px 14px; 
                  background:linear-gradient(135deg,#ff7e5f,#feb47b); 
                  color:#fff; font-weight:600; text-decoration:none; 
                  border-radius:6px; font-size:14px;">
          📍 View on Google Maps
          </a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #fafafa; padding: 15px; text-align: center; font-size: 13px; color: #888;">
        © ${new Date().getFullYear()} Ecommerce Shopping. All rights reserved.
      </div>
    </div>
  </div>
  `,
  attachments: [
    {
      filename: "logo.png",
      path: "./logo.png",
      cid: "ecommerceLogo"
    }
  ]
};


    await transporter.sendMail(customerMail);
    console.log("📧 Order confirmation sent to customer");

    res.json({ message: "Emails sent successfully" });
  } catch (err) {
    console.error("❌ Send mail error:", err);
    res.status(500).json({ message: "Failed to send emails" });
  }
});

// 📦 Get all orders for logged-in user
app.get("/api/orders", auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    console.log("📦 User's Orders Fetched");
    res.json(orders);
  } catch (err) {
    console.error("❌ Fetch orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// 🚚 Update delivery status (admin only)
app.patch("/api/orders/:id/delivery", adminAuth, async (req, res) => {
  try {
    const { deliveryStatus } = req.body;

    if (!["Received", "Preparing", "Out for Delivery", "Delivered"].includes(deliveryStatus)) {
      return res.status(400).json({ message: "Invalid delivery status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { deliveryStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    console.log(`🚚 Order ${order._id} updated to ${deliveryStatus}`);
    res.json(order);
  } catch (err) {
    console.error("❌ Update delivery status error:", err);
    res.status(500).json({ message: "Failed to update delivery status" });
  }
});

// 📦 Get ALL orders (admin only)
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  try {
    console.log("Fetching All Orders For Admin")
    const orders = await Order.find().sort({ createdAt: -1 });
    console.log("📦 All Orders Fetched (Admin)");
    res.json(orders);
  } catch (err) {
    console.error("❌ Fetch all orders error:", err);
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
});

// PUT /admin/orders/:id/delivery-status
app.put("/api/admin/orders/:id/delivery-status", adminAuth, async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { deliveryStatus },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Error updating delivery status" });
  }
});

// ----------------------------- PAYMENTS -----------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay Order
app.post("/api/payment/orders", auth, async (req, res) => {
  try {
    let { amount } = req.body; // amount in INR

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: "Amount is required and must be a number" });
    }

    // 🔥 Convert to paise (required by Razorpay)
    const options = {
      amount: Math.round(amount * 100), // e.g. 299 INR → 29900 paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    console.log("Razorpay order created")
    return res.json(order);
  } catch (err) {
    console.error("Order creation failed:", err);
    return res.status(500).json({ message: "Failed to create order" });
  }
});

// ✅ Verify Payment
app.post("/api/payment/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log("Missing payment details")
      return res.status(400).json({ message: "Missing payment details" });
    }

    const crypto = require("crypto");
    const sign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (sign === razorpay_signature) {
      // ✅ Verified → mark as Paid
      const order = await Order.findOneAndUpdate(
        { razorpay_order_id },
        {
          razorpay_payment_id,
          razorpay_signature,
          status: "Paid",
        },
        { new: true }
      );
      console.log("✅ Payment verified")

      return res.json({ success: true, message: "✅ Payment verified", order });
    } else {
      // ❌ Failed → delete only if still Pending
      await Order.findOneAndDelete({ razorpay_order_id, status: "Pending" });
      console.log("❌ Payment verification failed, order deleted")
      return res.status(400).json({ success: false, message: "❌ Payment verification failed, order deleted" });
    }

  } catch (err) {
    console.error("Payment verification error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// -------------------- UPDATE ORDER STATUS --------------------
app.put("/api/orders/:id/status", auth, async (req, res) => {
  try {
    const { status, refundAmount } = req.body; // refundAmount optional
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!status) return res.status(400).json({ message: "Status is required" });

    // 🚀 Handle refund requests safely
    if (status.toLowerCase() === "refund") {
      if (order.status !== "Paid") {
        console.log("Refund allowed only for Paid orders")
        return res.status(400).json({ message: "Refund allowed only for Paid orders" });
      }
      if (!order.razorpay_payment_id) {
        console.log("No payment ID linked with this order")
        return res.status(400).json({ message: "No payment ID linked with this order" });
      }

      const refundOptions = {};
      if (refundAmount) {
        refundOptions.amount = Math.round(refundAmount * 100); // INR → paise
      }

      refundOptions.speed = "optimum";

      const refund = await razorpay.payments.refund(order.razorpay_payment_id, refundOptions);

      // Save refund details
      order.status = refundOptions.amount ? "Partially Refunded" : "Refunded";
      order.refund = {
        refund_id: refund.id,
        amount: refund.amount / 100, // back to INR
        status: refund.status,
        processedAt: refund.created_at ? new Date(refund.created_at * 1000) : new Date(),
      };
    } else {
      // Normal status updates (Delivered, Cancelled, etc.)
      order.status = status;
    }

    await order.save();

    console.log(`Order ${order._id} status updated to ${order.status}`);
    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

// -------------------- OPTIONAL: Manual Refund Endpoint --------------------
// Admin Refund Order
app.put("/api/admin/orders/:id/refund", auth, async (req, res) => {
  try {
    const { refundAmount } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "Paid") {
      console.log("Refund allowed only for Paid orders")
      return res.status(400).json({ message: "Refund allowed only for Paid orders" });
    }
    if (!order.razorpay_payment_id) {
      console.log("No payment ID linked with this order")
      return res.status(400).json({ message: "No payment ID linked with this order" });
    }

    const refundOptions = {};
    if (refundAmount) refundOptions.amount = Math.round(refundAmount * 100);
    
    refundOptions.speed = "optimum";

    const refund = await razorpay.payments.refund(order.razorpay_payment_id, refundOptions);

    order.status = refundOptions.amount ? "Partially Refunded" : "Refunded";
    order.refund = {
      refund_id: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      processedAt: refund.created_at ? new Date(refund.created_at * 1000) : new Date(),
    };
    console.log("Refund processed")
    await order.save();
    res.json({ success: true, message: "Refund processed", order });
  } catch (err) {
    console.error("Admin Refund error:", err);
    res.status(500).json({ message: "Refund failed", error: err.message });
  }
});

// PING
app.post("/api/ping", (req, res) => {
  res.json({ message: "pong" });
});

// -------------------- Start Server --------------------
app.listen(PORT, (error) => {
  if (!error) {
    console.log("Server Running on Port " + PORT);
  } else {
    console.log("Error : " + error);
  }
});
