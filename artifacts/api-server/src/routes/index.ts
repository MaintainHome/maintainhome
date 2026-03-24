import { Router, type IRouter } from "express";
import healthRouter from "./health";
import waitlistRouter from "./waitlist";
import calendarRouter from "./calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use(waitlistRouter);
router.use(calendarRouter);

export default router;
