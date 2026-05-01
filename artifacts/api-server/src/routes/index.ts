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

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(vendorsRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(groupsRouter);
router.use(leaderboardRouter);
router.use(ridersRouter);

export default router;
