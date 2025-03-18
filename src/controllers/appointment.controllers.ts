import { Request, Response } from "express";
import { PrismaClient, Prisma, AppointmentType, Gender } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import * as appointmentServices from "../services/appointment.services";

const prisma = new PrismaClient();


function isGender(value: string): value is Gender {
    return Object.values(Gender).includes(value as Gender);
}
function isAppointmentType(value: string): value is AppointmentType {
    return Object.values(AppointmentType).includes(value as AppointmentType);
}



const createAppointment = async (req: Request, res: Response) => {
    try {
        const userDetail = req.body.credentials;
        if (!userDetail || !userDetail.userId) {
            res.status(401).json(new ApiError("User details missing", 401));
            return;
        }
        const {
            doctorId,
            patientName,
            patientAge,
            patientGender,
            patientPhone,
            appointmentDate,
            appointmentType,
            clinicId,
        } = req.body;
        // check if any field is empty...
        if (
            !patientName ||
            !doctorId ||
            !patientAge ||
            !patientGender ||
            !patientPhone ||
            !appointmentDate ||
            !appointmentType ||
            !clinicId
        ) {
            res.status(400).json(new ApiError("All fields are required.", 400));
            return;
        }
        // validate Gender enum
        if (!isGender(patientGender)) {
            throw new ApiError("Invalid gender value.", 400);
        }
        // validate appointment-type
        if (!isAppointmentType(appointmentType)) {
            throw new ApiError("Appointment only accepts in online and ofline mode", 400);
        }

        // check if the date is not a back day... and not more than 7 days after today...
        const today = new Date();
        today.setHours(0, 0, 0, 0);     // Get today's date at midnight (to ignore time)
        const userDate = new Date(appointmentDate);
        userDate.setHours(0, 0, 0, 0);
        const timeDiff = userDate.getTime() - today.getTime();
        const daysDiff = timeDiff / (1000 * 3600 * 24);
        if (daysDiff < 0 || daysDiff > 7) {
            res.status(400).json(new ApiError("Date must be within the next 7 days and not in the past.", 400));
            return;
        }

        // create a new appointment...
        const userId = userDetail.userId
        const newAppointment = await appointmentServices.createAppointment({
            userId,
            doctorId,
            patientAge,
            patientName,
            patientGender,
            patientPhone,
            appointmentDate,
            appointmentType,
            clinicId
        });


    } catch (error) {
        if (error instanceof ApiError) {
            console.error("ApiError: ", error);
            res.status(error.statusCode).json(error);
            return;
        } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error("Prisma known error: ", error);
            res.status(400).json(new ApiError("Database error.", 400));
            return;
        } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
            console.error("Prisma unknown error: ", error);
            res.status(500).json(new ApiError("Unknown database error.", 500));
            return;
        }

        console.error("Error while creating a new appointment: ", error);
        res.status(500).json(new ApiError("Internal server error.", 500));
    }
}


export {
    createAppointment
}