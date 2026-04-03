import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import calendarRouter from "./calendar";
import authRouter from "./auth";
import userDataRouter from "./user-data";
import aiChatRouter from "./ai-chat";
import storageRouter from "./storage";
import brandingRouter from "./branding";
import brokerOnboardRouter from "./broker-onboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use(calendarRouter);
router.use(authRouter);
router.use(userDataRouter);
router.use(aiChatRouter);
router.use(storageRouter);
router.use(brandingRouter);
router.use(brokerOnboardRouter);
router.use(adminRouter);

export default router;
