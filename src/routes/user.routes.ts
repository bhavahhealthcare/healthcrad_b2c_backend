import { Router } from "express";
import { getAllUsers, registerUser, loginUser, addAddress, refreshAccessToken } from "../controllers/user.controllers"
import { verifyToken } from "../middlewares/user.middlewares";

const router = Router()



router.route("/").get(getAllUsers);
router.route("/register").post(registerUser);
router.route("/login").get(loginUser);
router.route("/new-token").get(refreshAccessToken);
router.route("/add-address").post(verifyToken, addAddress);


export default router;