import { Response, Request } from "express"
import { Prisma, PrismaClient } from "@prisma/client"
import { ApiError } from "../utils/ApiError";

const prisma = new PrismaClient();

const getAllMedicine = async(req:Request, res:Response) => {
    try {
        const medicineArray = await prisma.medicine.findMany();
        let filteredData = new Array;
        if(medicineArray) {
            medicineArray.forEach((medicineObject) => {
                filteredData.push({
                    medicine_id: medicineObject.category_id,
                    medicine_name: medicineObject.name,
                    description: medicineObject.description,
                    price: medicineObject.price,
                    expiry: medicineObject.expiry_date,
                    is_prescription_required: medicineObject.prescription_required,
                    stock: medicineObject.stock_quantity
                });
            })
        
            res.status(200).json({data: filteredData});
        }
    } catch (error) {
        console.error("Error while fetching medicines: ", error);
        res.status(500).json({message: "Internal server error!"});
    }
}

// get medicine by brand name...
const getMedicinesByBrand = async(req:Request, res:Response) => {
    try {
        const requestedBrand = req.query.brand_id;
        if(!requestedBrand) {
            res.status(404).json(new ApiError("Please provide a brand name!", 404));
            return;
        }
        const medicineArray = await prisma.medicine.findMany({
            where: {
                brand_id: parseInt(requestedBrand as string)
            }
        });
        let filteredData = new Array;
        if(medicineArray) {
            medicineArray.forEach((medicineObject) => {
                filteredData.push({
                    medicine_id: medicineObject.category_id,
                    medicine_name: medicineObject.name,
                    description: medicineObject.description,
                    price: medicineObject.price,
                    expiry: medicineObject.expiry_date,
                    is_prescription_required: medicineObject.prescription_required,
                    stock: medicineObject.stock_quantity
                });
            })
        
            res.status(200).json({data: filteredData});
        }
    } catch (error) {
        console.error("Error while filtering medicine by brand: ", error);
        res.status(500).json({message: "Internal server error!"});
    }
}

// get medicines by category...
const getMedicinesByCategory = async(req:Request, res:Response) => {
    try {
        const requestedCategory = req.query.category_id;
        
        if(!requestedCategory) {
            res.status(404).json(new ApiError("Please provide a category id!", 404));
            return;
        }
        const medicineArray = await prisma.medicine.findMany({
            where: {
                category_id: parseInt(requestedCategory as string)
            }
        });
        let filteredData = new Array;
        if(medicineArray) {
            medicineArray.forEach((medicineObject) => {
                filteredData.push({
                    medicine_id: medicineObject.category_id,
                    medicine_name: medicineObject.name,
                    description: medicineObject.description,
                    price: medicineObject.price,
                    expiry: medicineObject.expiry_date,
                    is_prescription_required: medicineObject.prescription_required,
                    stock: medicineObject.stock_quantity
                });
            })
        
            res.status(200).json({data: filteredData});
        }
    } catch (error) {
        console.error("Error while filtering medicine by Category: ", error);
        res.status(500).json({message: "Internal server error!"});
    }
}

const getMedicinesByName = async(req:Request, res:Response) => {
    try {
        
    } catch (error) {
        
    }
}

const getMedicinesByDisease = async(req:Request, res:Response) => {
    try {
        
    } catch (error) {
        
    }
}

// get all categories
const allCategories = async (req: Request, res: Response) => {
    try {
        const categoryArray = await prisma.category.findMany();
        let filteredData = new Array;
        if(categoryArray) {
            categoryArray.forEach((categoryObject) => {
                filteredData.push({
                    category_id: categoryObject.category_id,
                    category_name: categoryObject.name,
                    description: categoryObject.description,
                });
            })
        
            res.status(200).json({data: filteredData});
        }
    } catch (error) {
        console.error("Error while fetching medicine categories: ", error);
        res.status(500).json({message: "Internal server error!"});
    }
}

// get all brands
const allBrands = async (req: Request, res: Response) => {
    try {
        const brandArray = await prisma.brand.findMany();
        let filteredData = new Array;
        if(brandArray) {
            brandArray.forEach((brandObject) => {
                filteredData.push({
                    brand_id: brandObject.brand_id,
                    brand_name: brandObject.name,
                    description: brandObject.description,
                });
            })
        
            res.status(200).json({data: filteredData});
        }
    } catch (error) {
        console.error("Error while fetching medicine manufacturers: ", error);
        res.status(500).json({message: "Internal server error!"});
    }
}

// get all manufacturer
const allManufacturer = async (req: Request, res: Response) => {
    try {
        const manufacturerArray = await prisma.manufacturer.findMany();
        let filteredData = new Array;
        if(manufacturerArray) {
            manufacturerArray.forEach((manufacturerObject) => {
                filteredData.push({
                    category_id: manufacturerObject.manufacturer_id,
                    category_name: manufacturerObject.name,
                    description: manufacturerObject.description,
                });
            })
        
            res.status(200).json({data: filteredData});
        }
    } catch (error) {
        console.error("Error while fetching medicine manufacturers: ", error);
        res.status(500).json({message: "Internal server error!"});
    }
}

// add sample data to database... only for development...
const addData = async (req:Request, res: Response) => {
    try {
        const inputData = req.body;
        if(!Array.isArray(inputData)) {
            res.status(401).json({message: "data not found, try to incude it!"});
            return;
        }

        const addedData = await prisma.medicine.createMany({
            data: inputData
        });

        res.status(201).json({
            message: 'Categories created successfully',
            data: addedData,
          });
    } catch (error) {
        console.error('Error creating categories:', error);
        res.status(500).json({ error: 'Failed to create categories' });
    }
}

export {
    getAllMedicine,
    getMedicinesByBrand,
    getMedicinesByName,
    getMedicinesByCategory,
    getMedicinesByDisease,
    addData,
    allCategories,
    allManufacturer,
    allBrands
}

/*
done
getAllMedicine,
getMedicinesByBrand,
getMedicinesByCategory,
allCategories,
allManufacturer,
addDate
 */