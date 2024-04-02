import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import mysql from 'mysql';
import cors from 'cors';
import crypto from 'crypto';
import { checkLogType } from './logging.js';
import { insertImage } from './imageinsert.js';
import multer from 'multer';
import bodyParser from 'body-parser';
import { parser } from './pdfparser.js';



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
app.use(bodyParser.json());

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
			res.status(201).json({ message: `Guten Tag ${teacher.firstname} ${teacher.lastname}! Ihr Konto wurde erfolgreich erstellt!` });
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
			if (error) {
				checkLogType({ error: `Error occurred: ${error}` });
				throw error;
			}
			if (row == undefined) {
				row = '';
			} else if (result.length > 0) {
				row = result[0].email;
			}
			console.log('DB result: ' + row);
			if (row == email) {
				// returns an error if the user tries to sign up with an email that already exists
				checkLogType({ error: `Signup: Email ${email} already used${formatClient(req)}` });
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
					checkLogType({ message: `User ${teacher.firstname} ${teacher.lastname} added to DB${formatClient(req)}` });
					addTeacherToDB(teacher, res);
					req.session.email = email;
					req.session.loggedin = true;
				} else {
					// returns an error if the user tries to sign up with a non-KSH email
					console.log("Sie müssen Ihre KSH-Mail verwenden!");
					res.status(401).json({ error: "Sie müssen Ihre KSH-Mail verwenden!" });
				}
			}
		});
	}
	catch (error) {
		console.log(error);
		checkLogType({ error: `Error occurred: ${error}` });
	}
});

//login process, checks if user exists and if password is correct
app.post("/login", (req, res) => {
	const password = req.body.password
	const uEmail = req.body.email
	// checks if the user exists in the DB
	connection.query(`SELECT email, salt, hashedPW FROM teacher WHERE email='${uEmail}';`, (err, udata) => {
		if (err) {
			checkLogType({ error: `Error occurred: ${err}` });
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
				checkLogType({ message: `User ${uEmail} logged in${formatClient(req)}` });
				res.json({ message: `Willkommen ${uEmail}! Sie wurden erfolgreich eingeloggt!` });
				req.session.loggedin = true;
			} else {
				res.status(401).json({ error: "Falsches Passwort oder falscher Benutzername" })
			}
		} else {
			res.status(400).json({ error: "Falsches Passwort oder falscher Benutzername" })
		}
	});
});

//logout process, destroys the session
app.delete('/logout', (req, res) => {
	if (req.session.email != null) {
		checkLogType({ message: `User ${req.session.email} logged out` });
		req.session.email = undefined
		console.log('Logged out');
		return res.status(200).json({ message: 'Logged out!' })
	} else {
		return res.status(401).json({ error: 'Not logged in!' })
	}
})

app.post('/imagepost', (req, res) => {
	insertImage(connection);
	res.json({ message: 'Image inserted' });
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
	connection.query(`SELECT teacher.firstname, teacher.lastname, class.classname
                    FROM teacher 
                    INNER JOIN teacher_class ON teacher.teacherID = teacher_class.teacherID 
                    INNER JOIN class ON teacher_class.classname = class.classname 
                    WHERE teacher.email = "${loggedInTeacher}";`, (err, rows) => {
		if (err) throw err;
		res.send(rows);
	});
});

app.post('/class/students', (req, res) => { // put /home before for security
	// teacher selects a class and gets all students in that class
	//let loggedInTeacher = req.session.email;          --> Change to this when session is implemented
	let loggedInTeacher = req.body.email;
	let classname = req.body.classname;
	/*TODO replace test_teacher with teacher*/
	connection.query(`SELECT student.lastname, student.firstname, student.image, class.classname FROM student
                    INNER JOIN class ON student.classname = class.classname
                    INNER JOIN teacher_class ON class.classname = teacher_class.classname
                    INNER JOIN test_teacher ON teacher_class.teacherID = test_teacher.teacherID
                    WHERE test_teacher.email = "${loggedInTeacher}" AND class.classname = "${classname}"
                    ORDER BY student.lastname ASC;`, (err, rows) => {
		if (err) throw err;
		res.send(rows);
	});
})



// storage for the uploaded pdfs
let storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/')
	},
	filename: function (req, file, cb) {
		cb(null, file.originalname)
	}
})

let upload = multer({ storage: storage }).single('file')

// upload the pdf
app.post('/pdfupload', (req, res) => {
	upload(req, res, (err) => {
		if (err) {
			return res.end('Error uploading file');
		} else {
			res.end('File is uploaded');
			parser(req, res, connection);

		}
	})
})


