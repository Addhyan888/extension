// YouTube Transcript Summarizer Launcher - Popup Script

// DOM elements
const aiPlatformSelect = document.getElementById('ai-platform');
const customPromptTextarea = document.getElementById('custom-prompt');
const saveButton = document.getElementById('save-settings');
const statusElement = document.getElementById('status');

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  // Load settings from storage
  chrome.storage.local.get(['aiPlatform', 'customPrompt'], (result) => {
    if (result.aiPlatform) {
      aiPlatformSelect.value = result.aiPlatform;
    }
    
    if (result.customPrompt) {
      customPromptTextarea.value = result.customPrompt;
    }
  });
});

// Save settings when button is clicked
saveButton.addEventListener('click', () => {
  const aiPlatform = aiPlatformSelect.value;
  const customPrompt = customPromptTextarea.value;
  
  // Validate inputs
  if (!customPrompt || !customPrompt.includes('[transcript]')) {
    showStatus('Your prompt must include [transcript] placeholder.', 'error');
    return;
  }
  
  // Save to storage
  chrome.storage.local.set({
    aiPlatform: aiPlatform,
    customPrompt: customPrompt,
    firstUse: false
  }, () => {
    showStatus('Settings saved successfully!', 'success');
  });
});

/**
 * Shows a status message
 */
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusElement.className = 'status';
  }, 3000);
}