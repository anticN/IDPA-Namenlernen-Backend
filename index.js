import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import mysql from 'mysql';
import cors from 'cors';
import crypto from 'crypto';
import { checkLogType } from './logging.js';
import { insertImage } from './imageinsert.js';



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

app.use(cors());
// TODO when production ready, add cors options: origin, methods, credentials, etc.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {}
}))

app.use('/home', (req, res, process) => {
  if (req.session.email == null) {
    res.status(403).json({ error: 'Sie sind nicht eingeloggt! Sie müssen sich anmelden um die Applikation nutzen zu können.' })
  } else {
    process()
  }
})

function formatClient(req) {
  return `\n\t\t\t\t\tClient: ${req.headers['user-agent']} || ${req.ip}`
}

//function to add a teacher to DB
function addTeacherToDB(teacher, res) {
    connection.query(`INSERT INTO teacher (lastname, firstname, email, salt, hashedPW, isVerified) 
            VALUES ('${teacher.lastname}', '${teacher.firstname}', '${teacher.email}', '${teacher.salt}', '${teacher.hashed}', '${teacher.verified}')`, 
      [teacher], (err, result) => {
        if (err) throw err;
        console.log('User added to DB', result);
        res.status(201).json({message: `Guten Tag ${teacher.firstname} ${teacher.lastname}! Ihr Konto wurde erfolgreich erstellt!`});
    });
}

//hashing function for passwords with salt and crypto module
function hashpw(password) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hashed = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return { salt, hashed }
}


app.get('/home', (req, res) => {
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
  console.log(email);
  try {
    const credentials = email.split("@");
    connection.query(`SELECT email FROM teacher WHERE email='${email}'`, (error, result) => {
    // checks if the email already exists in the DB
    if (error){
      checkLogType({error: `Error occurred: ${error}`});
      throw error;
    }
    if (row == undefined) {
      row = '';
    }else if (result.length > 0){
      row = result[0].email;
    }
    console.log('DB result: ' + row);
    if (row == email) {
      // returns an error if the user tries to sign up with an email that already exists
      checkLogType({error: `Signup: Email ${email} already used${formatClient(req)}`});
      console.log(`Signup: Email ${email} already used`);
      res.status(401).json({ error: `Die Email: ${email} wurde bereits verwendet!` });
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
        checkLogType({message: `User ${teacher.firstname} ${teacher.lastname} added to DB${formatClient(req)}`});
        addTeacherToDB(teacher, res);
        req.session.email = email;
        req.session.loggedin = true;
      } else {
        // returns an error if the user tries to sign up with a non-KSH email
        console.log("Sie müssen Ihre KSH-Mail verwenden!");
        res.status(401).json({error: "Sie müssen Ihre KSH-Mail verwenden!"});
      }
    }
  });
  }
  catch (error) {
    console.log(error);
    checkLogType({error: `Error occurred: ${error}`});
  }
});

//login process, checks if user exists and if password is correct
app.post("/login", (req, res) => {
  const password = req.body.password
  const uEmail = req.body.email
  // checks if the user exists in the DB
  connection.query(`SELECT email, salt, hashedPW FROM teacher WHERE email='${uEmail}';`, (err, udata) => {
    if (err) {
      checkLogType({error: `Error occurred: ${err}`});
      res.send("Error occurred")
      return
    } else if (udata.length > 0) {
      const userSalt = udata[0].salt;
      const userHash = udata[0].hashedPW;

      const userpasswd = crypto.pbkdf2Sync(password, userSalt, 1000, 64, "sha512").toString("hex")

      // checks if the password is correct
      if (userpasswd === userHash) {
        req.session.email = uEmail;
        //res.status(200).send({content: "User valid"})
        console.log("User valid");
        checkLogType({message: `User ${uEmail} logged in${formatClient(req)}`});
        res.json({message: `Willkommen ${uEmail}! Sie wurden erfolgreich eingeloggt!`});
        req.session.loggedin = true;
      } else {
        res.status(401).json({error: "Falsches Passwort oder falscher Benutzername"})
      } 
    }else{
      res.status(400).json({error: "Falsches Passwort oder falscher Benutzername"})
    }
  });
});

//logout process, destroys the session
app.delete('/logout', (req, res) => {
  if (req.session.email != null) {
    checkLogType({message: `User ${req.session.email} logged out`});
    req.session.email = undefined
    console.log('Logged out');
    return res.status(200).json({ message: 'Logged out!' })
  } else {
    return res.status(401).json({ error: 'Not logged in!' })
  }
})

app.post('/imagepost', (req, res) => {
  insertImage(connection);
  res.json({message: 'Image inserted'});
})

app.get('/student', (req, res) => {
  connection.query('SELECT * FROM student', (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

app.get('/home/class', (req, res) => {
  // teacher will be shown all his classes
  let loggedInTeacher = req.session.email;
  connection.query(`SELECT teacher.firstname, teacher.lastname, class.classname, subject.subjectname
                    FROM teacher 
                    INNER JOIN teacher_class ON teacher.teacherID = teacher_class.teacherID 
                    INNER JOIN class ON teacher_class.classname = class.classname 
                    INNER JOIN teacher_class_subject ON teacher_class.teacher_classID = teacher_class_subject.teacher_classID 
                    INNER JOIN subject  ON teacher_class_subject.subjectID = subject.subjectID 
                    WHERE teacher.email = "${loggedInTeacher}";`, (err, rows) => {
     if (err) throw err;
     res.send(rows);
  });
});

app.get('/home/class/students', (req, res) => {
  // teacher selects a class and gets all students in that class
  let loggedInTeacher = req.session.email;
  let classname = req.body.classname;
  /*TODO replace test_teacher with teacher*/
  connection.query(`SELECT student.lastname, student.firstname, student.image, class.classname FROM student
                    INNER JOIN class ON student.classname = class.classname
                    INNER JOIN teacher_class ON class.classname = teacher_class.classname
                    INNER JOIN test_teacher ON teacher_class.teacherID = test_teacher.teacherID
                    WHERE test_teacher.email = "${loggedInTeacher}" AND class.classname = "${classname}";`, (err, rows) => {
                      if(err) throw err;
                      res.send(rows);
                    });
})



app.post('/pdfupload',  (req, res) => {
  const file = req.body.file;
  res.send('File received '+ file);
  console.log(file);
})



//listener for the current port
app.listen(port, () => {
    checkLogType({message: `Server running on port: ${port}`});
    console.log(`Server running on port: ${port}`);
  })