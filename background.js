// YouTube Transcript Summarizer Launcher - Background Script

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle opening AI platform in new tab with clipboard functionality
  if (message.action === 'openAITab') {
    // Open the base URL of the selected AI platform
    chrome.tabs.create({ url: message.url });
    return true;
  }
});

// Initialize default settings on installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      aiPlatform: 'chatgpt',
      customPrompt: 'Summarize this YouTube video: [transcript]',
      firstUse: true
    });
  }
});