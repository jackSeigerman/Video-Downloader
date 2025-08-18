# Video Downloader <img src="assets/YoutubeDownloaderLogo.png" width="120px" alt="YoutubeDownloaderLogo" align="right">

![Static Badge](https://img.shields.io/badge/JavaScript-f7df1e) ![Static Badge](https://img.shields.io/badge/Electron-47848f) ![Static Badge](https://img.shields.io/badge/Node.js-339933)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern Electron desktop application for downloading YouTube videos in high quality using yt-dlp. Supports both MP4 video downloads and MP3 audio extraction with advanced features.

## Table of Contents

- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
- [Supported URL Formats](#supported-url-formats)
- [Technical Details](#technical-details)
- [Development](#development)
- [Building for Distribution](#building-for-distribution)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)



## Installation

### Windows
Download the setup file from the latest release:
[Video Downloader Setup Windows.exe](https://github.com/jackSeigerman/Video-Downloader/releases/download/v7.0/Video.Downloader.windows.exe)

### macOS
Download the DMG file from the latest release:
[Video Downloader MacOS(Silicon).dmg](https://github.com/jackSeigerman/Video-Downloader/releases/download/v7.0/Video.Downloader-MacOS.Silicon.dmg)

If you have an older Intel Mac, dowload the latest release:
[Video Downloader MacOS(Intel).dmg](https://github.com/jackSeigerman/Video-Downloader/releases/download/v7.0/Video.Downloader-MacOS.Intel.dmg)

### Development Installation

If you want to run from source:

1. Clone this repository:
```bash
git clone https://github.com/jackSeigerman/Video-Downloader.git
cd Video-Downloader
```

2. Install dependencies:
```bash
npm install
```

3. Run the application:
```bash
npm start
```

## Features

- **Highest Quality Downloads**: Always downloads the best available resolution (4K, 1080p, etc.)
- **Complete MP3 Metadata**: Automatically tags MP3s with title, artist, year, album artwork, and more
- **Adobe Premiere Pro Compatible**: Downloads use H.264 codec for optimal video editing compatibility
- **Cross-Platform**: Available for Windows and macOS
- **Custom Download Directory**: Choose where to save your files with persistent settings




## Usage

1. **Enter YouTube URL**: Paste any valid YouTube video URL into the input field
2. **Select Download Directory**: Click "Browse" to choose where to save the file (your preference is saved between sessions)
3. **Choose Format**: 
   - **MP4**: Downloads the highest quality video available (up to 4K) with H.264 codec for video editing compatibility
   - **MP3**: Extracts and converts audio to highest quality MP3 with complete metadata tagging
4. **Download**: Click the download button and wait for completion

The app automatically detects and downloads the highest quality streams available for each video, ensuring optimal quality while maintaining compatibility with video editing software.

### MP3 Metadata Features
When downloading as MP3, the app automatically adds:
- **Title, Artist, Album** from video information
- **Year** extracted from upload date
- **Album Artwork** from video thumbnail
- **Detailed Comments** with video description, URL, views, and duration
- **Professional Tags** compatible with all music players

See [MP3-METADATA.md](MP3-METADATA.md) for complete details.

## Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`

## Technical Details

### Dependencies

- **Electron**: Desktop application framework
- **yt-dlp-wrap**: YouTube video information and stream extraction
- **fluent-ffmpeg**: Video/audio processing and conversion
- **ffmpeg-static**: Static FFmpeg binary for media processing
- **node-id3**: MP3 metadata tagging
- **sharp**: Image processing for thumbnails

### Architecture

The application uses a modern architecture with:
- **Local Binaries**: Bundled yt-dlp and FFmpeg for reliable operation
- **H.264 Codec Priority**: Ensures compatibility with video editing software
- **Smart Format Selection**: Automatically chooses optimal video and audio streams
- **Cross-Platform Compatibility**: Works on Windows and macOS



## Development

To run in development mode with logging:
```bash
npm run dev
```

To run with full logging:
```bash
npm start
```

## Building for Distribution

To build the application for distribution:

```bash
npm run build
```

This creates platform-specific installers in the `dist/` directory.

## Troubleshooting

### Common Issues

1. **Download fails**: Ensure you have a stable internet connection and the YouTube URL is valid
2. **No download starts**: Check that yt-dlp binary is properly bundled with the application
3. **Audio missing from video**: Verify FFmpeg is working correctly for stream merging
4. **Permission errors**: Make sure you have write permissions to the selected download directory
5. **Video editing compatibility**: Downloads use H.264 codec specifically for Adobe Premiere Pro and DaVinci Resolve compatibility

### Getting Help

If you encounter issues:
1. Check the console for error messages (View → Toggle Developer Tools)
2. Ensure the download directory exists and is writable
3. Try restarting the application
4. Open an issue on GitHub with details about the problem and console output

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on both development and built versions
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for personal use only. Please respect YouTube's Terms of Service and copyright laws. Only download content that you have the right to download.
