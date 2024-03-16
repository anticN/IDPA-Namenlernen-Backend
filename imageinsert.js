import fs from 'fs';

function insertImage(students, classobject, connection) {
    console.log('000students:', students);
    console.log('000classobject:', classobject);

    // if classobject.classname is already in the database dont insert it
    // else insert it
    let sql = `SELECT * FROM class WHERE classname = '${classobject.classname}'`;
    connection.query(sql,(err, result) => {
        if (err) throw err;
        console.log('result:', result);
        if (result.length != 0) {
            // Delete all students with the same classname and the class as well
            let sqldel = `DELETE FROM student WHERE classname = '${classobject.classname}'`;
            connection.query(sqldel, (err) => {
                if (err) throw err;
                console.log('1 record deleted');
            });

            let sqldel2 = `DELETE FROM class WHERE classname = '${classobject.classname}'`;
            connection.query(sqldel2, (err) => {
                if (err) throw err;
                console.log('1 record deleted');
            });
        }

        let sql = `INSERT INTO class (classname, startingyear) VALUES ('${classobject.classname}', '${classobject.startingyear}')`;
            connection.query(sql, (err) => {
                if (err) throw err;
                console.log('1 record inserted');
            });

            for (let i = 0; i < students.length; i++) {
                imagePathFunction(`uploads/img_p0_${i+2}.png`, students[i], connection);
                
            }
    });

}

function imagePathFunction(imagePath, student, connection) {
    fs.readFile(imagePath, (err, data) => {
        if (err) {
            console.error('Fehler beim Lesen der Datei:', err);
        }
        student.image = data;
        let sql = `INSERT INTO student (lastname, firstname, image, classname) VALUES (?, ?, ?, ?)`
                
                connection.query(sql, [student.lastname, student.firstname, student.image, student.classname], (err) => {
                    if (err) throw err;
                    console.log('1 record inserted');
                    console.log('student:', student);
                });
    
    });;
}

export {insertImage};

