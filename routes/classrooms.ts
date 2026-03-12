import express from "express";
import {
	getClassesByStudentId,
	getClassesByTeacherId,
} from "../controllers/classrooms.js";

const router = express.Router();

router.get("/teacher/:teacherId", getClassesByTeacherId);
router.get("/student/:studentId", getClassesByStudentId);

export default router;
