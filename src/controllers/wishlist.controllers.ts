import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const addToWishlist = async (req: Request, res: Response) => {
  try {
    const userDetail = req.body.user;
    if (!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User detail missing", 401));
      return;
    }

    const medicine_id = req.body.medicine_id;

    if (!medicine_id) {
      res.status(400).json(new ApiError("Both medicine_id is required!", 400));
      return;
    }

    const findResult = await prisma.cart.findUnique({
      where: {
        user_id_medicine_id: {
          user_id: userDetail.userId,
          medicine_id: medicine_id,
        },
      },
    });

    if (findResult) {
      res
        .status(409)
        .json(
          new ApiError("Item already exist in wishlist, try to update it!", 409)
        );
      return;
    }

    const addResult = await prisma.wishlist.create({
      data: {
        user_id: userDetail.userId,
        medicine_id: medicine_id,
      },
    });

    res
      .status(201)
      .json(
        new ApiResponse("Success", 201, "Item added to wishlist", addResult)
      );
  } catch (error) {
    console.error("Error while adding item to wishlist: ", error);
    res.status(500).json(new ApiError("Internal server error", 500));
  }
};

const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const userDetail = req.body.user;
    if (!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User detail missing", 401));
      return;
    }

    const medicine_id = req.body.medicine_id;
    if (!medicine_id) {
      res.status(400).json(new ApiError("Both medicine_id is required!", 400));
      return;
    }

    const removeResult = await prisma.wishlist.delete({
      where: {
        user_id_medicine_id: {
          user_id: userDetail.userId,
          medicine_id: medicine_id,
        },
      },
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          "Success",
          200,
          "Item deleted from wishlist",
          removeResult
        )
      );
  } catch (error) {
    console.error("Error while removing item from wishlist: ", error);
    res.status(500).json(new ApiError("Internal server error", 500));
  }
};

const getWishlistItems = async (req: Request, res: Response) => {
  try {
    const userDetail = req.body.user;
    if (!userDetail || !userDetail.userId) {
      res.status(401).json(new ApiError("User detail missing", 401));
      return;
    }

    const wishlistItem = await prisma.wishlist.findMany({
      where: {
        user_id: userDetail.userId,
      },
    });

    res
      .status(200)
      .json(new ApiResponse("Success", 200, "Item fetched", wishlistItem));
  } catch (error) {
    console.error("Error while fetching wishlist items: ", error);
    res.status(500).json(new ApiError("Internal server error", 500));
  }
};

export { addToWishlist, getWishlistItems, removeFromWishlist };
