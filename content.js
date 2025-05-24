// YouTube Transcript Summarizer Launcher - Content Script

// Main variables
let transcriptSidebar = null;
let transcriptContent = "";
let summarizeButton = null;

// Wait for page to be fully loaded
document.addEventListener('DOMContentLoaded', initExtension);
// Also listen for navigation events within YouTube (it's a SPA)
window.addEventListener('yt-navigate-finish', initExtension);

/**
 * Initialize the extension functionality
 */
function initExtension() {
  // Check if we're on a YouTube video page
  if (window.location.pathname.includes('/watch')) {
    console.log('YouTube Transcript Summarizer: Initializing on video page');
    
    // Add a small delay to ensure YouTube's UI is fully loaded
    setTimeout(() => {
      createSummarizeButton();
      createTranscriptSidebar();
    }, 1500);
  }
}

/**
 * Creates the Summarize button and adds it near the video player
 */
function createSummarizeButton() {
  // Remove existing button if it exists
  if (summarizeButton) {
    summarizeButton.remove();
  }
  
  // Create the button
  summarizeButton = document.createElement('button');
  summarizeButton.id = 'yt-transcript-summarize-btn';
  summarizeButton.className = 'yt-transcript-summarize-btn';
  summarizeButton.textContent = 'Summarize';
  summarizeButton.title = 'Summarize this video using AI';
  
  // Add click event listener
  summarizeButton.addEventListener('click', handleSummarizeClick);
  
  // Find a suitable location to insert the button (below the video title)
  const titleElement = document.querySelector('h1.ytd-watch-metadata');
  if (titleElement && titleElement.parentNode) {
    titleElement.parentNode.appendChild(summarizeButton);
  } else {
    // Fallback location
    const videoContainer = document.querySelector('#above-the-fold');
    if (videoContainer) {
      videoContainer.appendChild(summarizeButton);
    }
  }
}

/**
 * Creates the transcript sidebar
 */
function createTranscriptSidebar() {
  // Remove existing sidebar if it exists
  if (transcriptSidebar) {
    transcriptSidebar.remove();
  }
  
  // Create the sidebar container
  transcriptSidebar = document.createElement('div');
  transcriptSidebar.id = 'yt-transcript-sidebar';
  transcriptSidebar.className = 'yt-transcript-sidebar';
  
  // Create header with title and close button
  const header = document.createElement('div');
  header.className = 'yt-transcript-sidebar-header';
  
  const title = document.createElement('h3');
  title.textContent = 'Video Transcript';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.className = 'yt-transcript-close-btn';
  closeButton.addEventListener('click', () => {
    transcriptSidebar.classList.toggle('collapsed');
    if (transcriptSidebar.classList.contains('collapsed')) {
      closeButton.textContent = '⟩';
    } else {
      closeButton.textContent = '×';
    }
  });
  
  header.appendChild(title);
  header.appendChild(closeButton);
  
  // Create content container
  const content = document.createElement('div');
  content.className = 'yt-transcript-content';
  
  // Create action buttons
  const actions = document.createElement('div');
  actions.className = 'yt-transcript-actions';
  
  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy Transcript';
  copyButton.className = 'yt-transcript-copy-btn';
  copyButton.addEventListener('click', copyTranscript);
  
  actions.appendChild(copyButton);
  
  // Assemble the sidebar
  transcriptSidebar.appendChild(header);
  transcriptSidebar.appendChild(content);
  transcriptSidebar.appendChild(actions);
  
  // Add to the page
  document.body.appendChild(transcriptSidebar);
  
  // Extract and display the transcript
  extractTranscript();
}

/**
 * Extracts the transcript from the YouTube video
 */
