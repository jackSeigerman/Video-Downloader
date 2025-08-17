# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Could not extract functions" Error

This error typically occurs when the YouTube library can't properly parse YouTube's page structure.

**Solutions:**
- ✅ **Updated to `@distube/ytdl-core`** - This app now uses a more reliable YouTube downloader library
- Restart the application
- Check your internet connection
- Try a different YouTube URL

### 2. Download Failures

**Possible Causes:**
- Network connectivity issues
- YouTube restrictions on specific videos
- Invalid or private YouTube URLs
- Insufficient disk space

**Solutions:**
- Ensure stable internet connection
- Try public YouTube videos (not private or restricted)
- Check available disk space in download directory
- Verify the YouTube URL is correct and accessible

### 3. "No video+audio formats available"

Some YouTube videos may not have combined video+audio streams.

**Solutions:**
- Try downloading as MP3 (audio only) instead
- Use "lowest quality" option which may have combined streams
- Some videos may require separate audio/video download (not supported in current version)

### 4. MP3 Conversion Fails

**Possible Causes:**
- FFmpeg issues
- Corrupted audio stream
- Insufficient system resources

**Solutions:**
- Restart the application
- Try downloading as MP4 instead
- Close other resource-intensive applications

### 5. Permission Errors

**Solutions:**
- Ensure write permissions to selected download directory
- Try selecting a different download location (like Desktop or Documents)
- Run the application as administrator (if needed)

### 6. App Won't Start

**Solutions:**
- Ensure all dependencies are installed: `npm install`
- Check Node.js version (requires Node.js 14+)
- Try deleting `node_modules` folder and running `npm install` again

## Getting Additional Help

1. **Check Console Logs:**
   - Open Developer Tools (Ctrl+Shift+I)
   - Check Console tab for error messages

2. **Test with Simple Videos:**
   - Try downloading a short, public YouTube video first
   - Avoid live streams, premieres, or restricted content

3. **System Requirements:**
   - Windows 10/11
   - Node.js 14 or later
   - Stable internet connection
   - At least 100MB free disk space

## Reporting Issues

If problems persist, please provide:
- YouTube URL that's causing issues
- Error message (exact text)
- Your operating system
- Console log errors (if any)

## Advanced Troubleshooting

### Manual Dependency Check
```bash
npm list
```

### Reinstall Dependencies
```bash
npm install --force
```

### Clear NPM Cache
```bash
npm cache clean --force
```

### Debug Mode
Run with logging enabled:
```bash
npm run dev
```
