const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');


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
    let cmd;
    if (!fs.existsSync(`${videoPath}/output.mp4`)) {
      cmd = `ffmpeg -r 1 -s 1920x1080 -i "${imagesPathBase}/image_%d.jpg" ${videoPath}/output.mp4`;
      console.log("Video not found, generating new one")
    }
    else {
      cmd = `ffmpeg -i ${videoPath}/output.mp4 -f image2 -r 1 -i "${imagesPathBase}/image_%d.jpg" -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0 [v]" -map "[v]" ${videoPath}/output.mp4`;
      console.log("Video found, updating")
    }

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error generating video: ${error.message}`));
      } else {
        resolve(videoPath);
      }
    });
  });
}

// Function to delete files
function deleteFiles(...filePaths) {
    console.log(filePaths)
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

module.exports = {
    generateVideo,
    downloadImages,
    deleteFiles
}