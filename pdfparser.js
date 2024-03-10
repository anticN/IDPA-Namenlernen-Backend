import pdf from 'pdf-parse';
import fs from 'fs';
import { exportImages } from 'pdf-export-images';

function parser (req, res) {
    let pdffilename = req.file.originalname;
    let pdfpath = `uploads/${pdffilename}`;
    // read out the images and the text from the pdf
    let dataBuffer = fs.readFileSync
    (pdfpath);
    pdf(dataBuffer).then(function(data) {
        // read out the images and the text from the pdf
        console.log(data.text);
    });
    exportImages(pdfpath, 'uploads').then((images) => {
        console.log(images);
    });
}

export {parser};