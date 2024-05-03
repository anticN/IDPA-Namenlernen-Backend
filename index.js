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
import { threadId } from 'worker_threads';
import { resolve } from 'path';
import { rejects } from 'assert';



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
	origin: 'http://localhost:5173',
	credentials: true,
	allowedHeaders: ['Content-type', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Credentials', 'Authorization']

}

app.use(cors(corsOptions));
// TODO when production ready, add cors options: origin, methods, credentials, etc.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
	secret: process.env.SECRET,
	resave: false,
	saveUninitialized: false
}))

// Middleware to check if the user is logged in
app.use('/home', (req, res, process) => {
	if (req.session.id == null) {
		checkLogType({ error: `Benutzer nicht eingeloggt!${formatClient(req)}` });
		res.status(403).json({ error: 'Sie sind nicht eingeloggt! Sie müssen sich anmelden um die Applikation nutzen zu können.' })
	} else {
		process()
	}
})

// function to format the client information for log files
function formatClient(req) {
	return `\n\t\t\t\t\tClient: ${req.headers['user-agent']} || ${req.ip}`
}

/**
 * Adds a teacher to the database when signing up.
 * 
 * @param {object} teacher - The teacher object containing information like email, lastname, firstname, etc.
 * @param {object} res - The response object used to send responses back to the client.
 * @param {object} req - The request object representing the HTTP request.
 * @returns {Response} - Returns a response to the client with a message and the session ID.
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the teacher could not be added to the database
 */
function addTeacherToDB(teacher, res, req) {
	const session_id = req.session.id;
	connection.query(`INSERT INTO teacher (lastname, firstname, email, salt, hashedPW, session_id, isVerified) 
            VALUES ('${teacher.lastname}', '${teacher.firstname}', '${teacher.email}', '${teacher.salt}', '${teacher.hashed}', '${session_id}', '${teacher.verified}')`,
		[teacher], (err, result) => {
			if (err) {
				checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
				throw err;
			}
			res.status(201).json({ message: `Guten Tag ${teacher.firstname} ${teacher.lastname}! Ihr Konto wurde erfolgreich erstellt!`, session_id: session_id });
		});
}

/**
 * Hashes a password using a randomly generated salt.
 * 
 * @param {string} password - The password to be hashed.
 * @returns {object} - An object containing the salt and the hashed password.
 */
function hashpw(password) {
	const salt = crypto.randomBytes(16).toString("hex")
	const hashed = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
	return { salt, hashed }
}

/**
 * Retrieves the teacher ID associated with the given session ID.
 * 
 * @param {string} sessionID - The session ID of the teacher.
 * @returns {Promise<number>} - A Promise that resolves with the teacher ID.
 * @throws {Error} - Returns an error if an error occurs
 */
async function getTeacherID(sessionID) {
	return new Promise((resolve, rejects) => {
		connection.query(`SELECT teacherID FROM teacher WHERE session_id = "${sessionID}"`, (err, rows) => {
			if (err) {
				checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
				throw err;
			}
			//return rows[0].teacherID;
			resolve(rows[0].teacherID);
		});
	})
}


/**
 * Retrieves all students from the database.
 * 
 * @param {object} req - The request object representing the HTTP request.
 * @param {object} res - The response object used to send responses back to the client.
 * @returns {Response} - Returns all students from the database.
 * @throws {Error} - Returns an error if an error occurs
 */
app.get('/home', (req, res) => {
	connection.query('SELECT * FROM student', (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		res.send(rows);
	});
});


/**
 * Handles the signup process for new users.
 * Checks if teacher exists, if the email format is valid and creates a new account.
 * 
 * @param {object} req - The request object representing the HTTP request.
 * @param {object} res - The response object used to send responses back to the client.
 * @returns {Response} - Returns only errors, because the function "addTeacherToDB" handles the success case.
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the user tries to sign up with an invalid email
 * @throws {Error} - Returns an error if the user tries to sign up with an email that already exists
 * @throws {Error} - Returns an error if the user tries to sign up with a non-KSH email
 * @throws {Error} - Returns an error if the user tries to sign up without providing an email or password
 */
