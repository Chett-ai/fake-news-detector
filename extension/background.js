// TruthLens Chrome Extension Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for highlighted text on any webpage
  chrome.contextMenus.create({
    id: "truthlens-verify-selection",
    title: "Verify with TruthLens: \"%s\"",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "truthlens-verify-selection" && info.selectionText) {
    const selectedText = info.selectionText.trim();
    
    // Save to storage so popup opens with this text pre-loaded
    chrome.storage.local.set({ pendingVerification: selectedText }, () => {
      // Open popup or trigger notification
      if (chrome.action.openPopup) {
        chrome.action.openPopup();
      }
    });
  }
});
