import { Router, type Response } from "express";
import { db, savedCalendarsTable, maintenanceLogTable, maintenanceNotesTable, maintenanceDocumentsTable, homeProfilesTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { requireAuth, requirePro, type AuthRequest } from "../middleware/requireAuth";

const router = Router();

/* ── CSV + PDF helpers for export ──────────────────────────────────────── */
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

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

router.patch("/user/calendar/quiz-answers", requireAuth as any, async (req: AuthRequest, res: Response) => {
  const updates = req.body;
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [latest] = await db
    .select()
    .from(savedCalendarsTable)
    .where(eq(savedCalendarsTable.userId, req.userId!))
    .orderBy(desc(savedCalendarsTable.createdAt))
    .limit(1);
  if (!latest) {
    res.status(404).json({ error: "No calendar found" });
    return;
  }
  const merged = { ...(latest.quizAnswers as Record<string, string>), ...updates };
  const [updated] = await db
    .update(savedCalendarsTable)
    .set({ quizAnswers: merged })
    .where(eq(savedCalendarsTable.id, latest.id))
    .returning();
  res.json(updated);
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

async function loadExportData(userId: number) {
  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const [profile] = await db
    .select()
    .from(homeProfilesTable)
    .where(eq(homeProfilesTable.userId, userId))
    .limit(1);
  const logs = await db
    .select()
    .from(maintenanceLogTable)
    .where(eq(maintenanceLogTable.userId, userId))
    .orderBy(desc(maintenanceLogTable.completedAt));
  const notes = await db
    .select()
    .from(maintenanceNotesTable)
    .where(eq(maintenanceNotesTable.userId, userId))
    .orderBy(desc(maintenanceNotesTable.noteDate));
  const documents = await db
    .select()
    .from(maintenanceDocumentsTable)
    .where(eq(maintenanceDocumentsTable.userId, userId))
    .orderBy(desc(maintenanceDocumentsTable.uploadedAt));

  return { user: userRow, profile, logs, notes, documents };
}

// CSV export
router.get("/user/export.csv", requireAuth as any, requirePro as any, async (req: AuthRequest, res: Response) => {
  try {
    const { user, profile, logs, notes, documents } = await loadExportData(req.userId!);
    const lines: string[] = [];

    lines.push("MaintainHome.ai — Maintenance History Export");
    lines.push(csvRow(["Owner", user?.email ?? ""]));
    if (profile?.fullAddress) lines.push(csvRow(["Property", profile.fullAddress]));
    lines.push(csvRow(["Generated", new Date().toISOString()]));
    lines.push("");

    lines.push("=== COMPLETED TASKS ===");
    lines.push(csvRow(["Date Completed", "Task", "Month", "ZIP Code", "Notes"]));
    for (const l of logs) {
      lines.push(csvRow([fmtDate(l.completedAt), l.taskName, l.month, l.zipCode ?? "", l.notes ?? ""]));
    }
    lines.push("");

    lines.push("=== CUSTOM NOTES ===");
    lines.push(csvRow(["Note Date", "Title", "Content", "Created"]));
    for (const n of notes) {
      lines.push(csvRow([fmtDate(n.noteDate), n.title, n.content, fmtDate(n.createdAt)]));
    }
    lines.push("");

    lines.push("=== DOCUMENTS ===");
    lines.push(csvRow(["Uploaded", "File Name", "Type", "Size (bytes)"]));
    for (const d of documents) {
      lines.push(csvRow([fmtDate(d.uploadedAt), d.fileName, d.contentType, d.fileSizeBytes ?? ""]));
    }

    const csv = lines.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="maintainhome-history-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("[user-data] /user/export.csv error:", err);
    res.status(500).json({ error: "Failed to generate CSV export." });
  }
});

// PDF export
router.get("/user/export.pdf", requireAuth as any, requirePro as any, async (req: AuthRequest, res: Response) => {
  try {
    const { user, profile, logs, notes, documents } = await loadExportData(req.userId!);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="maintainhome-history-${new Date().toISOString().slice(0, 10)}.pdf"`);

    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    doc.pipe(res);

    const ACCENT = "#1f9e6e";
    const SLATE_DARK = "#0f172a";
    const SLATE = "#475569";
    const SLATE_LIGHT = "#94a3b8";

    // Header
    doc.fillColor(ACCENT).fontSize(22).font("Helvetica-Bold").text("MaintainHome.ai", { continued: false });
    doc.moveDown(0.2);
    doc.fillColor(SLATE_DARK).fontSize(16).font("Helvetica-Bold").text("Maintenance History Report");
    doc.moveDown(0.5);

    // Meta line
    doc.fillColor(SLATE).fontSize(10).font("Helvetica");
    doc.text(`Owner: ${user?.email ?? ""}`);
    if (profile?.fullAddress) doc.text(`Property: ${profile.fullAddress}`);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`);
    doc.moveDown(0.5);

    // Accent divider
    const dividerY = doc.y;
    doc.moveTo(50, dividerY).lineTo(562, dividerY).strokeColor(ACCENT).lineWidth(2).stroke();
    doc.moveDown(1);

    // Summary stats box
    doc.fillColor(SLATE_DARK).fontSize(11).font("Helvetica-Bold")
      .text(`Summary: ${logs.length} completed task${logs.length === 1 ? "" : "s"}, ${notes.length} note${notes.length === 1 ? "" : "s"}, ${documents.length} document${documents.length === 1 ? "" : "s"}.`);
    doc.moveDown(1);

    function sectionHeader(title: string) {
      if (doc.y > 700) doc.addPage();
      doc.fillColor(ACCENT).fontSize(13).font("Helvetica-Bold").text(title);
      doc.moveDown(0.3);
      const y = doc.y;
      doc.moveTo(50, y).lineTo(562, y).strokeColor(ACCENT).lineWidth(0.5).stroke();
      doc.moveDown(0.5);
    }

    // Tasks
    sectionHeader("Completed Tasks");
    if (logs.length === 0) {
      doc.fillColor(SLATE_LIGHT).fontSize(10).font("Helvetica-Oblique").text("No completed tasks yet.");
    } else {
      doc.fontSize(10).font("Helvetica");
      for (const l of logs) {
        if (doc.y > 720) doc.addPage();
        doc.fillColor(SLATE_DARK).font("Helvetica-Bold").text(`${l.taskName}`, { continued: true });
        doc.fillColor(SLATE).font("Helvetica").text(`  ·  ${fmtDate(l.completedAt)}  ·  ${l.month}${l.zipCode ? `  ·  ZIP ${l.zipCode}` : ""}`);
        if (l.notes) {
          doc.fillColor(SLATE_LIGHT).fontSize(9).font("Helvetica-Oblique").text(l.notes, { indent: 12 }).fontSize(10);
        }
        doc.moveDown(0.4);
      }
    }
    doc.moveDown(0.6);

    // Notes
    sectionHeader("Custom Notes");
    if (notes.length === 0) {
      doc.fillColor(SLATE_LIGHT).fontSize(10).font("Helvetica-Oblique").text("No custom notes yet.");
    } else {
      doc.fontSize(10).font("Helvetica");
      for (const n of notes) {
        if (doc.y > 700) doc.addPage();
        doc.fillColor(SLATE_DARK).font("Helvetica-Bold").text(n.title, { continued: true });
        doc.fillColor(SLATE).font("Helvetica").text(`  ·  ${fmtDate(n.noteDate)}`);
        doc.fillColor(SLATE).fontSize(10).font("Helvetica").text(n.content, { indent: 12 });
        doc.moveDown(0.4);
      }
    }
    doc.moveDown(0.6);

    // Documents
    sectionHeader("Documents");
    if (documents.length === 0) {
      doc.fillColor(SLATE_LIGHT).fontSize(10).font("Helvetica-Oblique").text("No documents uploaded.");
    } else {
      doc.fontSize(10).font("Helvetica");
      for (const d of documents) {
        if (doc.y > 730) doc.addPage();
        doc.fillColor(SLATE_DARK).font("Helvetica-Bold").text(d.fileName, { continued: true });
        const sizeMb = d.fileSizeBytes ? `${(Number(d.fileSizeBytes) / 1024 / 1024).toFixed(2)} MB` : "—";
        doc.fillColor(SLATE).font("Helvetica").text(`  ·  ${fmtDate(d.uploadedAt)}  ·  ${d.contentType}  ·  ${sizeMb}`);
        doc.moveDown(0.3);
      }
    }

    // Footer on last page
    doc.moveDown(2);
    doc.fillColor(SLATE_LIGHT).fontSize(8).font("Helvetica-Oblique")
      .text("Generated by MaintainHome.ai — your AI-powered home ownership assistant.", { align: "center" });

    doc.end();
  } catch (err) {
    console.error("[user-data] /user/export.pdf error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF export." });
    }
  }
});

// Legacy stub kept for backwards-compat (returns metadata pointing to new endpoints)
router.get("/user/export", requireAuth as any, requirePro as any, async (_req: AuthRequest, res: Response) => {
  res.json({ status: "ready", csvUrl: "/api/user/export.csv", pdfUrl: "/api/user/export.pdf" });
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
    hasGarage, garageType, garageSpaces,
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
    hasGarage: hasGarage ?? null,
    garageType: garageType ?? null,
    garageSpaces: garageSpaces != null ? Number(garageSpaces) : null,
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
