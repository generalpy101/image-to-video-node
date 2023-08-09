const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');
const axios = require('axios');

// Load env vars
dotenv.config();

// Constants
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0'
const PRODUCER_URL = process.env.PRODUCER_URL || 'http://localhost:8081'

// create express app
const app = express();

// parse requests of content-type - application/json
app.use(express.json());
app.use(morgan('combined'))

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API' });
    }
);

app.post('/generate', async (req, res) => {
    const {image_urls} = req.body;

    axios.post(`${PRODUCER_URL}/jobs`, {
        imageUrls: image_urls,
        userId: '1234'
    }).then((response) => {
        console.log(response.data);
        res.json({ message: 'Job sent to queue' });
    }).catch((error) => {
        console.log(error.message);
        res.json({ message: 'Error sending job to queue' });
    })
})

app.listen(PORT, HOST, () => {
    console.log(`Server is running on port ${PORT}`);
});