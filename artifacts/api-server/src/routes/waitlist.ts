import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { waitlistTable } from "@workspace/db";
import { JoinWaitlistBody } from "@workspace/api-zod";
import { eq, count } from "drizzle-orm";

const router: IRouter = Router();

router.post("/waitlist", async (req, res) => {
  const parsed = JoinWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { name, email, zip, userType } = parsed.data;

  const existing = await db
    .select()
    .from(waitlistTable)
    .where(eq(waitlistTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const countResult = await db.select({ count: count() }).from(waitlistTable);
  const currentCount = Number(countResult[0]?.count ?? 0);
  const signupNumber = currentCount + 1;

  const [entry] = await db
    .insert(waitlistTable)
    .values({
      name,
      email: email.toLowerCase(),
      zip: zip ?? null,
      userType: userType ?? null,
      signupNumber,
    })
    .returning();

  res.status(201).json({
    id: entry.id,
    name: entry.name,
    email: entry.email,
    zip: entry.zip,
    userType: entry.userType,
    signupNumber: entry.signupNumber,
    createdAt: entry.createdAt,
  });
});

router.get("/waitlist", async (_req, res) => {
  const result = await db.select({ count: count() }).from(waitlistTable);
  res.json({ count: Number(result[0]?.count ?? 0) });
});

export default router;
