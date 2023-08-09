# Use an official Node.js runtime as the base image
FROM node:14

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Nodemon for dev
RUN npm install -g nodemon

ADD ./api /app/api
ADD ./producer /app/producer
ADD ./consumer /app/consumer

CMD ["/bin/bash"]
