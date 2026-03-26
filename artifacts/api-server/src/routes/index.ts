import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import calendarRouter from "./calendar";
import authRouter from "./auth";
import userDataRouter from "./user-data";
import aiChatRouter from "./ai-chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use(calendarRouter);
router.use(authRouter);
router.use(userDataRouter);
router.use(aiChatRouter);

export default router;
