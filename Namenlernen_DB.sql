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

CREATE TABLE class_subject (
    classname VARCHAR(50),
    subjectID INT,
    PRIMARY KEY (classname , subjectID),
    FOREIGN KEY (classname)
        REFERENCES class (classname),
    FOREIGN KEY (subjectID)
        REFERENCES subject (subjectID)
);

CREATE TABLE teacher_subject (
    teacherID INT,
    subjectID INT,
    PRIMARY KEY (teacherID , subjectID),
    FOREIGN KEY (teacherID)
        REFERENCES teacher (teacherID),
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
        (4, "Schulz", "Anna", NULL, "IM21A"),
        (5, "Fischer", "Lukas", NULL, "IM21A"),
        (6, "Weber", "Lena", NULL, "IM21A");

 
