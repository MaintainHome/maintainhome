import { Router, type Response } from "express";
import { db, savedCalendarsTable, maintenanceLogTable, maintenanceNotesTable, maintenanceDocumentsTable, homeProfilesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requirePro, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

// ─── Calendar ────────────────────────────────────────────────────────────────

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

// ─── Maintenance Log (completed tasks) ───────────────────────────────────────

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

// ─── Custom Notes ─────────────────────────────────────────────────────────────

router.get("/user/notes", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const notes = await db
    .select()
    .from(maintenanceNotesTable)
    .where(eq(maintenanceNotesTable.userId, req.userId!))
    .orderBy(desc(maintenanceNotesTable.noteDate));
  res.json(notes);
});

router.post("/user/notes", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { title, noteDate, content } = req.body;
  if (!title || !noteDate || !content) {
    res.status(400).json({ error: "title, noteDate, and content are required" });
    return;
  }
  const [note] = await db
    .insert(maintenanceNotesTable)
    .values({ userId: req.userId!, title: title.trim(), noteDate, content: content.trim() })
    .returning();
  res.status(201).json(note);
});

router.delete("/user/notes/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(maintenanceNotesTable)
    .where(and(eq(maintenanceNotesTable.id, id), eq(maintenanceNotesTable.userId, req.userId!)));
  res.json({ ok: true });
});

// ─── Documents ────────────────────────────────────────────────────────────────

router.get("/user/documents", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const docs = await db
    .select()
    .from(maintenanceDocumentsTable)
    .where(eq(maintenanceDocumentsTable.userId, req.userId!))
    .orderBy(desc(maintenanceDocumentsTable.uploadedAt));
  res.json(docs);
});

router.post("/user/documents", requireAuth as any, requirePro as any, async (req: AuthRequest, res: Response) => {
  const { fileName, objectPath, contentType, fileSizeBytes } = req.body;
  if (!fileName || !objectPath || !contentType) {
    res.status(400).json({ error: "fileName, objectPath, and contentType are required" });
    return;
  }
  const [doc] = await db
    .insert(maintenanceDocumentsTable)
    .values({
      userId: req.userId!,
      fileName,
      objectPath,
      contentType,
      fileSizeBytes: fileSizeBytes ?? null,
    })
    .returning();
  res.status(201).json(doc);
});

router.delete("/user/documents/:id", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(maintenanceDocumentsTable)
    .where(and(eq(maintenanceDocumentsTable.id, id), eq(maintenanceDocumentsTable.userId, req.userId!)));
  res.json({ ok: true });
});

// ─── Big-Ticket Resolve ───────────────────────────────────────────────────────

router.post("/user/big-ticket/resolve", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { key, name } = req.body as { key?: string; name?: string };
  if (!key || !name) {
    res.status(400).json({ error: "key and name are required" });
    return;
  }

  const [existing] = await db
    .select({ id: homeProfilesTable.id, resolved: homeProfilesTable.resolvedBigTicketKeys })
    .from(homeProfilesTable)
    .where(eq(homeProfilesTable.userId, req.userId!))
    .limit(1);

  const currentResolved: string[] = Array.isArray(existing?.resolved) ? (existing.resolved as string[]) : [];
  if (!currentResolved.includes(key)) {
    const next = [...currentResolved, key];
    if (existing) {
      await db.update(homeProfilesTable).set({ resolvedBigTicketKeys: next, updatedAt: new Date() })
        .where(eq(homeProfilesTable.userId, req.userId!));
    } else {
      await db.insert(homeProfilesTable).values({ userId: req.userId!, resolvedBigTicketKeys: next });
    }
  }

  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "long" });
  await db.insert(maintenanceLogTable).values({
    userId: req.userId!,
    taskName: `Big-ticket item resolved: ${name}`,
    taskKey: `big-ticket-resolved-${key}`,
    month,
    notes: "Big-ticket item marked as resolved by homeowner",
  });

  res.json({ ok: true, resolvedKey: key });
});

router.post("/user/big-ticket/unresolve", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const { key } = req.body as { key?: string };
  if (!key) { res.status(400).json({ error: "key is required" }); return; }

  const [existing] = await db
    .select({ id: homeProfilesTable.id, resolved: homeProfilesTable.resolvedBigTicketKeys })
    .from(homeProfilesTable)
    .where(eq(homeProfilesTable.userId, req.userId!))
    .limit(1);

  const currentResolved: string[] = Array.isArray(existing?.resolved) ? (existing.resolved as string[]) : [];
  const next = currentResolved.filter((k) => k !== key);
  if (existing) {
    await db.update(homeProfilesTable).set({ resolvedBigTicketKeys: next, updatedAt: new Date() })
      .where(eq(homeProfilesTable.userId, req.userId!));
  }
  res.json({ ok: true });
});

// ─── Export (Pro only) ───────────────────────────────────────────────────────

router.get("/user/export", requireAuth as any, requirePro as any, async (_req: AuthRequest, res: Response) => {
  res.json({ status: "coming_soon", message: "PDF & CSV export coming soon for Pro users." });
});

// ─── Home Profile ─────────────────────────────────────────────────────────────

router.get("/user/home-profile", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const [profile] = await db
    .select()
    .from(homeProfilesTable)
    .where(eq(homeProfilesTable.userId, req.userId!))
    .limit(1);
  res.json(profile ?? null);
});

router.put("/user/home-profile", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const {
    fullAddress, bedrooms, bathrooms, finishedBasement, poolOrHotTub,
    lastRenovationYear, yearBuilt, mortgageRate,
    grassType, foundationType, crawlSpaceSealed, hvacType, roofAgeYear,
    sidingType, pastPestIssues, pastPestIssuesNotes,
    newConstructionData,
  } = req.body;

  const values = {
    userId: req.userId!,
    fullAddress: fullAddress ?? null,
    bedrooms: bedrooms != null ? Number(bedrooms) : null,
    bathrooms: bathrooms ?? null,
    finishedBasement: finishedBasement ?? null,
    poolOrHotTub: poolOrHotTub ?? null,
    lastRenovationYear: lastRenovationYear != null ? Number(lastRenovationYear) : null,
    yearBuilt: yearBuilt != null ? Number(yearBuilt) : null,
    mortgageRate: mortgageRate ?? null,
    grassType: grassType ?? null,
    foundationType: foundationType ?? null,
    crawlSpaceSealed: crawlSpaceSealed ?? null,
    hvacType: hvacType ?? null,
    roofAgeYear: roofAgeYear != null ? Number(roofAgeYear) : null,
    sidingType: sidingType ?? null,
    pastPestIssues: pastPestIssues ?? null,
    pastPestIssuesNotes: pastPestIssuesNotes ?? null,
    newConstructionData: newConstructionData ?? null,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: homeProfilesTable.id })
    .from(homeProfilesTable)
    .where(eq(homeProfilesTable.userId, req.userId!))
    .limit(1);

  let result;
  if (existing) {
    [result] = await db
      .update(homeProfilesTable)
      .set(values)
      .where(eq(homeProfilesTable.userId, req.userId!))
      .returning();
  } else {
    [result] = await db
      .insert(homeProfilesTable)
      .values(values)
      .returning();
  }
  res.json(result);
});

export default router;
