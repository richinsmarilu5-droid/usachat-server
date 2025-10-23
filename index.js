const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("USAChat Server is running successfully 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
