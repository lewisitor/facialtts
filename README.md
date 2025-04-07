Avatar Studio By Lewis Itor

![Homepage](https://lewisconcepts.xyz/uploads/images/forgithub/1.jpeg)
![Demo Gallery](https://lewisconcepts.xyz/uploads/images/forgithub/gallery-demo.jpeg)

![Avatar Studio Interface]

A complete solution for generating realistic talking avatars with your choice of Wav2Lip (local processing) or D-ID (cloud API).

✨ Features

- Dual Generation Engines
  - 🚀 Wav2Lip for fast local processing
  - ✨ D-ID for studio-quality results
- Real-time progress tracking
- Cross-platform compatibility
- Voice customization (pitch/speed control)
- Web-based interface

🛠 Installation

Prerequisites

- Node.js 18+
- Python 3.8+
- FFmpeg
- GPU (Recommended for Wav2Lip)

Place the Model Check file wav2lip in your root folder, you can download from here: https://drive.google.com/file/d/1C6mr4VypvMWQvwyv06RhBcUW1ax0aapw/view?usp=sharing
```bash
# Clone the repository
git clone https://github.com/lewisitor/facialtts.git
cd avatar

# Install backend dependencies
npm install

# Install Python requirements
pip install -r requirements.txt
```

⚙ Configuration

1. Create `.env` file in root directory:

```ini
# D-ID Configuration
D_ID_API_KEY=your_d-id_api_key_here
D_ID_API_ENDPOINT=https://api.d-id.com/talks

# Wav2Lip Configuration
WAV2LIP_CHECKPOINT=./Wav2Lip.pth # you will need to download the checkpoint file if you want to use Wav2Lip

# Google TTS
Google_TTS_API_KEY=your_google_cloud_key

# Python
PYTHON_PATH=./Wav2Lip/env/env/bin/python

# File Directory Structure
FILE_DIR_PATH=your_directory_path
YOUR_SERVER_URL=your_server_url


```

🚀 Usage

```bash
# Start development server - you can use nodemon server.js
npm run dev

# Production build
npm run build
npm start
```

Access the web interface at: `http://localhost:5200`

For cloud deployment you will need to create your own server.crt, server.csr, server.key for your public and private SSL certificate

📚 API Endpoints

Generate Video
`POST /api/generate`
```json
{
  "avatar": "uploads/images/image.jpg",
  "audio": "uploads/audio/audio.mp3",
  "provider": "wav2lip|did"
}
```

Response:
```json
{
  "success": true,
  "videoUrl": "uploads/videos/video.mp4",
  "metadata": {
    "provider": "wav2lip",
    "processingTime": "45s"
  }
}
```

A cache is needed to process the video, this is a requirement from DID
I enabled Localstorage to act as a cache, you can also use Redis. 


📊 Provider Comparison

| Feature               | Wav2Lip              | D-ID                 |
|-----------------------|----------------------|----------------------|
| Processing Location   | Local                | Cloud                |
| Speed                 | Fast                 | Moderate             |
| Quality               | Low                  | Excellent            |
| Cost                  | Free                 | API Credits          |
| Requirements          | GPU Recommended      | API Key              |

🚨 Troubleshooting

Common Issues:

1. FFmpeg not found
   ```bash
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # MacOS
   brew install ffmpeg
   ```

2. Python dependencies error
   ```bash
   pip install --upgrade -r requirements.txt
   ```

3. D-ID API errors
   - Verify your API key
   - Check account quota
   - Ensure image meets [D-ID requirements](https://docs.d-id.com)

🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

📜 License

Distributed under the MIT License. See `LICENSE` for more information.

📧 Contact

Lewis Itor - [@Lewis_Itor](https://x.com/lewis_itor) - itorlewis@gmail.com

Project Link: [https://github.com/yourusername/avatar-studio-pro](https://github.com/lewisitor/facialtts)


To use this README:

1. Copy the entire content above
2. Paste into your `README.md` file
3. Make these replacements:
   - `yourusername` → Your GitHub username
   - `your_d-id_api_key_here` → Your actual D-ID API key
   - `your_google_cloud_key` → Your Google Cloud TTS key
   - Update contact information
4. Add these files to your project:
   - `demo-screenshot.png` (Screenshot of your interface)
   - `LICENSE` (MIT License file)

The README includes:
- Badges for version tracking
- Clear installation instructions
- Configuration guide
- API documentation
- Visual comparison table
- Troubleshooting solutions
- Contribution guidelines


