function insertImage(students, classobject, connection) {
    console.log('000students:', students);
    console.log('000classobject:', classobject);

    // if classobject.classname is already in the database dont insert it
    // else insert it
    let sql = `SELECT * FROM class WHERE classname = '${classobject.classname}'`;
    connection.query(sql,(err, result) => {
        if (err) throw err;
        console.log('result:', result);
        if (result.length === 0) {
            let sql = `INSERT INTO class (classname, startingyear) VALUES ('${classobject.classname}', '${classobject.startingyear}')`;
            connection.query(sql, (err) => {
                if (err) throw err;
                console.log('1 record inserted');
            });

            for (let i = 0; i < students.length; i++) {
                let sql = `INSERT INTO student (lastname, firstname, image, classname) VALUES ('${students[i].lastname}', '${students[i].firstname}', '${students[i].image}', '${students[i].classname}')`;
                connection.query(sql, (err) => {
                    if (err) throw err;
                    console.log('1 record inserted');
                });
            }
        }
    });

    

}

export {insertImage};

