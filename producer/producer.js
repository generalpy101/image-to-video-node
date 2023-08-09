const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');

const { sendToQueue, generateRandomString } = require('./helper');

// Load env vars
dotenv.config();

// Constants
const PORT = process.env.PORT || 8081;
const HOST = process.env.HOST || '0.0.0.0'

// create express app
const app = express();

// parse requests of content-type - application/json
app.use(express.json());
app.use(morgan('combined'))

app.get('/', (req, res) => {
    res.json({ message: 'Producer ready' });
    }
);

app.post('/jobs', async (req, res) => {
    const { userId, imageUrls } = req.body;
    try {
        await sendToQueue(userId, imageUrls);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error sending job to queue' });
    }

    res.json({ message: 'Job sent to queue' });
})

app.listen(PORT, HOST, () => {
    console.log(`Producer is running on port ${PORT}`);
})