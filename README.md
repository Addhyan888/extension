# YouTube Transcript Summarizer Launcher

A Chrome extension that extracts YouTube video transcripts and helps you summarize them using your preferred AI platform (ChatGPT, Gemini, or Claude).

## Features

### Transcript Sidebar

https://github.com/user-attachments/assets/f5e12dba-6eef-4fcd-97bf-37833186c65d


- Automatically extracts and displays the transcript of the current YouTube video in a sidebar
- Collapsible interface that doesn't interfere with your YouTube viewing experience

### Summarize Button
- Adds a "Summarize" button near the YouTube video player
- On first use, shows a settings popup to configure your preferences
- Opens your selected AI platform with the transcript and your custom prompt

### Settings Panel
- Configure your preferred AI platform (ChatGPT, Gemini, or Claude)
- Customize the summary prompt to get the exact type of summary you want
- Settings are saved for future use

### Additional Features
- Copy Transcript button for easy copying to clipboard
- Error handling for videos without available transcripts
- Clean, user-friendly interface that matches YouTube's design

## Installation

### From Source Code

1. Download or clone this repository to your local machine
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and active

## Usage

1. Navigate to any YouTube video
2. The extension will automatically add a "Summarize" button below the video title
3. A transcript sidebar will appear on the right side of the page
4. Click the "Summarize" button to open your configured AI platform with the transcript
5. On first use, you'll be prompted to select your preferred AI platform and customize your summary prompt

### Changing Settings

1. Click on the extension icon in your Chrome toolbar
2. Update your AI platform selection and custom prompt
3. Click "Save Settings"

## How It Works

The extension works by:
1. Detecting when you're on a YouTube video page
2. Extracting the transcript by interacting with YouTube's built-in transcript feature
3. Displaying the transcript in a convenient sidebar
4. When you click "Summarize", it opens your selected AI platform with your custom prompt and the transcript

## Troubleshooting

- **No transcript available**: Some YouTube videos don't have captions or transcripts. In these cases, the extension will show an error message.
- **AI platform doesn't load correctly**: Make sure you're logged into your AI platform account in another tab before using the summarize feature.

## Privacy

This extension:
- Does not collect or transmit any personal data
- Only accesses YouTube video pages and transcripts
- Stores your settings locally on your device
- Does not track your browsing activity

## License

MIT License
