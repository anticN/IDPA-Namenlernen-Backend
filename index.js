import express from 'express';
import mysql from 'mysql';


const app = express();
const port = 3000;

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'idpa', 
    password: 'IDPA2024',
    database: 'idpa_namen'
})

connection.connect()


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    connection.query('SELECT * FROM namen', (err, rows) => {
        if (err) throw err;
        res.send(rows);
    });
    //res.send(rows);
  });


//listener for the current port
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
  })