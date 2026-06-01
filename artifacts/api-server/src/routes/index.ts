import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import vendorsRouter from "./vendors";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import groupsRouter from "./groups";
import leaderboardRouter from "./leaderboard";
import ridersRouter from "./riders";
import adminRouter from "./admin";
import passwordResetRouter from "./password-reset";
import paymentsRouter from "./payments";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(passwordResetRouter);
router.use(usersRouter);
router.use(vendorsRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(groupsRouter);
router.use(leaderboardRouter);
router.use(ridersRouter);
router.use(adminRouter);
router.use(paymentsRouter);
router.use(notificationsRouter);

export default router;
