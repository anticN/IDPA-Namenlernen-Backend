drop database if exists learnnames_DB;

create database learnnames_DB;

use learnnames_DB;

CREATE TABLE class (
    classID INT PRIMARY KEY,
    classname VARCHAR(50),
    startingyear INT
);


CREATE TABLE student (
    studentID INT PRIMARY KEY,
    name VARCHAR(50),
    firstname VARCHAR(50),
    image BLOB,
    classID INT,
    FOREIGN KEY (classID)
        REFERENCES class (classID)
);

CREATE TABLE subject (
    subjectID INT PRIMARY KEY,
    subjectname VARCHAR(50)
);

CREATE TABLE teacher (
    teacherID INT PRIMARY KEY,
    name VARCHAR(50),
    firstname VARCHAR(50),
    username VARCHAR(50),
    password VARCHAR(50)
);

CREATE TABLE class_subject (
    classID INT,
    subjectID INT,
    PRIMARY KEY (classID , subjectID),
    FOREIGN KEY (classID)
        REFERENCES class (classID),
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

 
