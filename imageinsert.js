import fs from 'fs';
import { checkLogType } from './logging.js';
import { formatClient } from './index.js';

/**
 * Insert the class object into the database if it is not already in the database
 * If the class object is already in the database update the class object
 * calls the imagePathFunction in a loop for each student
 * calls the sendResponse function
 * @param {Array} students - The array of students
 * @param {Object} classobject - The class object
 * @param {Connection} connection - The connection to the DB
 * @param {Response} res - The response object
 * @param {Request} req - The request object
 * @returns {void}
 * @throws {Error} - If an error occurs
 */

function insertImage(students, classobject, connection, res, req) {

    // if classobject.classname is already in the database dont insert it
    // else insert it
    let sql = `SELECT * FROM class WHERE classname = '${classobject.classname}'`;
    connection.query(sql,(err, result) => {
        if (err) {
            checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
            throw err;
        }
        
        if (result.length == 0) {
        let sql = `INSERT INTO class (classname, startingyear) VALUES ('${classobject.classname}', '${classobject.startingyear}')`;
            connection.query(sql, (err) => {
                if (err) {
                    checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
                    throw err;
                }
            });

            for (let i = 0; i < students.length; i++) {
                imagePathFunction(`uploads/img_p0_${i+2}.png`, students[i], connection, result);
                
            }
            sendResponse(res, true, req)
        } else {
            let sql = `UPDATE class SET startingyear = '${classobject.startingyear}' WHERE classname = '${classobject.classname}'`;
            connection.query(sql, (err) => {
                if (err) {
                    checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
                    throw err;
                }
            });
            for (let i = 0; i < students.length; i++) {
                imagePathFunction(`uploads/img_p0_${i+2}.png`, students[i], connection, result);  
            }
            sendResponse(res, false, req)
        }
    });

}

/**
 * Add the image to the student object
 * If the student object is not in the database insert it
 * If the student object is in the database update it
 * @param {String} imagePath - The path to the image
 * @param {Object} student - The student object
 * @param {Connection} connection - The connection to the DB
 * @param {Array} result - The result of the query that checks if the class of the class object is in the database
 * @returns {void}
 * @throws {Error} - If an error occurs
 */

function imagePathFunction(imagePath, student, connection, result) {
    fs.readFile(imagePath, (err, data) => {
        if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
        }
        student.image = data;
        if (result.length == 0) {
            let sql = `INSERT INTO student (lastname, firstname, image, classname) VALUES (?, ?, ?, ?)`
                
                connection.query(sql, [student.lastname, student.firstname, student.image, student.classname], (err) => {
                    if (err) {
                        checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
                        throw err;
                    }
                });
        
        } else {
            let sql = `UPDATE student SET image = ? WHERE lastname = ? AND firstname = ? AND classname = ?`
            connection.query(sql, [student.image, student.lastname, student.firstname, student.classname], (err) => {
                if (err) {
                    checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
                    throw err;
                }
            });

            
        }
        
        
        
    
    });;
}

/**
 * Send the response to the client
 * If the class object was inserted send a success message that the class object was added
 * If the class object was updated send a success message that the class object was updated
 * @param {Response} res - The response object
 * @param {Boolean} insert - If the class object was inserted or updated
 * @param {Request} req - The request object
 * @return {void}
 */

function sendResponse(res, insert, req) {
    if (insert) {
        checkLogType({message: `Klassenliste erfolgreich hochgeladen!${formatClient(req)}`})
        res.status(200).send({message: 'Klassenliste erfolgreich hochgeladen!'});
    } else {
        checkLogType({message: `Klassenliste erfolgreich aktualisiert!${formatClient(req)}`})
        res.status(200).send({message: 'Klassenliste erfolgreich aktualisiert!'});
    }
}

export {insertImage};

