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
    <form id="uploadForm" enctype="multipart/form-data" method="post" action="/upload">
      <label for="video">Upload Video:</label>
      <input type="file" id="video" name="video" accept="video/*" required />
      <label for="divisions">Number of Divisions:</label>
      <input type="number" id="divisions" name="divisions" min="1" required />
      <button type="submit">Upload and Split</button>
    </form>
    <div id="status"></div>
    <div id="downloads"></div>
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
  const downloadLinks = [];

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

    let completed = 0;

    // Split video
    for (let i = 0; i < numberOfDivisions; i++) {
      const startTime = segmentDuration * i;
      const outputFileName = `segment_${i + 1}.mp4`;
      const outputPath = path.join(outputDir, outputFileName);

      ffmpeg(videoPath)
        .setStartTime(startTime)
        .setDuration(segmentDuration)
        .output(outputPath)
        .on('end', () => {
          downloadLinks.push(`<a href="/download/${outputFileName}" download>${outputFileName}</a>`);
          completed++;
          if (completed === numberOfDivisions) {
            res.send(`Video uploaded and processed. Download your segments below:<br>${downloadLinks.join('<br>')}`);
          }
        })
        .on('error', (error) => {
          console.error(`Error creating segment ${i + 1}:`, error);
        })
        .run();
    }
  });
});

// Serve output files for download
app.get('/download/:file', (req, res) => {
  const file = req.params.file;
  const filePath = path.join(__dirname, 'output', file);
  res.download(filePath, (err) => {
    if (err) {
      console.error(`Error sending file: ${err}`);
      res.status(500).send('Error downloading file.');
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
