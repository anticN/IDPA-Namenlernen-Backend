import fs from 'fs';
import { checkLogType } from './logging.js';
import { formatClient } from './index.js';

function insertImage(students, classobject, connection, res, req) {
    console.log('000students:', students);
    console.log('000classobject:', classobject);

    // if classobject.classname is already in the database dont insert it
    // else insert it
    let sql = `SELECT * FROM class WHERE classname = '${classobject.classname}'`;
    connection.query(sql,(err, result) => {
        if (err) {
            checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
            throw err;
        }
        console.log('result:', result);
        
        if (result.length == 0) {
        let sql = `INSERT INTO class (classname, startingyear) VALUES ('${classobject.classname}', '${classobject.startingyear}')`;
            connection.query(sql, (err) => {
                if (err) {
                    checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
                    throw err;
                }
                console.log('1 record inserted');
            });

            for (let i = 0; i < students.length; i++) {
                imagePathFunction(`uploads/img_p0_${i+2}.png`, students[i], connection, result, res);
                
            }
            sendResponse(res, true, req)
        } else {
            let sql = `UPDATE class SET startingyear = '${classobject.startingyear}' WHERE classname = '${classobject.classname}'`;
            connection.query(sql, (err) => {
                if (err) {
                    checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
                    throw err;
                }
                console.log('1 record updated');
            });
            for (let i = 0; i < students.length; i++) {
                imagePathFunction(`uploads/img_p0_${i+2}.png`, students[i], connection, result, res);  
            }
            sendResponse(res, false, req)
        }
    });

}

function imagePathFunction(imagePath, student, connection, result, res) {
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
                    console.log('1 record inserted');
                    console.log('student:', student);
                });
        
        } else {
            let sql = `UPDATE student SET image = ? WHERE lastname = ? AND firstname = ? AND classname = ?`
            connection.query(sql, [student.image, student.lastname, student.firstname, student.classname], (err) => {
                if (err) {
                    checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
                    throw err;
                }
                console.log('1 record updated');
                console.log('student:', student);
            });

            
        }
        
        
        
    
    });;
}

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

