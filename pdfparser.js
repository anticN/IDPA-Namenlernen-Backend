import pdf from 'pdf-parse';
import fs from 'fs';
import { exportImages } from 'pdf-export-images';
import { insertImage } from './imageinsert.js';
import { constants } from 'buffer';
import { checkLogType } from './logging.js';
import { formatClient } from './index.js';


/**
 * Exports the images from the pdf and calls the dataParser function
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {Connection} connection - The connection to the DB
 * @returns {void}
 */

function parser (req, res, connection) {
    let pdffilename = req.file.originalname;
    let pdfpath = `uploads/${pdffilename}`;
        exportImages(pdfpath, 'uploads').then(() => {
            dataParser(pdfpath, req,connection,res);

        });
}

/**
 * Reads the Text from the pdf 
 * and save the data in Objects for the students and the class
 * and calls the insertImage function
 * @param {String} pdfpath - The path to the pdf
 * @param {Request} req - The request object
 * @param {Response} res - The response object
 * @param {Connection} connection - The connection to the DB
 * @returns {void}
 * @throws {Error} - If the uploaded file is not a classlist
 */

function dataParser(pdfpath, req, connection, res) {
    let dataBuffer = fs.readFileSync(pdfpath);
    
        pdf(dataBuffer).then(function(data) {
            let docname = req.file.originalname.split('.')[0];
            if (!docname.includes('Klassenspiegel_')) {
                checkLogType({error: `Es wurde keine Klassenliste hochgeladen!${formatClient(req)}`});
                return res.status(400).send({error: 'Bitte laden Sie eine Klassenliste hoch!'});
                
            }
            let classname = docname.split('_')[1];
            let classnumber = classname.replace(/\D/g, '');
            classnumber = parseInt(classnumber);
            let startingyear;
            let year = new Date().getFullYear();
            let month = new Date().getMonth();
            if (month < 7) {
                startingyear = year - classnumber;
                classname = classname.replace(/\d+/, startingyear.toString().slice(2));
            } else {
                startingyear = (year - classnumber) + 1;
                classname = classname.replace(/\d+/, startingyear.toString().slice(2));
            }
    
    
            let students = []
            let lines = data.text.split('\n');
            let studentlines = lines.slice(9);      
            for (let i = 0; i < studentlines.length; i++) {
                let student = studentlines[i];
                let studentname = student.split(' ');
                const imagePath = `uploads/img_p0_${i+2}.png`;

        
                let studentObj = {
                    lastname: studentname[studentname.length - 1],
                    firstname: studentname[0],
                    image: null,
                    classname: classname
                }
    
                students.push(studentObj);
            }
            let classobject = {
                classname: classname,
                startingyear: startingyear
            }
            insertImage(students, classobject, connection, res, req);
        });
}




export {parser};
