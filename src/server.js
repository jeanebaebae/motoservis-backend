require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.log("Database error:", err.message);
  } else {
    console.log("Database connected");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log("DATABASE_URL:", process.env.DATABASE_URL);