async function extractTranscript() {
  // Reset transcript content to prevent showing old transcripts
  transcriptContent = "";
  
  // Show loading indicator
  showTranscriptLoading();
  
  const videoId = getVideoId();
  if (!videoId) {
    updateTranscriptContent('Could not determine video ID.');
    return;
  }
  
  try {
    // Method 1: Try to extract from YouTube's UI
    await extractTranscriptFromUI();
    
    // Method 2: If that fails, try alternative UI method
    if (!transcriptContent || transcriptContent.trim() === '') {
      await extractTranscriptFromTranscriptPanel();
    }
    
    // Method 3: If both UI methods fail, try API method
    if (!transcriptContent || transcriptContent.trim() === '') {
      await extractTranscriptFromAPI(videoId);
    }
    
    // If still no transcript, show appropriate message
    if (!transcriptContent || transcriptContent.trim() === '') {
      updateTranscriptContent('Unable to extract transcript. This video may not have captions available.');
    }
  } catch (error) {
    console.error('Error extracting transcript:', error);
    
    // Provide more specific error messages based on the error
    let errorMessage = 'Unable to extract transcript. ';
    
    if (error.message.includes('more actions button')) {
      errorMessage += 'Could not find the menu button to access transcript options.';
    } else if (error.message.includes('transcript option not found')) {
      errorMessage += 'This video may not have captions available.';
    } else if (error.message.includes('transcript panel did not appear')) {
      errorMessage += 'Could not open the transcript panel. This video may not have captions available.';
    } else if (error.message.includes('No transcript segments found')) {
      errorMessage += 'No transcript content was found. This video may not have captions available.';
    } else {
      errorMessage += error.message || 'This video may not have captions available.';
    }
    
    updateTranscriptContent(errorMessage);
  } finally {
    // Hide loading indicator regardless of success or failure
    hideTranscriptLoading();
  }
}

/**
 * Attempts to extract transcript by interacting with YouTube's UI
 */
async function extractTranscriptFromUI() {
  try {
    console.log('Attempting primary transcript extraction method');
    
    // Find and click the "..." button to open the menu
    const moreButton = findMoreActionsButton();
    if (!moreButton) {
      throw new Error('Could not find more actions button');
    }
    
    // Click the button to open the menu
    moreButton.click();
    
    // Wait for the menu to appear with multiple possible selectors
    try {
      await waitForElement('tp-yt-paper-listbox, ytd-menu-popup-renderer');
    } catch (e) {
      throw new Error('Menu did not appear after clicking more actions button');
    }
    
    // Find and click the "Show transcript" option with multiple possible text matches
    const menuItemSelectors = [
      'tp-yt-paper-item',
      'ytd-menu-service-item-renderer',
      '.ytd-menu-popup-renderer'
    ];
    
    let showTranscriptItem = null;
    
    for (const selector of menuItemSelectors) {
      const items = document.querySelectorAll(selector);
      for (const item of items) {
        const itemText = item.textContent.toLowerCase();
        if (itemText.includes('transcript') || itemText.includes('caption')) {
          showTranscriptItem = item;
          break;
        }
      }
      if (showTranscriptItem) break;
    }
    
    if (!showTranscriptItem) {
      // Close the menu by clicking elsewhere
      document.body.click();
      throw new Error('Show transcript option not found in menu');
    }
    
    // Click the Show transcript option
    showTranscriptItem.click();
    
    // Wait for the transcript panel to appear with multiple possible selectors
    try {
      await waitForElement('ytd-transcript-renderer, ytd-transcript-search-panel-renderer');
    } catch (e) {
      throw new Error('Transcript panel did not appear after clicking show transcript');
    }
    
    // Extract the transcript text with multiple possible selectors
    const segmentSelectors = [
      'ytd-transcript-body-renderer div.segment',
      'ytd-transcript-search-panel-renderer div.segment',
      'ytd-transcript-renderer ytd-transcript-segment-renderer',
      'div.ytd-transcript-segment-renderer'
    ];
    
    let transcriptSegments = null;
    
    for (const selector of segmentSelectors) {
      const segments = document.querySelectorAll(selector);
      if (segments && segments.length > 0) {
        transcriptSegments = segments;
        break;
      }
    }
    
    if (!transcriptSegments || transcriptSegments.length === 0) {
      throw new Error('No transcript segments found in panel');
    }
    
    // Compile the transcript text
    let fullTranscript = '';
    transcriptSegments.forEach(segment => {
      // Try different possible text element selectors
      const textElement = 
        segment.querySelector('yt-formatted-string.segment-text') || 
        segment.querySelector('.segment-text') || 
        segment.querySelector('span.ytd-transcript-segment-renderer') ||
        segment.querySelector('div.cue');
    if (textElement) {
      fullTranscript += textElement.textContent + ' ';
    }
  });
  
  // Close the transcript panel by clicking the close button
  const closeButtons = document.querySelectorAll('button[aria-label="Close"], ytd-engagement-panel-section-list-renderer #dismiss-button');
  for (const button of closeButtons) {
    if (button.offsetParent !== null) { // Check if button is visible
      button.click();
      break;
    }
  }
  
  // Only update if we actually found transcript content
  if (fullTranscript && fullTranscript.trim() !== '') {
    transcriptContent = fullTranscript.trim();
    updateTranscriptContent(transcriptContent);
    return true;
  } else {
    throw new Error('No transcript content was extracted');
  }
  } catch (error) {
    console.error('Error in primary transcript extraction method:', error);
    // Make sure we don't keep old transcript content on error
    return false;
  }
}

