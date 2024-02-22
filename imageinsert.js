function insertImage(connectiondb) {
    connectiondb.query('INSERT INTO student (studentID, name, firstname, image) VALUES (1, "Doe", "John", "./mockimages/testimage.png")', (err, rows) => {
        if (err) throw err;
    });
}

export {insertImage};

