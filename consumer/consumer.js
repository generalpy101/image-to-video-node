const fs = require("fs");
const path = require("path");
const amqp = require("amqplib");
const dotenv = require("dotenv");

const { generateVideo, downloadImages, deleteFiles } = require("./helper");

// Load env vars
dotenv.config();

const VIDEOS_DIR = path.join(__dirname, "./videos");
const IMAGES_DIR = path.join(__dirname, "./images");

async function consumeFromQueue() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  const queue = process.env.RABBITMQ_QUEUE_NAME;
  await channel.assertQueue(queue);

  channel.consume(queue, async (message) => {
    const job = JSON.parse(message.content.toString());

    try {
      const { userId, jobIdentifier, imageUrls, id } = job;
      console.log(`Received job from queue: ${JSON.stringify(job)}`);

      // Create user base directories if they don't exist
      const videosUserBase = path.join(__dirname, `./videos/${userId}`);
      const imagesUserBase = path.join(__dirname, `./images/${userId}`);

      if (!fs.existsSync(videosUserBase)) {
        fs.mkdirSync(videosUserBase);
      }
      if (!fs.existsSync(imagesUserBase)) {
        fs.mkdirSync(imagesUserBase);
      }

      // Create directories for video according to id and jobIdentifier
      const videosUserJobIdDir = path.join(videosUserBase, `./${id}`);
      if (!fs.existsSync(videosUserJobIdDir)) {
        fs.mkdirSync(videosUserJobIdDir);
      }

      // const videosJobDir = path.join(videosUserJobIdDir, jobIdentifier);
      // if (!fs.existsSync(videosJobDir)) {
      //   fs.mkdirSync(videosJobDir);
      // }

      // Create image directories
      const imagesJobDir = path.join(imagesUserBase, jobIdentifier);
      if (!fs.existsSync(imagesJobDir)) {
        fs.mkdirSync(imagesJobDir);
      }

      // Download images
      const imagePaths = await downloadImages(imageUrls, imagesJobDir);

      const videoPath = await generateVideo(imagesJobDir, videosUserJobIdDir);

      // Delete images
      deleteFiles(...imagePaths);
      fs.rmdirSync(imagesJobDir);

      console.log(
        `Video processing complete for user ${userId}, job ${id}`
      );
    } catch (error) {
      console.error(`Error processing video: ${error.message}`);
    }

    channel.ack(message);
  });
}

console.log("Consumer is running");

if (!fs.existsSync(VIDEOS_DIR)) {
  fs.mkdirSync(VIDEOS_DIR);
}

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR);
}

consumeFromQueue();
