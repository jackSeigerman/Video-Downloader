# MP3 Metadata Tagging Features

This YouTube downloader adds comprehensive metadata to MP3 files downloaded from YouTube videos.

## 🏷️ **Metadata Tags Added**

### Basic Information
- **Title** - Video title from YouTube
- **Artist** - Channel/creator name
- **Album** - "YouTube - [Channel Name]"
- **Genre** - "YouTube"
- **Year** - Extracted from video upload/publish date
- **Track Number** - Set to "1/1"
- **Disc Number** - Set to "1/1"

### Advanced Tags
- **Album Artist** - Channel/creator name
- **Performer Info** - Channel/creator name
- **Original Filename** - Video title
- **Subtitle** - "YouTube Download"
- **Language** - "eng" (English)
- **Media Type** - "DIG" (Digital)
- **Publisher** - "YouTube"
- **Copyright** - "© [Channel Name]"
- **Encoded By** - "YouTube Video Downloader"
- **Software** - "YouTube Video Downloader v1.0"

### Detailed Comment Field
The comment includes:
- Video description (first 200 characters)
- Source URL
- Channel name
- View count
- Video duration
- Download timestamp

### Album Artwork
- **Thumbnail** - Highest quality video thumbnail available
- **Format** - JPEG
- **Type** - Front cover
- **Description** - "Album Cover"

### Custom Tags
- **Source URL** - Direct link to the YouTube video (WXXX frame)

## 📊 **Data Sources**

### From YouTube Video Info:
- `videoDetails.title` → Title
- `videoDetails.author.name` → Artist/Album Artist
- `videoDetails.publishDate` or `videoDetails.uploadDate` → Year
- `videoDetails.description` → Comment (partial)
- `videoDetails.viewCount` → Comment
- `videoDetails.lengthSeconds` → Comment
- `videoDetails.thumbnails` → Album artwork
- `videoDetails.video_url` → Source URL

### Generated Data:
- Album name format: "YouTube - [Channel Name]"
- Track/Disc numbers: Always "1/1"
- Genre: Always "YouTube"
- Media type: Always "DIG" (Digital)
- Software info: App name and version

## 🎨 **Album Artwork Process**

1. **Quality Selection**: Finds the highest resolution thumbnail available
2. **Download**: Downloads thumbnail as temporary JPEG file
3. **Embedding**: Embeds thumbnail as front cover album art
4. **Cleanup**: Removes temporary thumbnail file after processing

## 🔧 **Technical Implementation**

### Libraries Used:
- **node-id3** - MP3 metadata writing
- **axios** - Thumbnail downloading
- **fluent-ffmpeg** - Audio conversion with metadata preservation

### Process Flow:
1. Extract video information from YouTube
2. Download highest quality audio stream
3. Download video thumbnail in parallel
4. Convert audio to MP3 (320kbps)
5. Extract and format metadata
6. Write all metadata tags to MP3 file
7. Embed album artwork
8. Clean up temporary files

## 📱 **User Experience**

### Progress Indicators:
- 0-5%: Downloading thumbnail
- 5-85%: Converting to MP3
- 85-90%: Adding metadata tags
- 90-100%: Finalizing file

### Success Message Shows:
- Confirmation of successful download
- Title, Artist, Year extracted
- Whether album artwork was included
- Final file location

## 🎵 **Example Metadata Output**

For a video titled "Amazing Song" by "Great Artist":

```
Title: Amazing Song
Artist: Great Artist
Album: YouTube - Great Artist
Year: 2023
Genre: YouTube
Track: 1/1
Album Artist: Great Artist
Publisher: YouTube
Encoded By: YouTube Video Downloader
Comment: Amazing song description...
         Downloaded from: https://youtube.com/watch?v=...
         Channel: Great Artist
         Views: 1,234,567
         Duration: 3:45
```

Plus embedded album artwork from the video thumbnail.

## 🛠️ **Customization Options**

The metadata extraction can be easily customized by modifying the `extractMetadata()` function in `main.js`. You can:

- Change album naming convention
- Modify comment format
- Add additional custom tags
- Adjust year extraction logic
- Customize genre classification

## 📁 **File Compatibility**

The generated MP3 files with metadata are compatible with:
- Windows Media Player
- iTunes/Apple Music
- Spotify (local files)
- VLC Media Player
- foobar2000
- Most music players and devices
