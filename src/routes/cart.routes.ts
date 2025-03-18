import { Router } from "express";
import { verifyToken } from "../middlewares/validateCredential.middlewares";
import { addToCart, updateCartItem, removeFromCart, getCartItems } from "../controllers/cart.controllers"


const router = Router()


router.route("/get").get(verifyToken, getCartItems);
router.route("/add").post(verifyToken, addToCart);
router.route("/update").put(verifyToken, updateCartItem);
router.route("/remove").delete(verifyToken, removeFromCart);


export default router;