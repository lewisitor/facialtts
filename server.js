import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import avatarRoutes from './public/routes/avatar.js';
import https from 'https';
import fs from 'fs';

dotenv.config();

const app = express();

// Set up __dirname for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads'); // Points to Project/uploads

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));
// Serve uploaded files from the "uploads" folder for direct access
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads', express.static(UPLOADS_ROOT));

// Serve the index.html file
app.get('/did-demo', (req, res) => {
  res.sendFile(path.join(__dirname, './public/did-demo.html'));
});

app.use('/images', express.static('uploads/images'));
app.use('/audio', express.static('uploads/audio'));
app.use('/videos', express.static('uploads/videos'));

// Delegate avatar-related endpoints to avatarRoutes (all endpoints prefixed with /api/avatar)
app.use('/api/avatar', avatarRoutes);

// --- Endpoint to list contents of the uploads folder ---
app.get('/api/uploads', (req, res) => {
    const uploadsPath = path.join(__dirname, 'uploads');
    fs.readdir(uploadsPath, (err, files) => {
        if (err) {
            console.error('Error reading uploads directory:', err);
            return res.status(500).json({ error: 'Failed to read uploads directory' });
        }
        res.json({ files });
    });
});

const HTTP_PORT = process.env.PORT || 5200;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443; // You can define a separate port for HTTPS

// --- HTTPS Configuration ---
const privateKeyPath = 'server.key'; // Path to your private key file
const certificatePath = 'server.crt'; // Path to your certificate file

let httpsServer;

// Check if the key and certificate files exist
if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath)) {
    const privateKey = fs.readFileSync(privateKeyPath);
    const certificate = fs.readFileSync(certificatePath);
    const credentials = { key: privateKey, cert: certificate };

    httpsServer = https.createServer(credentials, app);

    httpsServer.listen(HTTPS_PORT, () =>
        console.log(`HTTPS server running on port ${HTTPS_PORT}`)
    );

    // Optionally, you can still run the HTTP server on a different port
    app.listen(HTTP_PORT, () =>
        console.log(`HTTP server running on port ${HTTP_PORT}`)
    );
} else {
    console.warn(
        'HTTPS not enabled. Missing server.key or server.crt files. ' +
        'Please generate them using OpenSSL or a tool like mkcert.'
    );
    // If HTTPS is not configured, start the HTTP server as before
    app.listen(HTTP_PORT, () =>
        console.log(`HTTP server running on port ${HTTP_PORT}`)
    );
}