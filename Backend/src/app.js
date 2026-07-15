const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const researchRoutes = require("./routes/research");
const commitRoutes = require("./routes/commit");
const verifyRoutes = require("./routes/verify");

const app = express();

app.use(cors());
app.use(express.json());

app.use(researchRoutes);
app.use(commitRoutes);
app.use(verifyRoutes);

app.use(errorHandler);

module.exports = app;
