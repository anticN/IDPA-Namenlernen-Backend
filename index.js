import express from 'express';
import cookieParser from 'cookie-parser';
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
import { threadId } from 'worker_threads';



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

const corsOptions = {
	//origin: 'http://localhost:5173',
	credentials: true,
	//allowedHeaders: ['Content-type', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Credentials', 'Authorization']

}

app.use(cors());
//app.use(cookieParser());
// TODO when production ready, add cors options: origin, methods, credentials, etc.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false,
	//cookie: {}
}))

/*app.use('/home', (req, res, process) => {
	const { cookies } = req;
	//console.log(req)
	console.log("Hier ist die Trennung")
	console.log(cookies.session_id);
	const sessionData = JSON.parse(cookies.session_id)
	console.log(sessionData);
	if(sessionData.session_id) {
		console.log("cookie exists");
		connection.query(`SELECT session_id FROM teacher WHERE email = '${sessionData.email}'`, (err, result) => {
			if(err) {
				checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
				throw err;
			}
			console.log(result[0].session_id)
			if(sessionData.session_id == result[0].session_id) {
				process()
			}else{
				checkLogType({ error: `Benutzer nicht eingeloggt!${formatClient(req)}` });
				res.status(403).json({ error: 'Sie sind nicht eingeloggt! Sie müssen sich anmelden um die Applikation nutzen zu können.' })
			}
		});
	}else{
		console.log("Session ID does not exist")
		checkLogType({ error: `Benutzer nicht eingeloggt!${formatClient(req)}` });
		res.status(403).json({ error: 'Sie sind nicht eingeloggt! Sie müssen sich anmelden um die Applikation nutzen zu können.' })
	
	}
})*/

app.use('/home', (req, res, process) => {
	if (req.session.id == null) {
		checkLogType({ error: `Benutzer nicht eingeloggt!${formatClient(req)}` });
		res.status(403).json({ error: 'Sie sind nicht eingeloggt! Sie müssen sich anmelden um die Applikation nutzen zu können.' })
	} else {
		process()
	}
})

function formatClient(req) {
	return `\n\t\t\t\t\tClient: ${req.headers['user-agent']} || ${req.ip}`
}

//function to add a teacher to DB
function addTeacherToDB(teacher, res, req) {
	//const session_id = crypto.randomBytes(16).toString("hex");
	const session_id = req.session.id;
	console.log("Session ID des Lehrers: " + session_id);
	const teacherData = { email: teacher.email, session_id: session_id}
	connection.query(`INSERT INTO teacher (lastname, firstname, email, salt, hashedPW, session_id, isVerified) 
            VALUES ('${teacher.lastname}', '${teacher.firstname}', '${teacher.email}', '${teacher.salt}', '${teacher.hashed}', '${session_id}', '${teacher.verified}')`,
		[teacher], (err, result) => {
			if (err) {
				checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
				throw err;
			}
			console.log('User added to DB', result);
			console.log(teacherData.session_id);
			//res.cookie('session_id', teacherData, { maxAge: 900000, httpOnly: false, sameSite: 'Strict'});
			//res.cookie('session_id', JSON.stringify(teacherData), { maxAge: 900000, httpOnly: false, sameSite: 'Strict'});
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
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		res.send(rows);
	});
});


