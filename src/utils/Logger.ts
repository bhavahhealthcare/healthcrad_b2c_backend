import winston, { format } from "winston";


const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});


const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        label({ label: 'logger'}),
        timestamp(),
        myFormat,
        format.colorize({ all: true })
    ),
    transports: [
        new winston.transports.File({ filename: "error.log", level: 'error' }),
        new winston.transports.File({ filename: "combined.log" }),
    ],
});


if(process.env.NODE_ENV != 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }))
}


export default logger;