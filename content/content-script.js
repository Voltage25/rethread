// ReThread Content Script — injected on supported AI chat platforms
// Platform config loaded from shared/platforms.js (runs before this file)
// Self-contained (no ES module imports in content scripts)

(function () {
  'use strict';

  const MSG = {
    SAVE_CHAT: 'SAVE_CHAT',
    CHAT_SAVED: 'CHAT_SAVED',
    GET_CURRENT_CHAT: 'GET_CURRENT_CHAT'
  };

  // Detect current platform from shared/platforms.js global
  const hostname = window.location.hostname;
  let currentPlatform = null;
  for (const platform of Object.values(PLATFORMS)) {
    if (platform.hostnames.includes(hostname)) {
      currentPlatform = platform;
      break;
    }
  }

  if (!currentPlatform) return;

  let currentChatId = null;
  let shadowRoot = null;
  let buttonEl = null;
  let hostEl = null;
  let isSaved = false;
  let injected = false;

  function getChatIdFromUrl() {
    const match = window.location.pathname.match(currentPlatform.chatUrlPattern);
    return match ? match[1] : null;
  }

  // ---- Shadow DOM injection ----
  async function injectButton() {
    if (injected) return;
    injected = true;

    hostEl = document.createElement('div');
    hostEl.id = 'rethread-host';
    if (currentPlatform.cssClass) {
      hostEl.classList.add(currentPlatform.cssClass);
    }
    shadowRoot = hostEl.attachShadow({ mode: 'closed' });

    try {
      const cssUrl = chrome.runtime.getURL('content/content-styles.css');
      const resp = await fetch(cssUrl);
      const cssText = await resp.text();
      const style = document.createElement('style');
      style.textContent = "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700&display=swap');\n" + cssText;
      shadowRoot.appendChild(style);
    } catch (e) {
      console.error('ReThread: failed to load styles', e);
    }

    buttonEl = document.createElement('button');
    buttonEl.className = 'rt-save-btn rt-save-btn--default';
    buttonEl.textContent = 'Save';
    buttonEl.addEventListener('click', handleSaveClick);

    shadowRoot.appendChild(buttonEl);

    // Use platform-specific anchor or fall back to floating (body append)
    const anchor = currentPlatform.getButtonAnchor();
    if (anchor) {
      anchor.insertAdjacentElement(currentPlatform.buttonPosition, hostEl);
    } else {
      document.body.appendChild(hostEl);
    }
  }

  function removeButton() {
    if (hostEl && hostEl.parentNode) {
      hostEl.parentNode.removeChild(hostEl);
    }
    hostEl = null;
    shadowRoot = null;
    buttonEl = null;
    injected = false;
    isSaved = false;
  }

  function updateButtonState(saved) {
    isSaved = saved;
    if (!buttonEl) return;
    if (saved) {
      buttonEl.className = 'rt-save-btn rt-save-btn--saved';
      buttonEl.textContent = 'Saved!';
    } else {
      buttonEl.className = 'rt-save-btn rt-save-btn--default';
      buttonEl.textContent = 'Save';
    }
  }

  // ---- Actions ----
  async function handleSaveClick() {
    if (isSaved || !currentChatId) return;

    buttonEl.className = 'rt-save-btn rt-save-btn--saving';
    buttonEl.textContent = 'Saving...';

    try {
      await chrome.runtime.sendMessage({
        type: MSG.SAVE_CHAT,
        chatId: currentChatId,
        url: window.location.href,
        title: currentPlatform.getTitle(),
        messageCount: null,
        platform: currentPlatform.id
      });
    } catch (e) {
      console.error('ReThread: save failed', e);
      updateButtonState(false);
    }
  }

  async function checkIfSaved(chatId) {
    try {
      // Read directly from storage — avoids service worker sleep race condition
      const data = await chrome.storage.local.get('chats');
      const chats = data.chats || {};
      updateButtonState(!!chats[chatId]);
    } catch (e) {
      updateButtonState(false);
    }
  }

  // ---- Navigation detection ----
  async function onNavigate() {
    const chatId = getChatIdFromUrl();

    if (chatId && chatId !== currentChatId) {
      currentChatId = chatId;
      if (!injected) await injectButton();
      updateButtonState(false);
      checkIfSaved(chatId);
    } else if (!chatId) {
      currentChatId = null;
      removeButton();
    }
  }

  // Detect SPA navigation via MutationObserver + popstate
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      onNavigate();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', () => {
    lastUrl = window.location.href;
    onNavigate();
  });

  // ---- Message listener ----
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MSG.CHAT_SAVED && message.chatId === currentChatId) {
      updateButtonState(true);
    }

    if (message.type === MSG.GET_CURRENT_CHAT && currentChatId) {
      handleSaveClick();
    }
  });

  // ---- Initial check ----
  onNavigate();

})();
