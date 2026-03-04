import { STORAGE_KEYS, DEFAULTS, VERSION } from './constants.js';

export async function initStorage() {
  try {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.META,
      STORAGE_KEYS.CHATS,
      STORAGE_KEYS.FOLDERS
    ]);
    const updates = {};
    if (!data[STORAGE_KEYS.SETTINGS]) {
      updates[STORAGE_KEYS.SETTINGS] = { ...DEFAULTS.settings };
    }
    if (!data[STORAGE_KEYS.META]) {
      updates[STORAGE_KEYS.META] = { ...DEFAULTS.meta };
    }
    if (!data[STORAGE_KEYS.CHATS]) {
      updates[STORAGE_KEYS.CHATS] = {};
    }
    if (!data[STORAGE_KEYS.FOLDERS]) {
      updates[STORAGE_KEYS.FOLDERS] = [...DEFAULTS.folders];
    }
    if (Object.keys(updates).length > 0) {
      await chrome.storage.local.set(updates);
    }
  } catch (e) {
    console.error('ReThread: failed to init storage', e);
  }
}

export async function getFolders() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.FOLDERS);
    return data[STORAGE_KEYS.FOLDERS] || [];
  } catch (e) {
    console.error('ReThread: failed to get folders', e);
    return [];
  }
}

export async function saveFolders(folders) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.FOLDERS]: folders });
    return true;
  } catch (e) {
    console.error('ReThread: failed to save folders', e);
    return false;
  }
}

export async function createFolder(name) {
  const folders = await getFolders();
  if (folders.includes(name)) return false;
  folders.push(name);
  return saveFolders(folders);
}

export async function deleteFolder(name) {
  try {
    const folders = await getFolders();
    const idx = folders.indexOf(name);
    if (idx === -1) return false;
    folders.splice(idx, 1);
    // Unassign folder from all chats that had it
    const chats = await getChats();
    let changed = false;
    for (const chatId of Object.keys(chats)) {
      if (chats[chatId].folder === name) {
        chats[chatId].folder = null;
        changed = true;
      }
    }
    const updates = { [STORAGE_KEYS.FOLDERS]: folders };
    if (changed) updates[STORAGE_KEYS.CHATS] = chats;
    await chrome.storage.local.set(updates);
    return true;
  } catch (e) {
    console.error('ReThread: failed to delete folder', e);
    return false;
  }
}

export async function migrateStorage() {
  try {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.META,
      STORAGE_KEYS.CHATS,
      STORAGE_KEYS.FOLDERS
    ]);
    const meta = data[STORAGE_KEYS.META] || { ...DEFAULTS.meta };

    if (meta.version < '0.2.0') {
      const chats = data[STORAGE_KEYS.CHATS] || {};
      for (const chatId of Object.keys(chats)) {
        if (!chats[chatId].platform) {
          chats[chatId].platform = 'claude';
        }
        if (chats[chatId].folder === undefined) {
          chats[chatId].folder = null;
        }
      }

      const folders = data[STORAGE_KEYS.FOLDERS] || [];

      meta.version = VERSION;

      await chrome.storage.local.set({
        [STORAGE_KEYS.META]: meta,
        [STORAGE_KEYS.CHATS]: chats,
        [STORAGE_KEYS.FOLDERS]: folders
      });


    }
  } catch (e) {
    console.error('ReThread: migration failed', e);
  }
}

export async function getChats() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.CHATS);
    return data[STORAGE_KEYS.CHATS] || {};
  } catch (e) {
    console.error('ReThread: failed to get chats', e);
    return {};
  }
}

export async function getChat(chatId) {
  const chats = await getChats();
  return chats[chatId] || null;
}

export async function saveChat(chatData) {
  try {
    const chats = await getChats();
    chats[chatData.id] = chatData;
    const meta = await getMeta();
    meta.totalChats = Object.keys(chats).length;
    await chrome.storage.local.set({
      [STORAGE_KEYS.CHATS]: chats,
      [STORAGE_KEYS.META]: meta
    });
    return true;
  } catch (e) {
    console.error('ReThread: failed to save chat', e);
    return false;
  }
}

export async function updateChat(chatId, updates) {
  try {
    const chats = await getChats();
    if (!chats[chatId]) return false;
    Object.assign(chats[chatId], updates);
    await chrome.storage.local.set({ [STORAGE_KEYS.CHATS]: chats });
    return true;
  } catch (e) {
    console.error('ReThread: failed to update chat', e);
    return false;
  }
}

export async function deleteChat(chatId) {
  try {
    const chats = await getChats();
    if (!chats[chatId]) return false;
    delete chats[chatId];
    const meta = await getMeta();
    meta.totalChats = Object.keys(chats).length;
    await chrome.storage.local.set({
      [STORAGE_KEYS.CHATS]: chats,
      [STORAGE_KEYS.META]: meta
    });
    return true;
  } catch (e) {
    console.error('ReThread: failed to delete chat', e);
    return false;
  }
}

export async function getSettings() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return data[STORAGE_KEYS.SETTINGS] || { ...DEFAULTS.settings };
  } catch (e) {
    console.error('ReThread: failed to get settings', e);
    return { ...DEFAULTS.settings };
  }
}

export async function updateSettings(updates) {
  try {
    const settings = await getSettings();
    Object.assign(settings, updates);
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    return true;
  } catch (e) {
    console.error('ReThread: failed to update settings', e);
    return false;
  }
}

export async function getMeta() {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.META);
    return data[STORAGE_KEYS.META] || { ...DEFAULTS.meta };
  } catch (e) {
    console.error('ReThread: failed to get meta', e);
    return { ...DEFAULTS.meta };
  }
}
