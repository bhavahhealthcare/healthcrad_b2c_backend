import { PrismaClient, AppointmentType, AppointmentStatus, Gender, Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

const prisma = new PrismaClient();



export const createAppointment = async (appointmentData: {
    userId : string,
    doctorId : string,
    patientName : string,
    patientAge : number
    patientGender : Gender
    patientPhone : string
    appointmentDate : string
    appointmentType : AppointmentType
    clinicId : string
}) => {
    const {
        userId,
        doctorId,
        patientName,
        patientAge,
        patientGender,
        patientPhone,
        appointmentDate,
        appointmentType,
        clinicId
    } = appointmentData
    
    // check it's working day for doctor...
    const appointmentDay = new Date(appointmentDate).getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[appointmentDay];
    const workSchedule = await prisma.doctorWorkDay.findUnique({
        where: {
            doctorId: doctorId
        },
        select: {
            [dayOfWeek]: true
        }
    });
    if(!workSchedule || !workSchedule[dayOfWeek]) {
        throw new ApiError("The doctor doesn't work on this day", 400);
    }

    // check if the appointment is new...
    const existingAppointment = await prisma.appointment.findUnique({
        where: {

        }
    });
    // create appointment... and leave it in pending state...
    // doctor have to confirm the appointment or cancle the appointment...
    // update the appointment status...
    // if the appointment is confirmed and completed then create a history of appointment for user and doctor


    


    // create appointment...
    const newAppointment = await prisma.appointment.create({
        data: {
            userId: userId,
            doctorId: doctorId,
            appointmentType: appointmentType,
            appointmentDate: appointmentDate,
            patientName: patientName,
            patientAge: patientAge,
            patientGender: patientGender,
            patientPhone: patientPhone,
            clinicId: clinicId,
            status: AppointmentStatus.PENDING
        }
    });

    // fetch doctor details...
    const doctorDetails = await prisma.doctorDetails.findUnique({
        where: {
            doctorId: newAppointment.doctorId
        }
    });
    var clinicDetails;
    if (newAppointment.clinicId) {
        clinicDetails = await prisma.clinic.findUnique({
            where: {
                id: newAppointment.clinicId,
            },
        });
    }

    // after confirm booking of an appointment return pateint details, doctor details, clinic details
    // and a token to visit clinic for ofline appointment...
    const responseData = {
        appointmentId: newAppointment.id,
        // patient details..
        patientName: newAppointment.patientName,
        patientAge: newAppointment.patientAge,
        patientGender: newAppointment.patientGender,
        // patientPhone: newAppointment.patientPhone,
        // doctor details...
        doctorId: doctorDetails?.id,
        doctorName: doctorDetails?.name,
        doctorGender: doctorDetails?.gender,
        doctorFee: doctorDetails?.appointmentFee,
        doctorExperience: doctorDetails?.experience,
        // clinic details for ofline appointment...
        clinicId: clinicDetails?.id,
        clinicName: clinicDetails?.clinicName,
        clinicSignBoard: clinicDetails?.clinicSignBoard,
        clinicContactNo: clinicDetails?.clinicContactNo,
        clinicRegistrationNo: clinicDetails?.clinicRegistrationNo,
        clinicState: clinicDetails?.state,
        clinicDistrict: clinicDetails?.district,
        clinicCity: clinicDetails?.city,
        clinicPinCode: clinicDetails?.pincode,
        clinicNearby: clinicDetails?.nearbyLocation
    }
}
