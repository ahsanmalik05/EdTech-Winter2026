import express from "express";
import { getWorksheetsByTitle } from "../controllers/worksheets.js";

const router = express.Router();

router.get("/title/:title", getWorksheetsByTitle);

export default router;
