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

CREATE TABLE nickname (
    nicknameID INT PRIMARY KEY AUTO_INCREMENT,
    teacherID INT,
    studentID INT,
    nickname VARCHAR(50),
    FOREIGN KEY (teacherID)
        REFERENCES teacher (teacherID),
    FOREIGN KEY (studentID)
        REFERENCES student (studentID)
);

CREATE TABLE results (
	resultsID INT PRIMARY KEY AUTO_INCREMENT,
    practice_result FLOAT,
    teacher_classID INT,
    FOREIGN KEY (teacher_classID)
		REFERENCES teacher_class (teacher_classID) ON DELETE CASCADE
);
