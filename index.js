import express from 'express';
import mysql from 'mysql';
import {insertImage} from './imageinsert.js';


const app = express();
const port = 3000;

//create a connection to the MySQL database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'idpa', 
    password: 'IDPA2024',
    database: 'idpa_namen'
})

const connectiondb = mysql.createConnection({
    host: 'localhost',
    user: 'idpa',
    password: 'IDPA2024',
    database: 'learnnames_db'
})


connection.connect()
connectiondb.connect()


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    connection.query('SELECT * FROM namen', (err, rows) => {
        if (err) throw err;
        res.send(rows);
    });
    //res.send(rows);
  });


app.get('/images', (req, res) => {
    insertImage(connectiondb);
    connectiondb.query('SELECT * FROM student', (err, rows) => {
        if (err) throw err;
        res.send(rows);
    });
    });



//listener for the current port
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
  })