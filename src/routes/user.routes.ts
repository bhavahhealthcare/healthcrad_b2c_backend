import { Router } from "express";
import { getAllUsers, registerUser, loginUser } from "../controllers/user.controllers"

const router = Router()



router.route("/").get(getAllUsers);
router.route("/register").post(registerUser);
router.route("/login").get(loginUser);


export default router;