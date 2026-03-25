import { Router, type Response } from "express";
import { db, savedCalendarsTable, maintenanceLogTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

router.post("/user/calendar", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { quizAnswers, calendarData } = req.body;
  if (!quizAnswers || !calendarData) {
    res.status(400).json({ error: "Missing quizAnswers or calendarData" });
    return;
  }
  const [saved] = await db
    .insert(savedCalendarsTable)
    .values({ userId: req.userId!, quizAnswers, calendarData })
    .returning();
  res.status(201).json(saved);
});

router.get("/user/calendar/latest", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const [latest] = await db
    .select()
    .from(savedCalendarsTable)
    .where(eq(savedCalendarsTable.userId, req.userId!))
    .orderBy(desc(savedCalendarsTable.createdAt))
    .limit(1);
  res.json(latest ?? null);
});

router.get("/user/log", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const entries = await db
    .select()
    .from(maintenanceLogTable)
    .where(eq(maintenanceLogTable.userId, req.userId!))
    .orderBy(desc(maintenanceLogTable.completedAt));
  res.json(entries);
});

router.post("/user/log", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { taskName, taskKey, month, notes, zipCode } = req.body;
  if (!taskName || !taskKey || !month) {
    res.status(400).json({ error: "taskName, taskKey, and month are required" });
    return;
  }
  const [entry] = await db
    .insert(maintenanceLogTable)
    .values({
      userId: req.userId!,
      taskName,
      taskKey,
      month,
      notes: notes ?? null,
      zipCode: zipCode ?? null,
    })
    .returning();
  res.status(201).json(entry);
});

router.delete("/user/log/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(maintenanceLogTable)
    .where(and(eq(maintenanceLogTable.id, id), eq(maintenanceLogTable.userId, req.userId!)));
  res.json({ ok: true });
});

export default router;
