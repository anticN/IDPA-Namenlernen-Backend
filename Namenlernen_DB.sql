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

CREATE TABLE subject (
    subjectID INT PRIMARY KEY,
    subjectname VARCHAR(50)
);

CREATE TABLE teacher (
    teacherID INT PRIMARY KEY AUTO_INCREMENT,
    lastname VARCHAR(50),
    firstname VARCHAR(50),
    email VARCHAR(50),
    salt VARCHAR(255),
    hashedPW VARCHAR(255),
    isVerified BOOLEAN
);

CREATE TABLE test_teacher (
    teacherID INT PRIMARY KEY AUTO_INCREMENT,
    lastname VARCHAR(50),
    firstname VARCHAR(50),
    email VARCHAR(50),
    isVerified BOOLEAN
);


CREATE TABLE teacher_class (
	teacher_classID INT PRIMARY KEY AUTO_INCREMENT,
    teacherID INT,
    classname VARCHAR(50),
    FOREIGN KEY (teacherID)	
        REFERENCES test_teacher (teacherID), /*test_teacher mit teacher ersetzen*/
    FOREIGN KEY (classname)
        REFERENCES class (classname)
);

CREATE TABLE teacher_class_subject (
    teacher_classID INT,
    subjectID INT,
    PRIMARY KEY (teacher_classID , subjectID),
    FOREIGN KEY (teacher_classID)
        REFERENCES teacher_class (teacher_classID),
    FOREIGN KEY (subjectID)
        REFERENCES subject (subjectID)
);

INSERT INTO class 
VALUES ("IM21A", 2021),
        ("IM22A", 2022);

INSERT INTO student
VALUES (1, "Müller", "Hans", NULL, "IM21A"),
        (2, "Schmidt", "Lisa", NULL, "IM21A"),
        (3, "Meier", "Peter", NULL, "IM21A"),
        (4, "Schulz", "Anna", NULL, "IM22A"),
        (5, "Fischer", "Lukas", NULL, "IM22A"),
        (6, "Weber", "Lena", NULL, "IM22A");

INSERT INTO test_teacher
VALUES (1, "Moling", "Mike", "test.lehrer@ksh.ch", 0);

INSERT INTO teacher_class
VALUES (1,1,"IM21A"),
        (2,1,"IM22A");

INSERT INTO subject
VALUES (1, "Mathematik"),
        (2, "Deutsch"),
        (3, "Englisch"),
        (4, "Sport"),
        (5, "Informatik");

INSERT INTO teacher_class_subject
VALUES (1,1),
        (1,2),
        (2,1),
        (2,2);

 