//signup process, checks if teacher exists, if the email format is valid and creates a new account
app.post("/signup", function (req, res) {
	let row = '';
	const email = req.body.email;
	const password = req.body.password;
	console.log(req.body);
	if (email == undefined || password == undefined || Object.keys(req.body).length != 2){
		if (email == undefined) {
			console.log(1);
		} 
		if (password == undefined) {
			console.log(2);
		} 
		if (Object.keys(req.body).length != 2) {
			console.log(3);
		}
		checkLogType({ error: `Es wurden nicht E-Mail und Passwort mitgegeben!${formatClient(req)}` }) 
		res.status(400).json({ error: 'Bitte geben Sie eine E-Mail-Adresse und ein Passwort mit!' });
		return;
	}
	console.log(email);
	try {
		const credentials = email.split("@");
		if (credentials.length != 2) {
			// returns an error if the user tries to sign up with an invalid email
			console.log("Bitte geben Sie eine gültige E-Mail-Adresse ein!");
			checkLogType({ error: `E-Mail Adresse ist ungültig!${formatClient(req)}` });
			res.status(401).json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse ein!" });
			return;
		}
		connection.query(`SELECT email FROM teacher WHERE email='${email}'`, (err, result) => {
			// checks if the email already exists in the DB
			if (err) {
				checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
				throw err;
			}
			if (row == undefined) {
				row = '';
			} else if (result.length > 0) {
				row = result[0].email;
			}
			console.log('DB result: ' + row);
			if (row == email) {
				// returns an error if the user tries to sign up with an email that already exists
				checkLogType({ error: `Die Email: ${email} wurde bereits verwendet!${formatClient(req)}` });
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
					checkLogType({ message: `Benutzer ${teacher.firstname} ${teacher.lastname} wurde zur DB hinzugefügt${formatClient(req)}` });
					console.log("Session id:" + req.session.id)
					addTeacherToDB(teacher, res, req);
					req.session.email = email;
					//req.session.loggedin = true;
				} else {
					// returns an error if the user tries to sign up with a non-KSH email
					console.log("Sie müssen Ihre KSH-Mail verwenden!");
					checkLogType({ error: `Es wurde keine KSH-Mail verwendet!${formatClient(req)}` });
					res.status(401).json({ error: "Sie müssen Ihre KSH-Mail verwenden!" });
				}
			}
		});
	}
	catch (err) {
		console.log(err);
		checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
	}
});

//login process, checks if user exists and if password is correct
app.post("/login", (req, res) => {
	const password = req.body.password
	const uEmail = req.body.email
	if (uEmail == undefined || password == undefined || Object.keys(req.body).length != 2) {
		checkLogType({ error: `Es wurden nicht E-Mail und Passwort mitgegeben!${formatClient(req)}` });
		res.status(400).json({ error: 'Bitte geben Sie eine E-Mail-Adresse und ein Passwort mit!' });
		return;
	}
	// checks if the user exists in the DB
	connection.query(`SELECT email, salt, hashedPW FROM teacher WHERE email='${uEmail}';`, (err, udata) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		} else if (udata.length > 0) {
			const userSalt = udata[0].salt;
			const userHash = udata[0].hashedPW;

			const userpasswd = crypto.pbkdf2Sync(password, userSalt, 1000, 64, "sha512").toString("hex")

			// checks if the password is correct
			if (userpasswd === userHash) {
				req.session.email = uEmail;
				//res.status(200).send({content: "User valid"})
				console.log("User valid");
				checkLogType({ message: `Benutzer ${uEmail} hat sich eingeloggt${formatClient(req)}` });
				const newSession = crypto.randomBytes(16).toString("hex");
				connection.query(`UPDATE teacher SET session_id = '${newSession}' WHERE email='${uEmail}'`, (err) => {
					if (err) {
						checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
						throw err;
					}
				});
				//res.cookie('session_id', JSON.stringify({ email: uEmail, session_id: newSession }), { maxAge: 900000, httpOnly: false, sameSite: 'None',secure: true});
				res.json({ message: `Willkommen ${uEmail}! Sie wurden erfolgreich eingeloggt!` });
				//req.session.loggedin = true;
			} else {
				checkLogType({ error: `Falsches Passwort für Benutzer ${uEmail}!${formatClient(req)}` });
				res.status(401).json({ error: "Falsches Passwort oder falscher Benutzername!" })
			}
		} else {
			checkLogType({ error: `Falsches Passwort für Benutzer ${uEmail}!${formatClient(req)}` });
			res.status(400).json({ error: "Falsches Passwort oder falscher Benutzername!" })
		}
	});
});

