// HTML structure
const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Splitter</title>
  </head>
  <body>
    <h1>Video Splitter</h1>
    <form id="uploadForm">
      <label for="video">Upload Video:</label>
      <input type="file" id="video" name="video" accept="video/*" required />
      <label for="divisions">Number of Divisions:</label>
      <input type="number" id="divisions" name="divisions" min="1" required />
      <button type="submit">Upload and Split</button>
    </form>
    <div id="status"></div>
  </body>
  </html>
`;

// Backend setup with Node.js and Express
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Serve the HTML
app.get('/', (req, res) => {
  res.send(html);
});

// Handle video upload and splitting
app.post('/upload', upload.single('video'), (req, res) => {
  const videoPath = req.file.path;
  const outputDir = path.join(__dirname, 'output');
  const numberOfDivisions = parseInt(req.body.divisions, 10);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Get video duration
  ffmpeg.ffprobe(videoPath, (err, metadata) => {
    if (err) {
      return res.status(500).send('Error processing video.');
    }

    const duration = metadata.format.duration;
    const segmentDuration = duration / numberOfDivisions;

    // Split video
    for (let i = 0; i < numberOfDivisions; i++) {
      const startTime = segmentDuration * i;
      const outputFileName = path.join(outputDir, `segment_${i + 1}.mp4`);

      ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(segmentDuration)
        .output(outputFileName)
        .on('end', () => {
          console.log(`Segment ${i + 1} created.`);
        })
        .on('error', (error) => {
          console.error(`Error creating segment ${i + 1}:`, error);
        })
        .run();
    }

    res.send('Video uploaded and processing started. Check the output directory.');
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
