import { Router } from "express";
import { verifyToken } from "../middlewares/validateCredential.middlewares";
import {
    createAppointment
} from "../controllers/appointment.controllers";

const router = Router();


router.route("/create-new-appointment").post(verifyToken, createAppointment);



export default router;