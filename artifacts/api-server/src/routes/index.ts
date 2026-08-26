import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import assistantRouter from "./assistant";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(assistantRouter);

export default router;