app.post("/signup", function (req, res) {
	let row = '';
	const email = req.body.email;
	const password = req.body.password;
	if (email == undefined || password == undefined || Object.keys(req.body).length != 2) {
		checkLogType({ error: `Es wurden nicht E-Mail und Passwort mitgegeben!${formatClient(req)}` })
		res.status(400).json({ error: 'Bitte geben Sie eine E-Mail-Adresse und ein Passwort mit!' });
		return;
	}
	try {
		const credentials = email.split("@");
		const names = credentials[0].split(".");
		if (names.length != 2) {
			// returns an error if the user tries to sign up with an invalid email
			checkLogType({ error: `E-Mail Adresse ist ungültig!${formatClient(req)}` });
			res.status(401).json({ error: "Bitte geben Sie eine gültige KSH E-Mail-Adresse ein!" });
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
			if (row == email) {
				// returns an error if the user tries to sign up with an email that already exists
				checkLogType({ error: `Die Email: ${email} wurde bereits verwendet!${formatClient(req)}` });
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
					// adds the teacher to the DB
					checkLogType({ message: `Benutzer ${teacher.firstname} ${teacher.lastname} wurde zur DB hinzugefügt${formatClient(req)}` });
					addTeacherToDB(teacher, res, req);
					req.session.email = email;
				} else {
					// returns an error if the user tries to sign up with a non-KSH email
					checkLogType({ error: `Es wurde keine KSH-Mail verwendet!${formatClient(req)}` });
					res.status(401).json({ error: "Sie müssen Ihre KSH-Mail verwenden!" });
				}
			}
		});
	}
	catch (err) {
		checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
	}
});


/**
 * Handles the login process for users, checks if the user exists and if the password is correct.
 * Updates the session ID in the database and sends a response to the client.
 * 
 * @param {object} req - The request object representing the HTTP request.
 * @param {object} res - The response object used to send responses back to the client.
 * @returns {Response} - Returns a message if the user was successfully logged in or not.
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the user does not provide an email or password
 * @throws {Error} - Returns an error if the user does not exist
 * @throws {Error} - Returns an error if the password or username is incorrect
 */
app.post("/login", (req, res) => {
	const password = req.body.password
	const uEmail = req.body.email
	// checks if the user provides an email and password
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
				checkLogType({ message: `Benutzer ${uEmail} hat sich eingeloggt${formatClient(req)}` });
				// updates the session ID in the DB
				const newSession = crypto.randomBytes(16).toString("hex");
				connection.query(`UPDATE teacher SET session_id = '${newSession}' WHERE email='${uEmail}'`, (err) => {
					if (err) {
						checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
						throw err;
					}
				});
				res.json({ message: `Willkommen ${uEmail}! Sie wurden erfolgreich eingeloggt!`, session_id: newSession });
			} else {
				checkLogType({ error: `Falsches Passwort für Benutzer ${uEmail}!${formatClient(req)}` });
				res.status(401).json({ error: "Falsches Passwort oder falscher Benutzername!" })
			}
		} else {
			checkLogType({ error: `Falsches Passwort für Benutzer ${uEmail}!${formatClient(req)}` });
			res.status(400).json({ error: "Benutzer existiert nicht!" })
		}
	});
});


/**
 * Handles the logout process for users and deletes the session ID from the database.
 * 
 * @param {object} req - The request object representing the HTTP request.
 * @param {object} res - The response object used to send responses back to the client.
 * @returns {Response} - Returns a message if the user was successfully logged out.
 * @throws {Error} - Returns an error if an error occurs
 */
app.delete('/home/logout', (req, res) => {
	checkLogType({ message: `Benutzer ${req.cookies.session_id.email} hat sich ausgeloggt${formatClient(req)}` });
	connection.query(`UPDATE teacher SET session_id = NULL WHERE email='${req.cookies.session_id.email}'`, (err) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
	});
	return res.json({ message: 'Sie wurden erfolgreich ausgeloggt!' })
})

/**
 * Checks the validity of a session ID.
 * 
 * @param {object} req - The request object representing the HTTP request.
 * @param {object} res - The response object used to send responses back to the client.
 * @returns {Response} - Returns a message if the session is valid or not.
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the session is invalid
 */
