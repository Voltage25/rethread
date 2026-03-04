import { MESSAGE_TYPES } from '../shared/constants.js';
import { initStorage, migrateStorage, saveChat, updateChat, deleteChat, getChat, updateSettings, createFolder, deleteFolder } from '../shared/storage.js';

// Initialize storage on install, then run migrations
chrome.runtime.onInstalled.addListener(async () => {
  await initStorage();
  await migrateStorage();
});

// Open side panel when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle keyboard shortcut for quick save
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'quick-save' && tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.GET_CURRENT_CHAT });
    } catch (e) {
      // Content script not loaded on this tab
    }
  }
});

// Message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case MESSAGE_TYPES.SAVE_CHAT: {
      const chatData = {
        id: message.chatId,
        url: message.url,
        title: message.title || 'Untitled chat',
        savedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        isPinned: false,
        pinnedAt: null,
        notes: '',
        messageCount: message.messageCount || null,
        platform: message.platform || 'claude',
        folder: null
      };
      const success = await saveChat(chatData);
      // Notify content script that chat was saved
      if (success && sender.tab?.id) {
        try {
          await chrome.tabs.sendMessage(sender.tab.id, {
            type: MESSAGE_TYPES.CHAT_SAVED,
            chatId: message.chatId
          });
        } catch (e) {
          // Tab may have closed
        }
      }
      return { success };
    }

    case MESSAGE_TYPES.CHECK_CHAT: {
      const chat = await getChat(message.chatId);
      return {
        type: MESSAGE_TYPES.CHAT_STATUS,
        chatId: message.chatId,
        isSaved: !!chat
      };
    }

    case MESSAGE_TYPES.UPDATE_CHAT: {
      const success = await updateChat(message.chatId, message.updates);
      return { success };
    }

    case MESSAGE_TYPES.DELETE_CHAT: {
      const success = await deleteChat(message.chatId);
      return { success };
    }

    case MESSAGE_TYPES.CREATE_FOLDER: {
      const success = await createFolder(message.name);
      return { success };
    }

    case MESSAGE_TYPES.DELETE_FOLDER: {
      const success = await deleteFolder(message.name);
      return { success };
    }

    case 'UPDATE_SETTINGS': {
      const success = await updateSettings(message.updates);
      return { success };
    }

    default:
      return { error: 'Unknown message type' };
  }
}
