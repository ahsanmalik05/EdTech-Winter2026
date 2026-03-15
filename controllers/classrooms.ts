import type { Request, Response } from "express";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { classroom_memberships, classrooms } from "../db/schema.js";
import type { GetClassroomsByTeacherResponse, GetClassroomsByStudentResponse, ErrorResponse } from "../types/index.js";

export const getClassesByTeacherId = async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = parseInt(req.params.teacherId as string, 10);

    if (Number.isNaN(teacherId)) {
      return res.status(400).json({ error: "Invalid teacher id" } as ErrorResponse);
    }

    const classes = await db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        classCode: classrooms.classCode,
        ownerUserId: classrooms.ownerUserId,
        createdAt: classrooms.createdAt,
        updatedAt: classrooms.updatedAt,
      })
      .from(classrooms)
      .leftJoin(
        classroom_memberships,
        and(
          eq(classroom_memberships.classroomId, classrooms.id),
          eq(classroom_memberships.userId, teacherId),
          eq(classroom_memberships.role, "teacher"),
        ),
      )
      .where(
        or(
          eq(classrooms.ownerUserId, teacherId),
          eq(classroom_memberships.userId, teacherId),
        ),
      );

    const response: GetClassroomsByTeacherResponse = { classes };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching teacher classes:", error);
    return res.status(500).json({ error: "Failed to fetch classes" } as ErrorResponse);
  }
};

export const getClassesByStudentId = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = parseInt(req.params.studentId as string, 10);

    if (Number.isNaN(studentId)) {
      return res.status(400).json({ error: "Invalid student id" } as ErrorResponse);
    }

    const classes = await db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        classCode: classrooms.classCode,
        ownerUserId: classrooms.ownerUserId,
        createdAt: classrooms.createdAt,
        updatedAt: classrooms.updatedAt,
      })
      .from(classrooms)
      .innerJoin(
        classroom_memberships,
        and(
          eq(classroom_memberships.classroomId, classrooms.id),
          eq(classroom_memberships.userId, studentId),
          eq(classroom_memberships.role, "student"),
        ),
      );

    const response: GetClassroomsByStudentResponse = { classes };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching student classes:", error);
    return res.status(500).json({ error: "Failed to fetch classes" } as ErrorResponse);
  }
};
