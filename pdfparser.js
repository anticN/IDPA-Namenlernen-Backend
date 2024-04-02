import pdf from 'pdf-parse';
import fs from 'fs';
import { exportImages } from 'pdf-export-images';
import { insertImage } from './imageinsert.js';
import { constants } from 'buffer';



function parser (req, res, connection) {
    let pdffilename = req.file.originalname;
    let pdfpath = `uploads/${pdffilename}`;
    // read out the images and the text from the pdf
        exportImages(pdfpath, 'uploads').then(() => {
            console.log('Images uploaded')
            dataParser(pdfpath, req,connection);
 
        });
}

function dataParser(pdfpath, req, connection) {
    let dataBuffer = fs.readFileSync(pdfpath);
    
        pdf(dataBuffer).then(function(data) {
            // read out the images and the text from the pdf
            let docname = req.file.originalname.split('.')[0];
            let classname = docname.split('_')[1];
            let classnumber = classname.replace(/\D/g, '');
            classnumber = parseInt(classnumber);
            let startingyear;
            let year = new Date().getFullYear();
            let month = new Date().getMonth();
            console.log('year:', year, 'month:', month);
            if (month < 7) {
                startingyear = year - classnumber;
                // replace the number in the classname with the last two digits of the startingyear
                classname = classname.replace(/\d+/, startingyear.toString().slice(2));
            } else {
                startingyear = (year - classnumber) + 1;
                classname = classname.replace(/\d+/, startingyear.toString().slice(2));
            }
            console.log('startingyear:', startingyear);
    
    
            let students = []
            let lines = data.text.split('\n');
            // student lines are all the lines after lines[8]
            let studentlines = lines.slice(9);
            console.log('studentlines:', studentlines);        
            for (let i = 0; i < studentlines.length; i++) {
                let student = studentlines[i];
                let studentname = student.split(' ');
                const imagePath = `uploads/img_p0_${i+2}.png`;

        // Lesen Sie den Inhalt der Datei
        
                
                let studentObj = {
                    lastname: studentname[1],
                    firstname: studentname[0],
                    nickname: null,
                    image: null,
                    classname: classname
                }
    
                students.push(studentObj);
            }
            let classobject = {
                classname: classname,
                startingyear: startingyear
            }
            console.log('classobject:', classobject);
            insertImage(students, classobject, connection);

            

            
        });
}




export {parser};
