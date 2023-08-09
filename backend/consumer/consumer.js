const fs = require("fs");
const path = require("path");
const amqp = require("amqplib");
const dotenv = require("dotenv");

const { generateVideo, downloadImages, deleteFiles, combineVideos, uploadFileToS3 } = require("./helper");

// Load env vars
dotenv.config();

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const VIDEOS_DIR = path.join(__dirname, "./videos");
const IMAGES_DIR = path.join(__dirname, "./images");

let jobsStatus = {};

async function consumeFromQueue() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  const queue = process.env.RABBITMQ_QUEUE_NAME;
  await channel.assertQueue(queue);

  channel.consume(queue, async (message) => {
    const job = JSON.parse(message.content.toString());

    try {
      const { userId, jobIdentifier, imageUrls, id, jobOrder, totalJobs } = job;
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

      const videosJobDir = path.join(videosUserJobIdDir, jobIdentifier);
      if (!fs.existsSync(videosJobDir)) {
        fs.mkdirSync(videosJobDir);
      }
      
      if (id in jobsStatus) {
        jobsStatus[id][jobIdentifier] = {
          jobOrder: jobOrder,
          status: 0
        }
      }
      else {
        jobsStatus[id] = {}
        jobsStatus[id][jobIdentifier] = {
          jobOrder: jobOrder,
          status: 0
        }
      }

      // Create image directories
      const imagesJobDir = path.join(imagesUserBase, jobIdentifier);
      if (!fs.existsSync(imagesJobDir)) {
        fs.mkdirSync(imagesJobDir);
      }

      // Download images
      const imagePaths = await downloadImages(imageUrls, imagesJobDir);

      const videoPath = await generateVideo(imagesJobDir, videosJobDir);

      // Delete images
      deleteFiles(...imagePaths);
      fs.rmdirSync(imagesJobDir);

      // Update job status
      jobsStatus[id][jobIdentifier].status = 1

      // Check if all jobs are complete
      let allJobsComplete = true
      for (const jobIdentifier in jobsStatus[id]) {
        if (jobsStatus[id][jobIdentifier].status == 0) {
          allJobsComplete = false
          break
        }
      }

      if (allJobsComplete) {
        console.log(`All jobs complete for user ${userId}, job ${id}`)
        // Generate video paths according to job order
        const videoPaths = []
        for (let i = 0; i < totalJobs; i++) {
          for (const jobIdentifier in jobsStatus[id]) {
            if (jobsStatus[id][jobIdentifier].jobOrder == i) {
              videoPaths.push(path.join(videosUserJobIdDir, jobIdentifier, 'output.mp4'))
            }
          }
        }

        //create input.txt with video paths
        const inputFilePath = path.join(videosUserJobIdDir, 'input.txt')
        fs.writeFileSync(inputFilePath, videoPaths.map(videoPath => `file '${videoPath}'`).join('\n'))

        // Combine videos
        const outputVideoPath = path.join(videosUserJobIdDir, 'output.mp4')
        await combineVideos(inputFilePath, outputVideoPath)
        console.log(`Video combined for user ${userId}, job ${id}`)
        deleteFiles(inputFilePath, ...videoPaths)

        // Upload video to S3
        const s3VideoPath = `${userId}/${id}/output.mp4`
        await uploadFileToS3(outputVideoPath, s3VideoPath, BUCKET_NAME)
        // Delete job from jobsStatus
        delete jobsStatus[id]
      }
      console.log(
        `Video processing complete for user ${userId}, job ${id}`
      );

    } catch (error) {
      console.error(`Error processing video: ${error.message}`);
    }
    finally {
      channel.ack(message);
    }

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
