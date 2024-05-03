import fs from 'fs';
import path from 'path';


/**
 * Appends a message/error to corresponding log file.
 * 
 * @param {string} message - The message to be logged.
 * @param {string} file - The name of the log file ['error.log', 'server.log'].
 * @returns {void} - This function does not return a value.
 * @throws {Error} - Returns an error if an error occurs
 */
function logMessage(message, file) {

    const logFilePath = path.join('logs', file);
    const timestamp = new Date().toLocaleString();
    const logEntry = `${timestamp}: ${message}\n`;

    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
            throw err;
        }
    });
}

/**
 * Checks the type of log message and logs it accordingly.
 * 
 * @param {object} message - The log message object containing either an 'error' or 'message' property.
 * @returns {void} - This function does not return a value.
 */
function checkLogType(message){
    if (Object.keys(message).includes('error')) {
        const file = 'error.log';
        logMessage(message.error, file);
    }else if (Object.keys(message).includes('message')) {
        const file = 'server.log';
        logMessage(message.message, file);
    }
}



export { checkLogType };