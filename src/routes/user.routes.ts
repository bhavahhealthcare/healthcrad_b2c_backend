import { Router } from "express";
import { getAllUsers, registerUser, loginUser, addAddress, refreshAccessToken, updatePhone, updateEmail, updateAddress, getUser } from "../controllers/user.controllers"
import { verifyToken } from "../middlewares/validateCredential.middlewares";

const router = Router()



router.route("/").get(getAllUsers);
router.route("/register").post(registerUser);
router.route("/login").get(loginUser);
router.route("/new-token").get(refreshAccessToken);
router.route("/getUser").get(verifyToken, getUser);
router.route("/add-address").post(verifyToken, addAddress);
router.route("/update-phone").post(verifyToken, updatePhone);
router.route("/update-email").post(verifyToken, updateEmail);
router.route("/update-address").post(verifyToken, updateAddress);


export default router;