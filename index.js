import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import mysql from 'mysql';
import crypto from 'crypto';


const app = express();
const port = 3000;

//load the environment variables
dotenv.config();

//create a connection to the MySQL database
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

connection.connect()


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//function to add a teacher to DB
function addTeacherToDB(teacher, res) {
    connection.query(`INSERT INTO teacher (lastname, firstname, email, salt, hashedPW, isVerified) 
            VALUES ('${teacher.lastname}', '${teacher.firstname}', '${teacher.email}', '${teacher.salt}', '${teacher.hashed}', '${teacher.verified}')`, 
      [teacher], (err, result) => {
        if (err) throw err;
        console.log('User added to DB', result);
        res.send(`Guten Tag ${teacher.firstname} ${teacher.lastname}! Ihr Konto wurde erfolgreich erstellt!`);
    });
}

//hashing function for passwords with salt and crypto module
function hashpw(password) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hashed = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return { salt, hashed }
}


app.get('/', (req, res) => {
    connection.query('SELECT * FROM student', (err, rows) => {
        if (err) throw err;
        res.send(rows);
    });
  });


//signup process, checks if teacher exists, if the email format is valid and creates a new account
app.post("/signup", function (req, res) {
  let row = '';
  const email = req.body.email;
  const password = req.body.password;
  const credentials = email.split("@");
  connection.query(`SELECT email FROM teacher WHERE email='${email}'`, (error, result) => {
    // checks if the email already exists in the DB
    if (error) throw error;
    if (row == undefined) {
      row = '';
    }else if (result.length > 0){
      row = result[0].email;
    }
    console.log('DB result: ' + row);
    if (row == email) {
      // returns an error if the user tries to sign up with an email that already exists
      console.log("Email already used");
      res.status(401).json({ error: "Email already used" });
    } else {
      if (credentials[1] === "ksh.ch") {
        const names = credentials[0].split(".");
        // hashes the password and saves the salt and hashed password in the DB
        const passwd_hash = hashpw(password);

        const teacher = {
          lastname: names[1],
          firstname: names[0],
          email: email,
          salt: passwd_hash.salt,
          hashed: passwd_hash.hashed,
          verified: 0
        }
        //main(email, "KSHub: Account verification", "Hello, your account has successfully been created!").catch(console.error);
        // adds the teacher to the DB
        addTeacherToDB(teacher, res);
        //req.session.loggedin = true;
      } else {
        // returns an error if the user tries to sign up with a non-KSH email
        console.log("Sie müssen Ihre KSH-Mail verwenden!");
        res.status(401).send("Sie müssen Ihre KSH-Mail verwenden!");
      }
    }
  });
});


//listener for the current port
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
  })