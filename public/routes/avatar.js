import express from 'express';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import multer from 'multer';
import { Buffer } from 'buffer';

dotenv.config();

const router = express.Router();
const D_ID_API_KEY = process.env.D_ID_API_KEY;
const SERVER_URL = process.env.YOUR_SERVER_URL || 'https://lewisconcepts.xyz';
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

// Validate environment variables
if (!D_ID_API_KEY) throw new Error('D_ID_API_KEY environment variable is required');

// In-memory job store (for production, consider using a persistent store)
const jobStore = {};

// Create upload directories
const createDirectories = () => {
  ['images', 'audio', 'videos'].forEach(dir => {
    const fullPath = path.join(UPLOADS_ROOT, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
  });
};
createDirectories();

// Multer storage configurations
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOADS_ROOT, 'images')),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOADS_ROOT, 'audio')),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper: Resolve local file path from URL
const resolveLocalPath = (url) => {
  try {
    const parsedUrl = new URL(url);
    const validPaths = ['/uploads/images/', '/uploads/audio/', '/uploads/videos/'];
    if (!validPaths.some(p => parsedUrl.pathname.startsWith(p))) {
      throw new Error('Invalid resource path');
    }
    const relativePath = parsedUrl.pathname.replace('/uploads/', '').split('/').filter(Boolean).join(path.sep);
    const fullPath = path.join(UPLOADS_ROOT, relativePath);
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(UPLOADS_ROOT)) {
      throw new Error(`Potential directory traversal attempt: ${normalizedPath}`);
    }
    return normalizedPath;
  } catch (error) {
    throw new Error(`Invalid URL format: ${url} - ${error.message}`);
  }
};

// D-ID Integration without extra config property
async function handleDIDGeneration(avatarPath, audioPath) {
  try {
    const avatarUrl = `${SERVER_URL}/uploads/images/${path.basename(avatarPath)}`;
    const audioUrl = `${SERVER_URL}/uploads/audio/${path.basename(audioPath)}`;
    console.log('Initiating D-ID generation with:', { avatarUrl, audioUrl });

    const response = await axios.post(
      'https://api.d-id.com/talks',
      {
        source_url: avatarUrl,
        script: {
          type: "audio",
          audio_url: audioUrl
        }
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${D_ID_API_KEY}:`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let status = response.data.status;
    const talkId = response.data.id;
    let result = response.data;
    const startTime = Date.now();

    while (status !== 'completed' && status !== 'done' && Date.now() - startTime < 120000) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await axios.get(`https://api.d-id.com/talks/${talkId}`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${D_ID_API_KEY}:`).toString('base64')}`
        }
      });
      status = statusResponse.data.status;
      result = statusResponse.data;
      if (status === 'failed') break;
    }
    if (status !== 'completed' && status !== 'done') {
      throw new Error(`D-ID processing failed. Final status: ${status}`);
    }
    return {
      videoUrl: result.result_url,
      metadata: { provider: 'D-ID', processingTime: result.created_at }
    };
  } catch (error) {
    console.error('D-ID API Error:', error.message);
    throw new Error(`D-ID generation failed: ${error.message}`);
  }
}

// Wav2Lip Integration
async function handleWav2LipGeneration(avatarPath, audioPath) {
  return new Promise((resolve, reject) => {
    const outputFilename = `output-${Date.now()}.mp4`;
    const outputPath = path.join(UPLOADS_ROOT, 'videos', outputFilename);
    const command = [
      'python Wav2Lip/inference.py',
      `--face "${avatarPath}"`,
      `--audio "${audioPath}"`,
      `--outfile "${outputPath}"`,
      '--resize_factor 1',
      '--pads 0 20 0 0'
    ].join(' ');
    exec(command, { timeout: 300000 }, (error) => {
      if (error) return reject(new Error(`Wav2Lip failed: ${error.message}`));
      if (!fs.existsSync(outputPath)) {
        return reject(new Error('Wav2Lip output missing'));
      }
      resolve({
        videoUrl: `${SERVER_URL}/uploads/videos/${outputFilename}`,
        metadata: { provider: 'Wav2Lip', processingTime: 'N/A' }
      });
    });
  });
}

