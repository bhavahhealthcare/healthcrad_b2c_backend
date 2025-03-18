import { Router } from "express";
import { verifyToken } from "../middlewares/validateCredential.middlewares";
import { addToWishlist, getWishlistItems, removeFromWishlist } from "../controllers/wishlist.controllers"


const router = Router()


router.route("/get").get(verifyToken, getWishlistItems)
router.route("/add").post(verifyToken, addToWishlist)
router.route("/remove").delete(verifyToken, removeFromWishlist)


export default router;