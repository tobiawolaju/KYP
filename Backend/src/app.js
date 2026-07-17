const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const researchRoutes = require("./routes/research");
const commitRoutes = require("./routes/commit");
const verifyRoutes = require("./routes/verify");
const withdrawRoutes = require("./routes/withdraw");
const protocolsRoutes = require("./routes/protocols");
const favoritesRoutes = require("./routes/favorites");

const app = express();

app.use(cors());
app.use(express.json());

app.use(researchRoutes);
app.use(commitRoutes);
app.use(verifyRoutes);
app.use(withdrawRoutes);
app.use(protocolsRoutes);
app.use(favoritesRoutes);

app.use(errorHandler);

module.exports = app;
