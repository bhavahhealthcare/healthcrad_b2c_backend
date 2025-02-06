import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


const addToCart = async (req: Request, res: Response) => {
    try {
        const userDetail = req.body.user;
        if (!userDetail || !userDetail.userId) {
            res.status(401).json(new ApiError("User detail missing", 401));
            return;
        }

        const medicine_id = req.body.medicine_id;
        const quantity = req.body.quantity;
        console.log(medicine_id, quantity);
        console.log(req.body);
        if(!medicine_id || !quantity) {
            res.status(400).json(new ApiError("Both medicine_id and quantity is required!", 400));
            return;
        }

        const findResult = await prisma.cart.findUnique({
            where: {
                user_id_medicine_id: {
                    user_id: userDetail.userId,
                    medicine_id: medicine_id
                }
            }
        })

        if(findResult) {
            res.status(409).json(new ApiError("Item already exist in card, try to update it!", 409));
            return;
        }

        const cartResult = await prisma.cart.create({
            data: {
                user_id: userDetail.userId,
                medicine_id: medicine_id,
                quantity: quantity
            }
        });

        res.status(200).json(new ApiResponse("Success", 200, "Item added to cart!", cartResult));
    } catch (error) {
        console.error("Error while adding item to cart: ", error);
        res.status(500).json(new ApiError("Internal server error", 500));
    }
}

const updateCartItem = async (req: Request, res: Response) => {
    try {
        const userDetail = req.body.user;
        if (!userDetail || !userDetail.userId) {
            res.status(401).json(new ApiError("User detail missing", 401));
            return;
        }
        const medicine_id = req.body.medicine_id;
        const quantity = req.body.quantity;

        if(!medicine_id || !quantity) {
            res.status(400).json(new ApiError("Both medicine_id and quantity is required!", 400));
            return;
        }

        const updateResult = await prisma.cart.update({
            where: {
                user_id_medicine_id: {
                    user_id: userDetail.userId,
                    medicine_id: medicine_id
                }
            },
            data: {
                quantity: quantity
            }
        });

        res.status(200).json(new ApiResponse("Success", 200, "Cart updated!", updateResult));
    } catch (error) {
        console.error("Error while updating cart: ", error);
        res.status(500).json(new ApiError("Internal server error!", 500));
    }
}

const removeFromCart = async (req: Request, res: Response) => {
    try {
        const userDetail = req.body.user;
        if (!userDetail || !userDetail.userId) {
            res.status(401).json(new ApiError("User detail missing", 401));
            return;
        }
        const medicine_id = req.body.medicine_id;

        if(!medicine_id) {
            res.status(400).json(new ApiError("Both medicine_id and quantity is required!", 400));
            return;
        }

        const deleteResult = await prisma.cart.delete({
            where: {
                user_id_medicine_id: {
                    user_id: userDetail.userId,
                    medicine_id: medicine_id
                }
            }
        });

        res.status(200).json(new ApiResponse("Success", 200, "Cart item deleted!", deleteResult));
    } catch (error) {
        console.error("Error while deleting item from cart: ", error);
        res.status(500).json(new ApiError("Internal server error!", 500));
    }
}

const getCartItems = async (req: Request, res: Response) => {
    try {
        const userDetail = req.body.user;
        if (!userDetail || !userDetail.userId) {
            res.status(401).json(new ApiError("User detail missing", 401));
            return;
        }

        const cartData = await prisma.cart.findMany({
            where: {
                user_id: userDetail.userId
            }
        });

        res.status(200).json(new ApiResponse("Success", 200, "Data fetched.", cartData));
    } catch (error) {
        console.error("Error while fetching cart items: ", error);
        res.status(500).json(new ApiError("Internal server error!", 500));
    }
}


export {
    addToCart,
    updateCartItem,
    removeFromCart,
    getCartItems
}