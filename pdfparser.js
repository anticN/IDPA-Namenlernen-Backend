import pdf from 'pdf-parse';
import fs from 'fs';
import { exportImages } from 'pdf-export-images';

function parser (req, res) {
    let pdffilename = req.file.originalname;
    let pdfpath = `uploads/${pdffilename}`;
    // read out the images and the text from the pdf
    let dataBuffer = fs.readFileSync
    (pdfpath);
    exportImages(pdfpath, 'uploads').then((images) => {
        console.log(images);
    });
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
        } else {
            startingyear = (year - classnumber) + 1;
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

            let image = `uploads/img_p0_${i+2}.png`;
            // check if image with this name exists in uploads folder
            if (!fs.existsSync(image)) {
                image = null;
            }
            let studentObj = {
                firstname: studentname[0],
                lastname: studentname[1],
                image: image,
                classname: classname
            }

            students.push(studentObj);
        }
        console.log('students:', students);
    });
    
    

}

export {parser};