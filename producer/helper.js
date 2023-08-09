const amqp = require("amqplib");

const CHUNK_SIZE = process.env.CHUNK_SIZE || 5;

// Function to generate random string
function generateRandomString(length) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function sendToQueue(userId, imageUrls) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  const queue = process.env.RABBITMQ_QUEUE_NAME;
  await channel.assertQueue(queue);

  const currentEpochMilliseconds = new Date().getTime();

  for (let i = 0; i < imageUrls.length; i += CHUNK_SIZE) {
    const chunk = imageUrls.slice(i, i + CHUNK_SIZE);

    const job = {
      userId,
      jobIdentifier: generateRandomString(10),
      imageUrls: chunk,
      id: currentEpochMilliseconds,
    };

    try {
        await channel.sendToQueue(queue, Buffer.from(JSON.stringify(job)));
    }
    catch (error) {
        console.log(error);
        res.json({ message: 'Error sending job to queue' });
    }

    console.log(`Sent job to queue: ${JSON.stringify(job)}`);

  }
  await channel.close();
  await connection.close();
}

module.exports = {
  sendToQueue,
  generateRandomString
};
