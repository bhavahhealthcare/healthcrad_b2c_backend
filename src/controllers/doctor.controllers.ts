import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";


const prisma = new PrismaClient();