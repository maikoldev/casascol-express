import express from "express";
import cors from "cors";

import mainRouter from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.disable("x-powered-by"); // Disable x-powered-by header

app.use(cors())

app.use("/api", mainRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
