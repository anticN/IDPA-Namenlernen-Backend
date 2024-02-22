import fs from 'fs';
import path from 'path';


// Log a message to a file
function logMessage(message, file) {

    const logFilePath = path.join('logs', file);
    const timestamp = new Date().toLocaleString();
    const logEntry = `${timestamp}: ${message}\n`;

    fs.appendFile(logFilePath, logEntry, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}

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