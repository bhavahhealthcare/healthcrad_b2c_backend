class ApiError extends Error {
    statusCode: number; // HTTP status code
    errorCode: string; // Custom error code
    details: any; // Additional details about the error (can be any type)

    constructor(
        message: string, 
        statusCode: number = 500, 
        errorCode: string = 'UNKNOWN_ERROR', 
        details: any = null
    ) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode; // Default to 500 if not provided
        this.errorCode = errorCode; // Default to 'UNKNOWN_ERROR'
        this.details = details; // Optional additional details
    }

    toJSON(): { message: string; statusCode: number; errorCode: string; details: any } {
        return {
            message: this.message,
            statusCode: this.statusCode,
            errorCode: this.errorCode,
            details: this.details,
        };
    }
}


export { ApiError }