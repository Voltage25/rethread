export const VERSION = '1.0.0';

export const MESSAGE_TYPES = {
  SAVE_CHAT: 'SAVE_CHAT',
  CHAT_SAVED: 'CHAT_SAVED',
  CHECK_CHAT: 'CHECK_CHAT',
  CHAT_STATUS: 'CHAT_STATUS',
  GET_CURRENT_CHAT: 'GET_CURRENT_CHAT',
  UPDATE_CHAT: 'UPDATE_CHAT',
  DELETE_CHAT: 'DELETE_CHAT',
  CREATE_FOLDER: 'CREATE_FOLDER',
  DELETE_FOLDER: 'DELETE_FOLDER'
};

export const STORAGE_KEYS = {
  CHATS: 'chats',
  SETTINGS: 'settings',
  META: 'meta',
  FOLDERS: 'folders'
};

export const DEFAULTS = {
  settings: {
    onboardingDone: false,
    version: VERSION
  },
  meta: {
    version: VERSION,
    totalChats: 0
  },
  folders: []
};