/**
 * Attempts to extract transcript using YouTube's API
 */
async function extractTranscriptFromAPI(videoId) {
  try {
    console.log('Attempting API-based transcript extraction method');
    
    // Construct the URL to fetch the transcript data
    const transcriptUrl = `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`;
    
    // Fetch the transcript data
    const response = await fetch(transcriptUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch transcript data:', response.status);
      return false;
    }
    
    const data = await response.text();
    
    // Check if we got valid XML data
    if (data && data.includes('<transcript>')) {
      // Parse the XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, 'text/xml');
      
      // Extract text from transcript
      const textElements = xmlDoc.getElementsByTagName('text');
      let fullTranscript = '';
      
      for (let i = 0; i < textElements.length; i++) {
        fullTranscript += textElements[i].textContent + ' ';
      }
      
      // Update the sidebar with the transcript
      transcriptContent = fullTranscript.trim();
      updateTranscriptContent(transcriptContent);
      return true;
    }
    
    // Try alternative API endpoint if the first one fails
    const altTranscriptUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    const altResponse = await fetch(altTranscriptUrl);
    
    if (!altResponse.ok) {
      return false;
    }
    
    const altData = await altResponse.text();
    
    // If we got a list of available transcripts
    if (altData && altData.includes('<track')) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(altData, 'text/xml');
      
      // Find the first available transcript
      const tracks = xmlDoc.getElementsByTagName('track');
      
      if (tracks.length > 0) {
        // Get the lang_code of the first track
        const langCode = tracks[0].getAttribute('lang_code');
        
        // Fetch this specific transcript
        const specificUrl = `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}`;
        const specificResponse = await fetch(specificUrl);
        
        if (specificResponse.ok) {
          const specificData = await specificResponse.text();
          
          if (specificData && specificData.includes('<transcript>')) {
            // Parse the XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(specificData, 'text/xml');
            
            // Extract text from transcript
            const textElements = xmlDoc.getElementsByTagName('text');
            let fullTranscript = '';
            
            for (let i = 0; i < textElements.length; i++) {
              fullTranscript += textElements[i].textContent + ' ';
            }
            
            // Only update if we actually found transcript content
            if (fullTranscript && fullTranscript.trim() !== '') {
              transcriptContent = fullTranscript.trim();
              updateTranscriptContent(transcriptContent);
              return true;
            } else {
              throw new Error('No transcript content was extracted from API');
            }
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in API transcript extraction:', error);
    return false;
  }
}

/**
 * Shows the loading indicator in the transcript sidebar
 */
function showTranscriptLoading() {
  const contentElement = transcriptSidebar.querySelector('.yt-transcript-content');
  if (contentElement) {
    // Clear any existing content first
    contentElement.innerHTML = '';
    
    // Create and add the loading indicator
    const loading = document.createElement('div');
    loading.className = 'yt-transcript-loading';
    loading.textContent = 'Loading transcript...';
    contentElement.appendChild(loading);
  }
}

/**
 * Hides the loading indicator in the transcript sidebar
 */
function hideTranscriptLoading() {
  const contentElement = transcriptSidebar.querySelector('.yt-transcript-content');
  const loadingElement = contentElement?.querySelector('.yt-transcript-loading');
  if (loadingElement) {
    loadingElement.remove();
  }
}

/**
 * Updates the transcript content in the sidebar
 */
function updateTranscriptContent(text) {
  const contentElement = transcriptSidebar.querySelector('.yt-transcript-content');
  if (contentElement) {
    contentElement.innerHTML = '';
    const textElement = document.createElement('p');
    textElement.textContent = text;
    contentElement.appendChild(textElement);
  }
}

/**
 * Handles the click on the Summarize button
 */
function handleSummarizeClick() {
  if (!transcriptContent || transcriptContent.trim() === '') {
    alert('No transcript available to summarize.');
    return;
  }
  
  // Check if we have saved settings
  chrome.storage.local.get(['aiPlatform', 'customPrompt', 'firstUse'], (result) => {
    if (result.firstUse !== false) {
      // Show first-time setup popup
      showFirstTimeSetup();
    } else {
      // Launch the selected AI platform with the transcript
      launchAIPlatform(result.aiPlatform, result.customPrompt, transcriptContent);
    }
  });
}

/**
 * Shows the first-time setup popup
 */
function showFirstTimeSetup() {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'yt-transcript-overlay';
  
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'yt-transcript-modal';
  
  // Create modal content
  modal.innerHTML = `
    <h2>Setup YouTube Transcript Summarizer</h2>
    <p>Please select your preferred AI platform and customize your summary prompt.</p>
    
    <div class="form-group">
      <label for="ai-platform">AI Platform:</label>
      <select id="ai-platform">
        <option value="chatgpt">ChatGPT</option>
        <option value="gemini">Gemini</option>
        <option value="claude">Claude</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="custom-prompt">Custom Prompt:</label>
      <textarea id="custom-prompt" rows="4">Summarize this YouTube video: [transcript]</textarea>
      <p class="hint">Use [transcript] as a placeholder for the video transcript.</p>
    </div>
    
    <div class="form-actions">
      <button id="setup-cancel" class="secondary">Cancel</button>
      <button id="setup-save">Save & Continue</button>
    </div>
  `;
  
  // Add to page
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Add event listeners
  document.getElementById('setup-cancel').addEventListener('click', () => {
    overlay.remove();
  });
  
  document.getElementById('setup-save').addEventListener('click', () => {
    const aiPlatform = document.getElementById('ai-platform').value;
    const customPrompt = document.getElementById('custom-prompt').value;
    
    // Save settings
    chrome.storage.local.set({
      aiPlatform: aiPlatform,
      customPrompt: customPrompt,
      firstUse: false
    }, () => {
      // Launch the AI platform
      launchAIPlatform(aiPlatform, customPrompt, transcriptContent);
      overlay.remove();
    });
  });
}

/**
 * Launches the selected AI platform with the transcript
 */
function launchAIPlatform(platform, prompt, transcript) {
  // Replace [transcript] placeholder with actual transcript
  const fullPrompt = prompt.replace('[transcript]', transcript);
  
  let url = '';
  
  // Get base URLs without query parameters
  switch (platform) {
    case 'chatgpt':
      url = 'https://chat.openai.com/';
      break;
    case 'gemini':
      url = 'https://gemini.google.com/';
      break;
    case 'claude':
      url = 'https://claude.ai/chat';
      break;
    default:
      url = 'https://chat.openai.com/';
  }
  
  // Copy the prompt to clipboard
  navigator.clipboard.writeText(fullPrompt)
    .then(() => {
      // Show a notification that the prompt has been copied
      showNotification('Prompt copied to clipboard! Paste it into the AI platform.');
      
      // Open the AI platform in a new tab
      chrome.runtime.sendMessage({
        action: 'openAITab',
        url: url
      });
    })
    .catch(err => {
      console.error('Failed to copy prompt to clipboard:', err);
      alert('Failed to copy prompt to clipboard. Please try again.');
    });
}

/**
 * Copies the transcript to clipboard
 */
function copyTranscript() {
  if (!transcriptContent || transcriptContent.trim() === '') {
    alert('No transcript available to copy.');
    return;
  }
  
  navigator.clipboard.writeText(transcriptContent)
    .then(() => {
      const copyButton = document.querySelector('.yt-transcript-copy-btn');
      const originalText = copyButton.textContent;
      
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = originalText;
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy transcript:', err);
      alert('Failed to copy transcript to clipboard.');
    });
}

/**
 * Shows a notification to the user
 */
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'yt-transcript-notification';
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after a delay
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 3000);
}

/**
 * Helper function to get the current YouTube video ID
 */
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Helper function to find the "More actions" button
 */
function findMoreActionsButton() {
  // Look for the button in different possible locations
  const possibleSelectors = [
    'button[aria-label="More actions"]',
    'ytd-menu-renderer button[aria-label="More actions"]',
    'ytd-video-primary-info-renderer button[aria-label="More actions"]',
    'ytd-menu-renderer button.yt-icon-button',
    'button.ytp-button[aria-label*="More"]',
    'button.ytp-menuitem[aria-label*="transcript"]',
    'button.ytp-menuitem[aria-label*="caption"]',
    'ytd-button-renderer button[aria-label*="More"]',
    'ytd-menu-renderer yt-icon-button[aria-label*="More"]',
    'ytd-menu-renderer button[aria-label*="menu"]',
    'ytd-menu-renderer button[aria-label*="options"]',
    'ytd-menu-renderer button[aria-label*="action"]'
  ];
  
  // First try exact matches
  for (const selector of possibleSelectors) {
    const button = document.querySelector(selector);
    if (button && button.offsetParent !== null) return button; // Check if visible
  }
  
  // If no exact matches, try to find buttons with three dots or more icon
  const allButtons = document.querySelectorAll('button, yt-icon-button');
  for (const button of allButtons) {
    // Check if button contains three dots or more text
    if (button.textContent.includes('...') || 
        button.textContent.includes('⋮') || 
        button.textContent.includes('⋯') ||
        button.innerHTML.includes('more_vert') ||
        button.ariaLabel?.toLowerCase().includes('more') ||
        button.title?.toLowerCase().includes('more')) {
      if (button.offsetParent !== null) return button; // Check if visible
    }
    
    // Check if button has an icon that might be a more actions button
    const icon = button.querySelector('yt-icon, iron-icon, .yt-icon');
    if (icon && button.offsetParent !== null) {
      return button;
    }
  }
  
  return null;
}

/**
 * Helper function to wait for an element to appear in the DOM
 */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for element: ${selector}`));
        return;
      }
      
      setTimeout(checkElement, 100);
    };
    
    checkElement();
  });
}

/**
 * Alternative method to extract transcript directly from transcript panel
 * This is used as a fallback when the UI interaction method fails
 */
async function extractTranscriptFromTranscriptPanel() {
  try {
    console.log('Attempting alternative transcript extraction method');
    
    // First check if transcript panel is already open
    let transcriptPanel = document.querySelector('ytd-transcript-renderer');
    
    // If not open, try to open it
    if (!transcriptPanel) {
      // Try to find and click the transcript button in the description area
      const descriptionButtons = Array.from(document.querySelectorAll('button'));
      const transcriptButton = descriptionButtons.find(button => 
        button.textContent.toLowerCase().includes('transcript') || 
        button.textContent.toLowerCase().includes('caption')
      );
      
      if (transcriptButton) {
        transcriptButton.click();
        // Wait for transcript panel to appear
        try {
          transcriptPanel = await waitForElement('ytd-transcript-renderer', 3000);
        } catch (e) {
          console.log('Transcript panel did not appear after clicking button');
        }
      }
      
      // If still no transcript panel, try the three dots menu method but with more robust selectors
      if (!transcriptPanel) {
        // Find all menu buttons
        const menuButtons = Array.from(document.querySelectorAll('button.ytp-button, button.yt-icon-button, ytd-button-renderer button'));
        
        // Try each button that might be the more actions button
        for (const button of menuButtons) {
          if (button.ariaLabel?.includes('More') || 
              button.title?.includes('More') || 
              button.textContent.includes('...')) {
            button.click();
            
            // Wait briefly for menu to appear
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Look for transcript option in the menu
            const menuItems = document.querySelectorAll('tp-yt-paper-item, ytd-menu-service-item-renderer');
            for (const item of menuItems) {
              if (item.textContent.toLowerCase().includes('transcript') || 
                  item.textContent.toLowerCase().includes('caption')) {
                item.click();
                
                // Wait for transcript panel
                try {
                  transcriptPanel = await waitForElement('ytd-transcript-renderer, ytd-transcript-search-panel-renderer', 3000);
                  break;
                } catch (e) {
                  console.log('Transcript panel did not appear after clicking menu item');
                }
              }
            }
            
            // If we found and clicked a transcript option, break out of the button loop
            if (transcriptPanel) break;
            
            // Otherwise close any open menu by clicking elsewhere
            document.body.click();
          }
        }
      }
    }
    
    // If we have a transcript panel, extract the text
    if (transcriptPanel) {
      // Look for transcript segments with different possible selectors
      const segmentSelectors = [
        'ytd-transcript-body-renderer div.segment',
        'ytd-transcript-search-panel-renderer div.segment',
        'ytd-transcript-renderer ytd-transcript-segment-renderer',
        'div.ytd-transcript-segment-renderer'
      ];
      
      let transcriptSegments = null;
      
      for (const selector of segmentSelectors) {
        const segments = document.querySelectorAll(selector);
        if (segments && segments.length > 0) {
          transcriptSegments = segments;
          break;
        }
      }
      
      if (transcriptSegments && transcriptSegments.length > 0) {
        // Compile the transcript text
        let fullTranscript = '';
        transcriptSegments.forEach(segment => {
          // Try different possible text element selectors
          const textElement = 
            segment.querySelector('yt-formatted-string.segment-text') || 
            segment.querySelector('.segment-text') || 
            segment.querySelector('span.ytd-transcript-segment-renderer') ||
            segment.querySelector('div.cue');
          
          if (textElement) {
            fullTranscript += textElement.textContent + ' ';
          }
        });
        
        // Close the transcript panel
        const closeButtons = document.querySelectorAll('button[aria-label="Close"], ytd-engagement-panel-section-list-renderer #dismiss-button');
        for (const button of closeButtons) {
          if (button.offsetParent !== null) { // Check if button is visible
            button.click();
            break;
          }
        }
        
        // Only update if we actually found transcript content
        if (fullTranscript && fullTranscript.trim() !== '') {
          transcriptContent = fullTranscript.trim();
          updateTranscriptContent(transcriptContent);
          return true;
        } else {
          throw new Error('No transcript content was extracted from transcript panel');
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in alternative transcript extraction:', error);
    return false;
  }
}