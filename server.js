const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const { db1, db2 } = require("./db");
const userRoutes = require("./routes/user");
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/qrcodes", express.static(path.join(__dirname, "public/qrcodes")));
app.use(
  session({
    secret: "file-tracking-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);


// ✅ Routes
app.use("/api", require("./routes/auth.js"));
app.use("/api/files", require("./routes/files.js"));
app.use("/api/departments", require("./routes/departments.js"));
app.use("/api/folder", require("./routes/folder.js"));
app.use("/api/file_movement", require("./routes/fileMovement.js"));
app.use("/api/locations", require("./routes/locations.js"));
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/api/session", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ error: "Unauthorized" });
  res.json(req.session.user);
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
