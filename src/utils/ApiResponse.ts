class ApiResponse<T> {
    status: "Success" | "Pending" | "Failed"; // Restrict to specific string literals
    statusCode: number;
    message: string;
    data: T; // Generic type to allow flexibility for the data type
    success: boolean;

    constructor(
        status: "Success" | "Pending" | "Failed" = "Success", // Default status
        statusCode: number,
        message: string,
        data: T
    ) {
        this.status = status;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = status === "Success"; // Automatically set based on status
    }
}


export { ApiResponse }
