// ✅ USAChat Full Server (Twilio + TRC20 + MongoDB + Frontend Support)
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const twilio = require("twilio");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Twilio Client Setup
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ তোমার USDT (TRC20) ওয়ালেট অ্যাড্রেস
const YOUR_WALLET = "TM4psMQXmGizJ9FmLhhqhbTz9peZs1FJqK";

// =========================================================
// ✅ ROUTE 1 — Verify TRC20 Payment (TXID Check)
// =========================================================
app.post("/api/verify-txid", async (req, res) => {
  const { txid } = req.body;

  if (!txid) {
    return res.status(400).json({ success: false, message: "TXID required" });
  }

  try {
    const url = `https://apilist.tronscan.org/api/transaction-info?hash=${txid}`;
    const response = await axios.get(url);
    const data = response.data;

    const toAddress =
      data.contractData?.to_address ||
      data.trigger_info?.parameter?.value?.to_address ||
      "";

    const amountRaw =
      data.contractData?.amount ||
      data.trigger_info?.parameter?.value?.amount ||
      0;

    const amountUSDT = amountRaw / 1_000_000;

    if (toAddress === YOUR_WALLET && amountUSDT >= 10) {
      console.log("✅ Payment verified:", txid, "Amount:", amountUSDT);
      return res.json({
        success: true,
        data: { amount: amountUSDT },
        message: "Payment verified ✅",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "TXID not sent to your wallet or amount insufficient",
      });
    }
  } catch (err) {
    console.error("❌ Verification error:", err.message);
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
});

// =========================================================
// ✅ ROUTE 2 — Send SMS via Twilio
// =========================================================
app.post("/api/send-sms", async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ success: false, message: "to & message required" });
  }

  try {
    const options = { body: message, to };

    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      options.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    } else {
      options.from = process.env.TWILIO_PHONE_NUMBER;
    }

    const msg = await client.messages.create(options);
    console.log("📩 SMS sent successfully:", msg.sid);

    res.json({ success: true, sid: msg.sid });
  } catch (err) {
    console.error("❌ SMS Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================
// ✅ ROUTE 3 — Get All Twilio Numbers
// =========================================================
app.get("/api/get-numbers", async (req, res) => {
  try {
    const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });
    const list = numbers.map((n) => ({
      sid: n.sid,
      phoneNumber: n.phoneNumber,
      friendlyName: n.friendlyName || "My Twilio Number",
    }));

    res.json({ success: true, numbers: list });
  } catch (err) {
    console.error("❌ Error fetching numbers:", err.message);
    res.status(500).json({ success: false, message: "Failed to load Twilio numbers" });
  }
});

// =========================================================
// ✅ Incoming SMS Webhook
// =========================================================
app.post("/api/webhook", (req, res) => {
  console.log("📩 Incoming SMS:", req.body);
  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>Message received!</Message></Response>`);
});

// =========================================================
// ✅ Serve Frontend (optional if you upload HTML/CSS/JS here)
// =========================================================
app.use(express.static(path.join(__dirname, "public")));

// =========================================================
// ✅ Default Route
// =========================================================
app.get("/", (req, res) => {
  res.send("✅ USAChat Server Running — Twilio + TRC20 + MongoDB Connected 🚀");
});

// =========================================================
// ✅ Start Server
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