app.post('/pdfupload',  (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.end('Error uploading file');
    } else {      
      res.json({message: 'File uploaded'});
      parser(req, res, connection);
      
    }
  })
})

app.get('/allclasses', (req, res) => {
  connection.query(`SELECT class.classname, class.startingyear, COUNT(student.studentID) AS amountStudents FROM class
                    LEFT JOIN student ON class.classname = student.classname
                    GROUP BY class.classname`, (err, rows) => {
                    if (err) throw err;
                    res.send(rows);
  });
});

app.get('/allteacherclasses', (req, res) => {
  let loggedInTeacher = req.query.teacherID;
  connection.query(`SELECT class.classname, class.startingyear, COUNT(student.studentID) AS amountStudents FROM class
                    LEFT JOIN student ON class.classname = student.classname
                    INNER JOIN teacher_class ON class.classname = teacher_class.classname
                    INNER JOIN test_teacher ON teacher_class.teacherID = test_teacher.teacherID
                    WHERE test_teacher.teacherID = "${loggedInTeacher}"`, (err, rows) => {
                      if (err) throw err;
                      res.send(rows);
                    });
});

app.get('/allclasses/:classname', (req, res) => {
	let classname = req.params.classname;
	connection.query(`SELECT firstname, lastname, image, class.classname FROM student
                    INNER JOIN class ON student.classname = class.classname 
                    WHERE class.classname = "${classname}"`, (err, rows) => {
		if (err) throw err;
		res.send(rows);
	});
});


app.post('/teacherclass', (req, res) => {
  let teacherID = req.body.teacherID;
  let classname = req.body.classname;
  console.log(req.body);
      connection.query(`INSERT INTO teacher_class (teacherID, classname) VALUES (?,?)`,[teacherID, classname], (err) => {
        if (err) throw err;
        console.log('Class added to teacher');
        res.json({message: 'Class added to teacher'});
      });
})

app.delete('/teacherclass', (req, res) => {
  let teacherID = req.body.teacherID;
  let classname = req.body.classname;
  connection.query(`DELETE FROM teacher_class WHERE teacherID = "${teacherID}" AND classname = "${classname}"`, (err) => {
    if (err) throw err;
    console.log('Class removed from teacher');
    res.json({message: 'Class removed from teacher'});
  });
})


app.get('/teachers/:teacherID', (req, res) => {
	let id = req.params.teacherID;
	connection.query(`SELECT test_teacher.firstname, test_teacher.lastname, test_teacher.email, GROUP_CONCAT(class.classname SEPARATOR ', ') AS classes FROM test_teacher
                    LEFT JOIN teacher_class ON test_teacher.teacherID = teacher_class.teacherID
                    LEFT JOIN class ON teacher_class.classname = class.classname
                    WHERE test_teacher.teacherID = "${id}"
                    GROUP BY test_teacher.teacherID`, (err, rows) => {
		if (err) throw err;
		res.send(rows);
	});
})

app.get('/teachers/:teacherID/results', (req, res) => {
  let id = req.params.teacherID;
  connection.query(`select class.classname, results.flashcard_result, results.exercise_result, results.minigame_result from results
  JOIN teacher_class ON results.teacher_classID = teacher_class.teacher_classID
  JOIN class ON teacher_class.classname = class.classname
  WHERE teacherID = "${id}";`, (err, rows) => {
    if (err) throw err;
    res.send(rows);
  });
});

app.put('/nickname', (req, res) => {
  let studentID = req.body.studentID;
  let nickname = req.body.nickname;
  console.log(req.body);
  connection.query(`UPDATE student SET nickname = ? WHERE studentID = ?`, [nickname, studentID], (err) => {
    if (err) throw err;
    console.log('Nickname updated');
    res.json({message: 'Nickname updated'});
  });
});

app.post('/results', (req, res) => {
  let teacher_classID = req.body.teacher_classID;
  let flashcard_result = req.body.flashcard_result;
  let exercise_result = req.body.exercise_result;
  let minigame_result = req.body.minigame_result;
  let sql = `INSERT INTO results (teacher_classID, flashcard_result, exercise_result, minigame_result) VALUES (?,?,?,?)`;

  connection.query(sql , [teacher_classID, flashcard_result, exercise_result, minigame_result], (err) => {
    if (err) throw err;
    console.log('Results added');
    res.json({message: 'Results added'});
  });
});





//listener for the current port
app.listen(port, () => {
	checkLogType({ message: `Server running on port: ${port}` });
	console.log(`Server running on port: ${port}`);
});