//logout process, destroys the session
app.delete('/home/logout', (req, res) => {
	checkLogType({ message: `Benutzer ${req.cookies.session_id.email} hat sich ausgeloggt${formatClient(req)}` });
	//req.session.email = undefined
	console.log('Logged out');
	connection.query(`UPDATE teacher SET session_id = NULL WHERE email='${req.cookies.session_id.email}'`, (err) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
	});
	return res.json({ message: 'Sie wurden erfolgreich ausgeloggt!' })
})



app.get('/home/student', (req, res) => {
	connection.query('SELECT * FROM student', (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		checkLogType({ message: `Alle Schüler wurden abgerufen${formatClient(req)}` });
		res.send(rows);
	});
});



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



app.post('/home/pdfupload',  (req, res) => {
  upload(req, res, (err) => {
    if (err) {
		checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
		throw err;
	} else {      
      parser(req, res, connection);
      
    }
  })
})

app.get('/home/allclasses', (req, res) => {
  connection.query(`SELECT class.classname, class.startingyear, COUNT(student.studentID) AS amountStudents FROM class
                    LEFT JOIN student ON class.classname = student.classname
                    GROUP BY class.classname`, (err, rows) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						}
					checkLogType({ message: `Alle Klassen wurden abgerufen${formatClient(req)}` });
                    res.send(rows);
  });
});

app.get('/home/allteacherclasses', (req, res) => {
  let loggedInTeacher = req.query.teacherID;
  let teacherfirstname = req.query.firstname;
  let teacherlastname = req.query.lastname;
  console.log(loggedInTeacher);
  connection.query(`SELECT class.classname, class.startingyear, COUNT(student.studentID) AS amountStudents FROM class
                    LEFT JOIN student ON class.classname = student.classname
                    INNER JOIN teacher_class ON class.classname = teacher_class.classname
                    INNER JOIN teacher ON teacher_class.teacherID = teacher.teacherID
                    WHERE teacher.teacherID = "${loggedInTeacher}"`, (err, rows) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						}
					checkLogType({ message: `Alle Klassen des Lehrers ${teacherfirstname} ${teacherlastname} wurden abgerufen${formatClient(req)}` });
                      res.send(rows);
                    });
});

app.get('/home/allclasses/:classname', (req, res) => {
	let classname = req.params.classname;
	connection.query(`SELECT firstname, lastname, image, class.classname FROM student
                    INNER JOIN class ON student.classname = class.classname 
                    WHERE class.classname = "${classname}"`, (err, rows) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						}
		

		if (rows.length == 0) {
			checkLogType({ error: `Klasse ${classname} nicht gefunden!${formatClient(req)}` });
			res.status(404).json({ error: 'Bitte geben Sie eine gültige Klasse an!' });
			return;
		}
		checkLogType({ message: `Alle Schüler der Klasse ${classname} wurden abgerufen${formatClient(req)}` });
		res.send(rows);
	});

});


app.post('/home/teacherclass', (req, res) => {
  let teacherID = req.body.teacherID;
  let classname = req.body.classname;
  console.log(classname+'c');

  if (!teacherID || !classname || Object.keys(req.body).length != 2) {
	console.log(1);
	checkLogType({ error: `Es wurden nicht teacherID und classname mitgegeben!${formatClient(req)}` })
	res.status(400).json({ error: 'Bitte geben Sie eine teacherID und einen classname mit!' });
	return;
  } 
	console.log(2);
  connection.query(`SELECT * FROM teacher WHERE teacherID = "${teacherID}"`, (err, rows) => {
	if (err) {
		checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
		throw err;
	}
	if (rows.length <= 0) {
		checkLogType({ error: `Lehrer ${teacherID} nicht gefunden!${formatClient(req)}` });
		res.status(404).json({ error: 'Klasse oder Lehrer nicht gefunden!' });
		return;
	} else {
		connection.query(`SELECT * FROM class WHERE classname = "${classname}"`, (err, rows) => {
			if (err) {
				checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
				throw err;
			}
			if (rows.length <= 0) {
				console.log(4);
				checkLogType({ error: `Klasse ${classname} nicht gefunden!${formatClient(req)}` });
				res.status(404).json({ error: 'Klasse oder Lehrer nicht gefunden!' });
				return;
			} else {
				console.log(req.body);
				connection.query(`SELECT * FROM teacher_class WHERE teacherID = "${teacherID}" AND classname = "${classname}"`, (err, rows) => {
					if (err) {
						checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
						throw err;
					}
				  if (rows.length <= 0) {
					connection.query(`INSERT INTO teacher_class (teacherID, classname) VALUES (?,?)`,[teacherID, classname], (err) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						}else {
						  console.log('Klasse zum Lehrer hinzugefügt');
						  checkLogType({ message: `Klasse ${classname} wurde zum Lehrer ${teacherID} hinzugefügt${formatClient(req)}` });
						  res.status(201).json({message: 'Klasse zum Lehrer hinzugefügt'});
					  }
					  
					});
				  } else {
						checkLogType({ error: `Diese Verbindung zwischen Lehrer und Klasse existiert bereits!${formatClient(req)}` });
					  res.status(409).json({ error: 'Diese Verbindung zwischen Lehrer und Klasse existiert bereits!' });
				  }						
				});
			}
			  });
	}
	  });
	

  
});

