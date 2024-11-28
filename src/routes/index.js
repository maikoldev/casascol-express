import { Router } from "express";

const mainRouter = Router();

import { importFirstStep, importSecondStep } from "../services/properties.js";

mainRouter.post("/import/first", async (req, res) => {
  importFirstStep(req, res);
});

mainRouter.get("/import/second", (req, res) => {
  importSecondStep(req, res);
});

export default mainRouter;
