import express from 'express';


const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Test for IDPA 2024');
  });


//listener for the current port
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
  })