app.delete('/home/teacherclass', (req, res) => {
  let teacherID = req.body.teacherID;
  let classname = req.body.classname;
  if (!teacherID || !classname || Object.keys(req.body).length != 2) {
	res.status(400).json({ error: 'Bitte geben Sie eine teacherID und einen classname mit!' });
	return;
  }
  connection.query(`DELETE FROM teacher_class WHERE teacherID = "${teacherID}" AND classname = "${classname}"`, (err, rows) => {
    if (err) {
		checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
		throw err;
	}else {
		if (rows.affectedRows == 0) {
			checkLogType({ error: `Klasse oder Lehrer nicht gefunden!${formatClient(req)}` });
			res.status(404).json({ error: 'Klasse oder Lehrer nicht gefunden!' });
			return;
		}
		console.log('Class removed from teacher');
		checkLogType({ message: `Klasse ${classname} wurde von Lehrer ${teacherID} entfernt${formatClient(req)}` });
		res.json({message: 'Klassen von Lehrer entfernt'});
	}

  });

})


app.get('/home/teachers/:teacherID', (req, res) => {
	let id = req.params.teacherID;
	connection.query(`SELECT teacher.firstname, teacher.lastname, teacher.email, GROUP_CONCAT(class.classname SEPARATOR ', ') AS classes FROM teacher
                    LEFT JOIN teacher_class ON teacher.teacherID = teacher_class.teacherID
                    LEFT JOIN class ON teacher_class.classname = class.classname
                    WHERE teacher.teacherID = "${id}"
                    GROUP BY teacher.teacherID`, (err, rows) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						}
		if (rows.length == 0) {
			checkLogType({ error: `Lehrer nicht gefunden!${formatClient(req)}` });
			res.status(404).json({ error: 'Lehrer nicht gefunden!' });
			return;
		}
		checkLogType({ message: `Lehrer ${rows[0].firstname} ${rows[0].lastname} wurde abgerufen${formatClient(req)}` });
		res.send(rows);
	});
})

app.get('/home/teachers/:teacherID/results', (req, res) => {
  let id = req.params.teacherID;
  connection.query(`select class.classname, results.practice_result from results
  RIGHT JOIN teacher_class ON results.teacher_classID = teacher_class.teacher_classID
  RIGHT JOIN class ON teacher_class.classname = class.classname
  WHERE teacherID = "${id}";`, (err, rows) => {
    if (err) {
		checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
		throw err;
	}
	if (rows.length == 0) {
		checkLogType({ error: `Lehrer nicht gefunden!${formatClient(req)}` });
		res.status(404).json({ error: 'Lehrer nicht gefunden!' });
		return;
	}
	checkLogType({ message: `Resultate des Lehrers ${id} wurden abgerufen${formatClient(req)}` });
    res.send(rows);
  });
});

