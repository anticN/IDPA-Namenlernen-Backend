drop database if exists learnnames_DB;

create database learnnames_DB;

USE learnnames_DB;

CREATE TABLE class (
    classname VARCHAR(50) PRIMARY KEY,
    startingyear INT
);


CREATE TABLE student (
    studentID INT PRIMARY KEY AUTO_INCREMENT,
    lastname VARCHAR(50),
    firstname VARCHAR(50),
    nickname VARCHAR(50),
    image BLOB,
    classname VARCHAR(50),
    FOREIGN KEY (classname)
        REFERENCES class (classname)
);


CREATE TABLE teacher (
    teacherID INT PRIMARY KEY AUTO_INCREMENT,
    lastname VARCHAR(50),
    firstname VARCHAR(50),
    email VARCHAR(50),
    salt VARCHAR(255),
    hashedPW VARCHAR(255),
    session_id VARCHAR(255),
    isVerified BOOLEAN
);



CREATE TABLE teacher_class (
	teacher_classID INT PRIMARY KEY AUTO_INCREMENT,
    teacherID INT,
    classname VARCHAR(50),
    FOREIGN KEY (teacherID)	
        REFERENCES teacher (teacherID),
    FOREIGN KEY (classname)
        REFERENCES class (classname)
);

CREATE TABLE results (
	resultsID INT PRIMARY KEY AUTO_INCREMENT,
    practice_result INT,
    teacher_classID INT,
    FOREIGN KEY (teacher_classID)
		REFERENCES teacher_class (teacher_classID) ON DELETE CASCADE
);


/*INSERT INTO class 
VALUES ("I22A", 2022);*/

/*INSERT INTO student
VALUES (1, "Müller", "Hans", NULL, "IM21A"),
        (2, "Schmidt", "Lisa", NULL, "IM21A"),
        (3, "Meier", "Peter", NULL, "IM21A"),
        (4, "Schulz", "Anna", NULL, "IM22A"),
        (5, "Fischer", "Lukas", NULL, "IM22A"),
        (6, "Weber", "Lena", NULL, "IM22A");*/

/*INSERT INTO test_teacher
VALUES (1, "Moling", "Mike", "test.lehrer@ksh.ch", 0);*/

/*INSERT INTO teacher_class
VALUES (1,1,"IM21A"),
        (2,1,"IM22A");*/

/*INSERT INTO subject
VALUES (1, "Mathematik"),
        (2, "Deutsch"),
        (3, "Englisch"),
        (4, "Sport"),
        (5, "Informatik");

INSERT INTO teacher_class_subject
VALUES (1,1),
        (1,2),
        (2,1),
        (2,2);*/

 
