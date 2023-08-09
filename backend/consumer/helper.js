const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});


const s3 = new AWS.S3();

// Function to upload file to S3
function uploadFileToS3(sourceFilePath, destFilePath, bucketName) {
  const params = {
    Bucket: bucketName,
    Key: destFilePath,
    Body: fs.createReadStream(sourceFilePath)
  };

  try {
    const data = s3.upload(params).promise();
    console.log(data.Location)
    return data;
  }
  catch (error) {
    console.log(error);
  }
}

// Function to download images from URLs
async function downloadImages(imageUrls, downloadPath) {
  try {
    const promises = imageUrls.map(async (url, index) => {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const imagePath = path.join(downloadPath, `image_${index}.jpg`);
      fs.writeFileSync(imagePath, response.data);
      return imagePath;
    });

    return await Promise.all(promises);
  } catch (error) {
    throw new Error(`Error downloading images: ${error.message}`);
  }
}

// Function to generate video from images
function generateVideo(imagesPathBase, videoPath) {
  return new Promise((resolve, reject) => {
    let cmd = `ffmpeg -r 1 -s 1920x1080 -i "${imagesPathBase}/image_%d.jpg" ${videoPath}/output.mp4`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error generating video: ${error.message}`));
      } else {
        resolve(videoPath);
      }
    });
  });
}

function combineVideos(videoInputTxtPath, outputVideoPath) {
  return new Promise((resolve, reject) => {
    let cmd = `ffmpeg -f concat -safe 0 -i ${videoInputTxtPath} -c copy ${outputVideoPath}`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error combining videos: ${error.message}`));
      } else {
        resolve(outputVideoPath);
      }
    }
    );
  });
}

// Function to delete files
function deleteFiles(...filePaths) {
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

module.exports = {
    generateVideo,
    downloadImages,
    deleteFiles,
    combineVideos,
    uploadFileToS3
}