// Avatar list endpoint
router.get('/list', (req, res) => {
  try {
    const imagesDir = path.join(UPLOADS_ROOT, 'images');
    if (!fs.existsSync(imagesDir)) return res.status(200).json({ avatars: [] });
    fs.readdir(imagesDir, (err, files) => {
      if (err) {
        console.error('Error reading avatars directory:', err);
        return res.status(500).json({ error: 'Failed to read avatars' });
      }
      const avatars = files
        .filter(file => !file.startsWith('.') && /\.(jpg|jpeg|png)$/i.test(file))
        .map(file => `${SERVER_URL}/uploads/images/${file}`);
      res.json({ avatars });
    });
  } catch (error) {
    console.error('Avatar list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TTS Endpoint with pre-save re-encoding
router.post('/tts', async (req, res) => {
  try {
    const { text, voiceGender = 'FEMALE' } = req.body;
    const validGenders = ['FEMALE', 'MALE'];
    if (!text || text.length > 1000) {
      return res.status(400).json({ error: 'Invalid text length (1-1000 characters required)' });
    }
    if (!validGenders.includes(voiceGender)) {
      return res.status(400).json({ error: 'Invalid voice gender specified' });
    }
    // Request Google TTS
    const response = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.Google_TTS_API_KEY}`,
      {
        input: { text },
        voice: { languageCode: 'en-US', ssmlGender: voiceGender },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: voiceGender === 'MALE' ? -2.0 : 0.0
        }
      }
    );
    const audioContent = response.data.audioContent;
    const audioBuffer = Buffer.from(audioContent, 'base64');
    const filename = `tts-${Date.now()}.mp3`;
    const filePath = path.join(UPLOADS_ROOT, 'audio', filename);
    const tempFilePath = filePath + '.tmp';
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    // Save temporary file
    await fs.promises.writeFile(tempFilePath, audioBuffer);
    // Re-encode with ffmpeg and save to final file
    const ffmpegCommand = `ffmpeg -y -i "${tempFilePath}" -acodec libmp3lame -ab 192k -ar 44100 "${filePath}"`;
    await new Promise((resolve, reject) => {
      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg error:', error);
          return reject(new Error('Audio re-encoding failed'));
        }
        resolve();
      });
    });
    // Remove temporary file
    await fs.promises.unlink(tempFilePath);
    res.json({ success: true, audioUrl: `${SERVER_URL}/uploads/audio/${filename}` });
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ success: false, error: 'TTS generation failed', details: error.message });
  }
});

// File Upload Endpoints
router.post('/upload/avatar', uploadImage.single('avatar'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No avatar image uploaded' });
    res.json({ success: true, imageUrl: `${SERVER_URL}/uploads/images/${req.file.filename}` });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

router.post('/upload/audio', uploadAudio.single('audio'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
    res.json({ success: true, audioUrl: `${SERVER_URL}/uploads/audio/${req.file.filename}` });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ error: 'Audio upload failed' });
  }
});

// Video Generation Endpoint (asynchronous job processing)
router.post('/generate', async (req, res) => {
  try {
    const { imageUrl, audioUrl, method } = req.body;
    if (!imageUrl || !audioUrl || !method) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    // Create a jobId and store initial status
    const jobId = `job_${Date.now()}`;
    jobStore[jobId] = { status: 'queued', videoUrl: null };
    // Respond immediately with the jobId
    res.json({ success: true, jobId });
    // Process video generation asynchronously
    (async () => {
      try {
        const avatarPath = resolveLocalPath(imageUrl);
        const audioPath = resolveLocalPath(audioUrl);
        let result;
        if (method.toLowerCase() === 'did') {
          result = await handleDIDGeneration(avatarPath, audioPath);
        } else if (method.toLowerCase() === 'wav2lip') {
          result = await handleWav2LipGeneration(avatarPath, audioPath);
        } else {
          throw new Error('Invalid generation method');
        }
        jobStore[jobId] = { status: 'completed', videoUrl: result.videoUrl, metadata: result.metadata };
      } catch (error) {
        jobStore[jobId] = { status: 'failed', error: error.message };
      }
    })();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Status Endpoint for polling job status
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobStore[jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});


// Delete Avatar Endpoint
router.post('/delete', async (req, res) => {
  try {
    const { avatarPath } = req.body;
    if (!avatarPath) return res.status(400).json({ error: 'Avatar path is required' });
    const localPath = resolveLocalPath(avatarPath);
    if (!fs.existsSync(localPath)) return res.status(404).json({ error: 'Avatar not found' });
    fs.unlinkSync(localPath);
    res.json({ success: true });
  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

export default router;