app.put('/home/nickname', (req, res) => {
  let studentID = req.body.studentID;
  let nickname = req.body.nickname;
  if (!studentID || !nickname || Object.keys(req.body).length != 2) {
	checkLogType({ error: `Es wurden nicht studentID und nickname mitgegeben!${formatClient(req)}` });
	res.status(400).json({ error: 'Bitte geben Sie eine studentID und einen nickname mit!' });
	return;
  }
  console.log(req.body);
  connection.query(`SELECT * FROM student WHERE studentID = "${studentID}"`, (err, rows) => {
	if (err) {
		checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
		throw err;
	}
	if (rows.length <= 0) {
		checkLogType({ error: `Student ${studentID} nicht gefunden!${formatClient(req)}` });
		res.status(404).json({ error: 'Student nicht gefunden!' });
		return;
	} else {
		connection.query(`UPDATE student SET nickname = ? WHERE studentID = ?`, [nickname, studentID], (err) => {
			if (err) {
				checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
				throw err;
			}else {
				console.log('Nickname added');
				checkLogType({ message: `Nickname hinzugefügt${formatClient(req)}` });
				res.json({message: 'Nickname hinzugefügt'});
			}
			
		  });
	}
	  });
  
});

app.post('/home/results', (req, res) => {
  let teacher_classID = req.body.teacher_classID;
  let practice_result = req.body.practice_result;
  if (teacher_classID == undefined || practice_result == undefined|| Object.keys(req.body).length != 2) {
	checkLogType({ error: `Es wurden nicht teacher_classID und practice_result mitgegeben!${formatClient(req)}` });
	res.status(400).json({ error: 'Bitte geben Sie eine teacher_classID und ein practice_result mit!' });
	return;
  }
  if (isNaN(practice_result)) {
	checkLogType({ error: `Das Resultat ist nicht als Zahl angegeben worden!${formatClient(req)}` });
	res.status(400).json({ error: 'Das Resultat muss als Zahl angegeben werden!' });
	return;
  }

  // flashcard_result, exercise_result, minigame_result can only be between 0 and 100
  if (practice_result < 0 || practice_result > 100) {
	checkLogType({ error: `Es wurden ein Resultat, welches nicht zwischen 1 und 100 ist mitgegeben!${formatClient(req)}` });
	res.status(400).json({ error: 'Das Resultat kann nur eine Zahl zwischen 1 und 100 sein!' });
	return;
	  }

	connection.query(`SELECT * FROM teacher_class WHERE teacher_classID = "${teacher_classID}"`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		if (rows.length <= 0) {
			checkLogType({ error: `Teacher_classID nicht gefunden!${formatClient(req)}` });
			res.status(404).json({ error: 'Teacher_classID nicht gefunden!' });
			return;
		} else {

	connection.query(`SELECT COUNT(*) AS count FROM results WHERE teacher_classID = "${teacher_classID}"`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		if (rows[0].count > 0) {
			connection.query(`SELECT * FROM results WHERE teacher_classID = "${teacher_classID}"`, (err, rows) => {
				if (err) {
					checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
					throw err;
				}
				let practice_result_in_DB = rows[0].practice_result;
				if (practice_result > practice_result_in_DB) {
					connection.query(`UPDATE results SET practice_result = ? WHERE teacher_classID = ?`, [practice_result, teacher_classID], (err) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						}
					});
				}
				console.log('Results updated');
				checkLogType({ message: `Resultat aktualisiert${formatClient(req)}` });
				res.status(200).json({message: 'Resultat aktualisiert'});

			});
		} else {
			let sql = `INSERT INTO results (teacher_classID, practice_result) VALUES (?,?)`;
			connection.query(sql , [teacher_classID, practice_result], (err) => {
				if (err) {
					checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
					throw err;
				}else {
					console.log('Results added');
					checkLogType({ message: `Resultat hinzugefügt${formatClient(req)}` });
					res.status(201).json({message: 'Resultat hinzugefügt'});
				}
			});
		}


    
  });
}
});
});





//listener for the current port
app.listen(port, () => {
	checkLogType({ message: `Der Server läuft auf Port: ${port}` });
	console.log(`Server running on port: ${port}`);
});

export {formatClient}
