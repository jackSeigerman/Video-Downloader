# Youtube-Downloader <img src="assets/YoutubeDownloaderLogo.png" width="120px" alt="YoutubeDownloaderLogo" align="right">

# YouTube Video Downloader

![Static Badge](https://img.shields.io/badge/JavaScript-f7df1e) ![Static Badge](https://img.shields.io/badge/Electron-47848f) ![Static Badge](https://img.shields.io/badge/Node.js-339933)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern Electron desktop application for downloading YouTube videos in high quality. Supports both MP4 video downloads and MP3 audio extraction.

## Features

- 🎥 **Highest Quality Downloads**: Always downloads the best available resolution (4K, 1080p, etc.)
- 🎵 **Premium Audio Extraction**: Convert videos to MP3 format with 320kbps bitrate
- 🏷️ **Complete MP3 Metadata**: Automatically tags MP3s with title, artist, year, album artwork, and more
- 📁 **Custom Download Directory**: Choose where to save your files
- 🖥️ **User-Friendly Interface**: Clean, modern design with real-time video information
- ⚡ **Smart Quality Detection**: Automatically selects the highest quality video and audio streams
- 🔒 **Safe & Secure**: No data collection, everything runs locally
- 🔄 **Advanced Merging**: Uses FFmpeg to merge separate high-quality video and audio streams
- 🎨 **Album Artwork**: Embeds video thumbnails as album art in MP3 files

## Installation

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

## Usage

1. **Enter YouTube URL**: Paste any valid YouTube video URL into the input field
2. **Select Download Directory**: Click "Browse" to choose where to save the file
3. **Choose Format**: 
   - **MP4**: Downloads the highest quality video available (4K, 1080p, etc.)
   - **MP3**: Extracts and converts audio to highest quality MP3 with complete metadata tagging
4. **Download**: Click the download button and wait for completion

The app automatically detects and downloads the highest quality streams available for each video.

### 🏷️ **MP3 Metadata Features**
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
- **ytdl-core**: YouTube video information and stream extraction
- **fluent-ffmpeg**: Video/audio processing and conversion
- **ffmpeg-static**: Static FFmpeg binary for media processing

### File Structure

```
Video-Downloader/
├── main.js          # Main Electron process
├── index.html       # Application UI
├── renderer.js      # Frontend logic and IPC communication
├── package.json     # Dependencies and scripts
└── assets/          # Application icons and images
```

## Development

To run in development mode with logging:
```bash
npm run dev
```

## Building for Distribution

To build the application for distribution, you'll need to install electron-builder:
```bash
npm install electron-builder --save-dev
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is for personal use only. Please respect YouTube's Terms of Service and copyright laws. Only download content that you have the right to download.

## Troubleshooting

### Common Issues

1. **Download fails**: Ensure you have a stable internet connection and the YouTube URL is valid
2. **MP3 conversion issues**: The app uses FFmpeg for conversion; ensure all dependencies are properly installed
3. **Permission errors**: Make sure you have write permissions to the selected download directory

### Getting Help

If you encounter issues:
1. Check the console for error messages (View → Toggle Developer Tools)
2. Ensure all dependencies are installed (`npm install`)
3. Try restarting the application
4. Open an issue on GitHub with details about the problem


A program to download videos from YouTube as an Mp4 or Mp3. You can change the directory that the video or audio downloads to. 

![Canvas](assets/YoutubeDownloader.gif)

## Table of contents
- [Features](#features)
- [Installation](#installation)
- [User Guide](#user-guide)
- [License](#license)

## Features

### Directory saving
This Youtube Downloader saves your download directory prefrence through sessions, so you dont have to remeber to set the directory you want to download to each time you open the downloader.

![Canvas](assets/YoutubeDownloaderDirectory.gif)

### Compatibilty with Premiere pro and Davinci Resolve
Many downloaders have issues with the codec used in refrence to Adobe Premiere pro and Davinci Resolve. This downloader downloads videos as Mp4's in a codec that both Premiere and Davinci Resolve supports.

![Canvas](assets/Downloading.gif)

### Mp4 and Mp3 Downloadabilty
Download any video on Youtube as either a video or just an audio. Both are the highest quality available for the video in question with no compromises. 

![Canvas](assets/Gallery.gif)

## Installation

*READ ENTIRELY BEFORE BEGGINING ANY STEPS*

---

### *Windows*

1. A JDK of at least version 23 is needed to run either the jar or exe. click the [Download](https://download.oracle.com/java/23/latest/jdk-23_windows-x64_bin.exe) button to download the JDK if you dont already have it.

2. If you just downloaded the jdk exe listed above, run the exe and follow the instructions, it should only take a few seconds

3. On the right side of the page there is a "[Releases](https://github.com/jackSeigerman/YouTube-Downloader/releases)" tab, click it and then click "[Windows release](https://github.com/jackSeigerman/YouTube-Downloader/releases/tag/v1.0.3)" *(or just click the Windows release button)*

4. Download the two exe files at the bottom of the square. They should be called "Youtube Downloader.exe" and "yt-dlp.exe" 

5. Once downloaded, place both exe files into a folder somewhere on your computer, the location does not matter as long as you can recall where you placed it, you can also name this folder whatever you want

6. Important note: Sometimes on windows, FFmpeg doesnt act right. You may need to [follow this quick guide](https://phoenixnap.com/kb/ffmpeg-windows) to have it function properly. 

---

### *MacOS*

1. A JDK of at least version 23 is needed to run the jar. click the [Download](https://download.oracle.com/java/23/latest/jdk-23_macos-aarch64_bin.dmg) button to download the JDK if you dont already have it.

2. If you just downloaded the jdk dmg listed above, run the dmg and follow the instructions, it should only take a few seconds

3. On the right side of the page there is a "[Releases](https://github.com/jackSeigerman/YouTube-Downloader/releases)" tab, click it and then click "[MacOS release](https://github.com/jackSeigerman/YouTube-Downloader/releases/tag/v1.0.1)" *(or just click the MacOs release button)*

6. Download the jar file and the yt-dlp file at the bottom of the square. They should be called "Youtube Downloader Mac.jar" and "yt-dlp" 

7. Once downloaded, place both the jar and yt-dlp file into a folder somewhere on your computer, the location does not matter as long as you can recall where you placed it, you can also name this folder whatever you want


---

### Linux

1. A JDK of at least version 23 is needed to run the jar. click the [Download](https://download.oracle.com/java/23/latest/jdk-23_linux-x64_bin.deb) button to download the JDK if you dont already have it.

2. If you just downloaded the jdk deb listed above, run the deb and follow the instructions, it should only take a few seconds (yes you can also curl or wget it if you know what that means)

3. On the right side of the page there is a "[Releases](https://github.com/jackSeigerman/YouTube-Downloader/releases)" tab, click it and then click "[Linux release](https://github.com/jackSeigerman/YouTube-Downloader/releases/tag/v1.0.0)" *(or just click the Linux release button)*

6. Download the jar file and the yt-dlp file at the bottom of the square. They should be called "Youtube Downloader.jar" and "yt-dlp" 

7. Once downloaded, place both the jar and yt-dlp file into a directory somewhere on your computer, the location does not matter as long as you can recall where you placed it, you can also name this directory whatever you want

---

>Likewise, you can download the entire repository and run the Exe or Jar from the build folder


## User Guide

Insert a Youtube link  in **youtube video URL** to set the video you want to download

![Canvas](assets/Gallery.JPG)

Click the **MP4** dropdown to switch between Mp4 and Mp3

![Canvas](assets/GenerateImage.JPG)

Click **Download** to download the selected video as the selected format

![Canvas](assets/Download.JPG)


## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE) file for details