app.post("/checkSession", (req, res) => {
	const session_id = req.body.session_id;
	// Query the database to check if the session_id exists
	connection.query(`SELECT * FROM teacher WHERE session_id='${session_id}';`, (err, rows) => {
		if (err) {
			checkLogType({ error: `error: ${err}` });
			throw err;
		} else {
			if (rows.length > 0) {
				// Session is valid
				res.status(200).json({ message: 'Session is valid' });
			} else {
				// Session is invalid
				res.status(401).json({ error: 'Session is invalid' });
			}
		}
	});
});

app.get('/home/student', (req, res) => {
	connection.query('SELECT * FROM student', (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		// returns all students in the DB
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

/**
 * Uploads a pdf file and calls the parser function
 * @param {Object} req - Client request
 * @param {Object} res - Server response
 * @throws {Error} - Returns an error if an error occurs
*/

app.post('/home/pdfupload', (req, res) => {
	upload(req, res, (err) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		} else {
			parser(req, res, connection);

		}
	})
})



/**
 * Calls all classes
 * @param {Object} req - Client request
 * @param {Object} res - Server response
 * @returns {Object} - Returns all classes
 * @throws {Error} - Returns an error if an error occurs
 */

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


/**
 *  Calls all classes of a teacher
 * @param {Object} req - Client request
 * session_id - Session ID of the teacher
 * firstname - First name of the teacher
 * lastname - Last name of the teacher
 * @param {Object} res - Server response
 * @returns {Object} - Returns all classes of the teacher
 * @throws {Error} - Returns an error if an error occurs
 */

app.get('/home/allteacherclasses', (req, res) => {
	const loggedInTeacher = req.query.session_id;
	let teacherfirstname = req.query.firstname;
	connection.query(`SELECT class.classname, class.startingyear, COUNT(student.studentID) AS amountStudents FROM class
                    LEFT JOIN student ON class.classname = student.classname
                    INNER JOIN teacher_class ON class.classname = teacher_class.classname
                    INNER JOIN teacher ON teacher_class.teacherID = teacher.teacherID
                    WHERE teacher.session_id = "${loggedInTeacher}"
					GROUP BY class.classname, class.startingyear`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		checkLogType({ message: `Alle Klassen des Lehrers ${teacherfirstname} ${teacherlastname} wurden abgerufen${formatClient(req)}` });
		res.send(rows);
	});
});

/**
 * Calls all students of a class
 * @param {Object} req - Client request
 * classname - Name of the class
 * @param {Object} res - Server response
 * @returns {Object} - Returns all students of the class
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the class is not found
 */

app.get('/home/allclasses/:classname/:session_id', async (req, res) => {
	let classname = req.params.classname;
	let teacherID = await getTeacherID(req.params.session_id);
	connection.query(`SELECT student.studentID, student.firstname, student.lastname, student.image, nickname.nickname, class.classname FROM student
                    INNER JOIN class ON student.classname = class.classname 
					LEFT JOIN nickname ON student.studentID = nickname.studentID AND nickname.teacherID = "${teacherID}"
					LEFT JOIN teacher ON nickname.teacherID = teacher.teacherID		
                    WHERE class.classname = "${classname}"
					ORDER BY lastname ASC`, (err, rows) => {
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

/**
 * Adds a class to the teacher
 * @param {Object} req - Client request
 * session_id - Session ID of the teacher
 * classname - Name of the class
 * @param {Object} res - Server response
 * @returns {Object} - Returns a message if the class was added to the teacher
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the user does not provide a session_id or classname
 * @throws {Error} - Returns an error if the teacher does not exist
 * @throws {Error} - Returns an error if the class does not exist
 * @throws {Error} - Returns an error if the class is already added to the teacher
 */

app.post('/home/teacherclass', (req, res) => {
	const session_id = req.body.session_id;
	let classname = req.body.classname;

	if (!session_id || !classname || Object.keys(req.body).length != 2) {
		checkLogType({ error: `Es wurden nicht session_id und classname mitgegeben!${formatClient(req)}` })
		res.status(400).json({ error: 'Bitte geben Sie eine session_id und einen Klassennamen mit!' });
		return;
	}
	connection.query(`SELECT * FROM teacher WHERE session_id = "${session_id}"`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		if (rows.length <= 0) {
			checkLogType({ error: `Lehrer mit der SessionID: ${session_id} nicht gefunden!${formatClient(req)}` });
			res.status(404).json({ error: 'Klasse oder Lehrer nicht gefunden!' });
			return;
		} else {
			const teacherID = rows[0].teacherID;
			connection.query(`SELECT * FROM class WHERE classname = "${classname}"`, (err, rows) => {
				if (err) {
					checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
					throw err;
				}
				if (rows.length <= 0) {
					checkLogType({ error: `Klasse ${classname} nicht gefunden!${formatClient(req)}` });
					res.status(404).json({ error: 'Klasse oder Lehrer nicht gefunden!' });
					return;
				} else {
					connection.query(`SELECT * FROM teacher_class WHERE teacherID = "${teacherID}" AND classname = "${classname}"`, (err, rows) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						}
						if (rows.length <= 0) {
							connection.query(`INSERT INTO teacher_class (teacherID, classname) VALUES (?,?)`, [teacherID, classname], (err) => {
								if (err) {
									checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
									throw err;
								} else {
									checkLogType({ message: `Klasse ${classname} wurde zum Lehrer ${teacherID} hinzugefügt${formatClient(req)}` });
									res.status(201).json({ message: 'Klasse zum Lehrer hinzugefügt' });
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

/**
 * Calls all classes of a teacher
 * @param {Object} req - Client request
 * teacherID - ID of the teacher
 * @param {Object} res - Server response
 * @returns {Object} - Returns all classes of the teacher
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the teacher does not exist
 */

app.get('/home/teacherclass/:teacherID', (req, res) => {
	let teacherID = req.params.teacherID;
	connection.query(`SELECT * FROM teacher WHERE teacherID = "${teacherID}"`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		if (rows.length == 0) {
			checkLogType({ error: `Lehrer nicht gefunden!${formatClient(req)}` });
			res.status(404).json({ error: 'Lehrer nicht gefunden!' });
			return;
		}
	});
	connection.query(`SELECT * FROM teacher_class
					WHERE teacher_class.teacherID = "${teacherID}" `, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		} else {
			checkLogType({ message: `Alle Klassen des Lehrers mit der ID ${teacherID} wurden abgerufen${formatClient(req)}` });
			res.send(rows);
		}
	});
});

/**
 * Removes a class from a teacher
 * @param {Object} req - Client request
 * session_id - Session ID of the teacher
 * classname - Name of the class
 * @param {Object} res - Server response
 * @returns {Object} - Returns a message if the class was removed
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the user does not provide a teacherID or classname
 * @throws {Error} - Returns an error if the class or teacher does not exist	
 */

app.delete('/home/teacherclass', async (req, res) => {
	const teacherID = await getTeacherID(req.body.session_id);
	let classname = req.body.classname;
	if (!teacherID || !classname || Object.keys(req.body).length != 2) {
		res.status(400).json({ error: 'Bitte geben Sie eine teacherID und einen classname mit!' });
		return;
	}
	connection.query(`DELETE FROM teacher_class WHERE teacherID = "${teacherID}" AND classname = "${classname}"`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		} else {
			if (rows.affectedRows == 0) {
				checkLogType({ error: `Klasse oder Lehrer nicht gefunden!${formatClient(req)}` });
				res.status(404).json({ error: 'Klasse oder Lehrer nicht gefunden!' });
				return;
			}
			checkLogType({ message: `Klasse ${classname} wurde von Lehrer ${teacherID} entfernt${formatClient(req)}` });
			res.json({ message: `Klasse ${classname} wurde entfernt` });
		}

	});

})

/**
 * Calls all students of a teacher
 * @param {Object} req - Client request
 * @param {Object} res - Server response
 * @returns {Object} - Returns all teachers
 * @throws {Error} - Returns an error if an error occurs
 */

app.get('/home/teachers', (req, res) => {
	connection.query(`SELECT * FROM teacher`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		} else {
			checkLogType({ message: `Alle Lehrer wurden abgerufen${formatClient(req)}` });
			res.send(rows);
		}
	});
});

/**
 * Calls a teacher with a given ID
 * @param {Object} req - Client request
 * teacherID - ID of the teacher
 * @param {Object} res - Server response
 * @returns {Object} - Returns the teacher with the given ID
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the teacher does not exist
 */

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

/**
 * Calls the results of a teacher
 * @param {Object} req - Client request
 * teacherID - ID of the teacher
 * @param {Object} res - Server response
 * @returns {Object} - Returns the results from each class of the teacher
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the teacher does not exist
 */

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

/**
 * Calls the results of a teacher
 * @param {Object} req - Client request
 * studentID - ID of the student
 * nickname - Nickname of the student
 * @param {Object} res - Server response
 * @returns {Object} - Returns a message if the nickname was updated
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the user does not provide a studentID or nickname
 * @throws {Error} - Returns an error if the student does not exist
 */

app.put('/home/nickname', async (req, res) => {
	const teacherID = await getTeacherID(req.body.session_id);
	let studentID = req.body.studentID;
	let nickname = req.body.nickname;
	if (!studentID || nickname == undefined || teacherID == undefined || Object.keys(req.body).length != 3) {
		checkLogType({ error: `Es wurden nicht studentID und nickname mitgegeben!${formatClient(req)}` });
		res.status(400).json({ error: 'Bitte geben Sie eine studentID und einen nickname mit!' });
		return;
	}
	connection.query(`SELECT * FROM nickname WHERE studentID = "${studentID}" AND teacherID = "${teacherID}"`, (err, rows) => {
		if (err) {
			checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
			throw err;
		}
		if (rows.length <= 0) {
			/*checkLogType({ error: `Student ${studentID} nicht gefunden!${formatClient(req)}` });
			res.status(404).json({ error: 'Student nicht gefunden!' });
			return;*/
			connection.query(`INSERT INTO nickname (studentID, teacherID, nickname) VALUES (?,?,?)`, [studentID, teacherID, nickname], (err) => {
				if (err) {
					checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
					throw err;
				} else {
					checkLogType({ message: `Nickname hinzugefügt${formatClient(req)}` });
					res.json({ message: 'Nickname hinzugefügt' });
				}
			});
		} else {
			if (nickname == '' || nickname == null) {
				nickname = null;
			}
			connection.query(`UPDATE nickname SET nickname = ? WHERE studentID = ? AND teacherID = ?`, [nickname, studentID, teacherID], (err) => {
				if (err) {
					checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
					throw err;
				} else {
					checkLogType({ message: `Nickname upgedated${formatClient(req)}` });
					res.json({ message: 'Nickname upgedated' });
				}

			});
		}
	});

});


/**
 * Adds results to a connection between a teacher and a class
 * if there is no result yet
 * Updates the result if the result is higher than the previous one
 * @param {Object} req - Client request
 * teacher_classID - ID of the connection between teacher and class
 * practice_result - Result of the practice mode
 * @param {Object} res - Server response
 * @returns {Object} - Returns a message if the result was added or updated
 * @throws {Error} - Returns an error if an error occurs
 * @throws {Error} - Returns an error if the user does not provide a teacher_classID or practice_result
 * @throws {Error} - Returns an error if the result is not a number
 * @throws {Error} - Returns an error if the result is not between 1 and 100
 * @throws {Error} - Returns an error if the teacher_classID does not exist
 */

app.post('/home/results', (req, res) => {
	let teacher_classID = req.body.teacher_classID;
	let practice_result = req.body.practice_result;
	if (teacher_classID == undefined || practice_result == undefined || Object.keys(req.body).length != 2) {
		checkLogType({ error: `Es wurden nicht teacher_classID und practice_result mitgegeben!${formatClient(req)}` });
		res.status(400).json({ error: 'Bitte geben Sie eine teacher_classID und ein practice_result mit!' });
		return;
	}
	if (isNaN(practice_result)) {
		checkLogType({ error: `Das Resultat ist nicht als Zahl angegeben worden!${formatClient(req)}` });
		res.status(400).json({ error: 'Das Resultat muss als Zahl angegeben werden!' });
		return;
	}

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
						checkLogType({ message: `Resultat aktualisiert${formatClient(req)}` });
						res.status(200).json({ message: 'Resultat aktualisiert' });

					});
				} else {
					let sql = `INSERT INTO results (teacher_classID, practice_result) VALUES (?,?)`;
					connection.query(sql, [teacher_classID, practice_result], (err) => {
						if (err) {
							checkLogType({ error: `Ein Fehler ist aufgetreten: ${err}` });
							throw err;
						} else {
							checkLogType({ message: `Resultat hinzugefügt${formatClient(req)}` });
							res.status(201).json({ message: 'Resultat hinzugefügt' });
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
});

export { formatClient }