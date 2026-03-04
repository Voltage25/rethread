import { MESSAGE_TYPES, VERSION } from '../shared/constants.js';
import { getChats, getSettings, getFolders, createFolder, deleteFolder, updateSettings } from '../shared/storage.js';
import { formatDate, debounce } from '../shared/utils.js';

// SVG icon templates
const ICONS = {
  starFilled: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  starOutline: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
  folder: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`
};

// State
let chats = {};
let settings = {};
let folders = [];
let activePlatform = null;
let activeFolder = null;
let searchQuery = '';

// DOM refs
const viewOnboarding = document.getElementById('view-onboarding');
const viewEmpty = document.getElementById('view-empty');
const viewList = document.getElementById('view-list');
const viewSettings = document.getElementById('view-settings');
const btnGetStarted = document.getElementById('btn-get-started');
const sectionPinned = document.getElementById('section-pinned');
const sectionRecent = document.getElementById('section-recent');
const pinnedList = document.getElementById('pinned-list');
const recentList = document.getElementById('recent-list');
const deleteModal = document.getElementById('delete-modal');
const modalCancel = document.getElementById('modal-cancel');
const modalDelete = document.getElementById('modal-delete');
const searchInput = document.getElementById('search-input');
const btnSettings = document.getElementById('btn-settings');
const btnSettingsBack = document.getElementById('btn-settings-back');
const folderSelector = document.getElementById('folder-selector');
const folderSelectorText = document.getElementById('folder-selector-text');
const folderDropdown = document.getElementById('folder-dropdown');
const folderDeleteModal = document.getElementById('folder-delete-modal');
const folderModalCancel = document.getElementById('folder-modal-cancel');
const folderModalDelete = document.getElementById('folder-modal-delete');
const folderAssignModal = document.getElementById('folder-assign-modal');
const folderAssignCancel = document.getElementById('folder-assign-cancel');
const folderAssignSave = document.getElementById('folder-assign-save');
const folderAssignList = document.getElementById('folder-assign-list');
const folderAssignInput = document.getElementById('folder-assign-input');
const folderAssignCreateBtn = document.getElementById('folder-assign-create-btn');
const settingsFolderList = document.getElementById('settings-folder-list');
const settingsNewFolder = document.getElementById('settings-new-folder');
const settingsAddFolder = document.getElementById('settings-add-folder');

// Initialize
async function init() {
  settings = await getSettings();
  chats = await getChats();
  folders = await getFolders();
  render();
  setupListeners();
}

function render() {
  const chatCount = Object.keys(chats).length;

  if (!settings.onboardingDone) {
    showView('onboarding');
  } else if (chatCount === 0) {
    showView('empty');
  } else {
    showView('list');
    renderChatList();
  }
}

function showView(name) {
  viewOnboarding.hidden = name !== 'onboarding';
  viewEmpty.hidden = name !== 'empty';
  viewList.hidden = name !== 'list';
  viewSettings.hidden = name !== 'settings';
}

// ---- Filtering ----
function getFilteredChats() {
  let chatArray = Object.values(chats);

  // Platform filter (null = show all; pre-0.2.0 chats default to 'claude')
  if (activePlatform) {
    chatArray = chatArray.filter(c => (c.platform || 'claude') === activePlatform);
  }

  // Folder filter
  if (activeFolder !== null) {
    chatArray = chatArray.filter(c => c.folder === activeFolder);
  }

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    chatArray = chatArray.filter(c =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.notes || '').toLowerCase().includes(q)
    );
  }

  return chatArray;
}

function renderChatList() {
  const chatArray = getFilteredChats();

  const pinned = chatArray
    .filter(c => c.isPinned)
    .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));

  const recent = chatArray
    .filter(c => !c.isPinned)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  // Pinned section
  if (pinned.length > 0) {
    sectionPinned.hidden = false;
    pinnedList.textContent = '';
    pinned.forEach(chat => pinnedList.appendChild(createChatCard(chat)));
  } else {
    sectionPinned.hidden = true;
  }

  // Recent section
  recentList.textContent = '';
  if (recent.length > 0) {
    sectionRecent.hidden = false;
    recent.forEach(chat => recentList.appendChild(createChatCard(chat)));
  } else if (pinned.length > 0) {
    sectionRecent.hidden = true;
  } else {
    sectionRecent.hidden = true;
  }
}

function createChatCard(chat) {
  const card = document.createElement('div');
  card.className = 'chat-card';
  card.dataset.chatId = chat.id;

  // Header row
  const header = document.createElement('div');
  header.className = 'chat-card-header';

  // Body (title + meta)
  const body = document.createElement('div');
  body.className = 'chat-card-body';

  const title = document.createElement('div');
  title.className = 'chat-title';
  title.textContent = chat.title || 'Untitled chat';
  title.addEventListener('click', () => openChat(chat.url));

  const meta = document.createElement('div');
  meta.className = 'chat-meta';
  const dateStr = formatDate(chat.savedAt);
  const msgStr = chat.messageCount ? ` \u00b7 ${chat.messageCount} messages` : '';
  meta.textContent = `${dateStr}${msgStr}`;

  body.appendChild(title);
  body.appendChild(meta);

  // Actions (star + 3-dot menu)
  const actions = document.createElement('div');
  actions.className = 'chat-actions';

  const starBtn = document.createElement('button');
  starBtn.className = 'btn-icon' + (chat.isPinned ? ' active' : '');
  starBtn.innerHTML = chat.isPinned ? ICONS.starFilled : ICONS.starOutline;
  starBtn.title = chat.isPinned ? 'Unpin' : 'Pin';
  starBtn.addEventListener('click', () => togglePin(chat));

  // 3-dot menu
  const menuWrapper = document.createElement('div');
  menuWrapper.className = 'card-menu-wrapper';

  const menuBtn = document.createElement('button');
  menuBtn.className = 'btn-menu';
  menuBtn.textContent = '\u22EF';
  menuBtn.title = 'More';

  const menu = document.createElement('div');
  menu.className = 'card-menu';

  const addCommentItem = document.createElement('div');
  addCommentItem.className = 'card-menu-item';
  addCommentItem.textContent = 'Add comment';

  const addToFolderItem = document.createElement('div');
  addToFolderItem.className = 'card-menu-item';
  addToFolderItem.textContent = 'Add to folder';

  const deleteItem = document.createElement('div');
  deleteItem.className = 'card-menu-item danger';
  deleteItem.textContent = 'Delete';

  // Wire menu button
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains('open');
    closeAllMenus();
    if (!wasOpen) menu.classList.add('open');
  });

  addCommentItem.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('open');
    notesContainer.hidden = false;
    notesInput.focus();
  });

  addToFolderItem.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('open');
    showFolderAssignModal(chat);
  });

  deleteItem.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.remove('open');
    showDeleteModal(chat);
  });

  menu.appendChild(addCommentItem);
  menu.appendChild(addToFolderItem);
  menu.appendChild(deleteItem);
  menuWrapper.appendChild(menuBtn);
  menuWrapper.appendChild(menu);

  actions.appendChild(starBtn);
  actions.appendChild(menuWrapper);

  header.appendChild(body);
  header.appendChild(actions);

  // Tags row (platform + folder)
  const tags = document.createElement('div');
  tags.className = 'chat-tags';

  // Platform tag
  const platform = chat.platform || 'claude';
  const platformPill = document.createElement('span');
  platformPill.className = 'tag-pill tag-pill--' + platform;
  const platformImg = document.createElement('img');
  platformImg.width = 12;
  platformImg.height = 12;

  const platformMeta = {
    claude:  { icon: '../icons/platform-claude.svg', label: 'Claude' },
    chatgpt: { icon: '../icons/platform-gpt.svg',    label: 'GPT' },
    gemini:  { icon: '../icons/platform-gemini.svg',  label: 'Gemini' },
    grok:    { icon: '../icons/platform-grok.svg',    label: 'Grok' }
  };
  const pInfo = platformMeta[platform] || platformMeta.claude;
  platformImg.src = pInfo.icon;
  platformPill.appendChild(platformImg);
  platformPill.appendChild(document.createTextNode(' ' + pInfo.label));

  tags.appendChild(platformPill);

  // Folder tag
  if (chat.folder) {
    const folderPill = document.createElement('span');
    folderPill.className = 'tag-pill tag-pill--folder';
    folderPill.innerHTML = ICONS.folder + ' ' + escapeText(chat.folder);
    tags.appendChild(folderPill);
  }

  // Notes container (peach background, below header)
  const notesContainer = document.createElement('div');
  notesContainer.className = 'chat-notes';
  notesContainer.hidden = !chat.notes;

  const notesInput = document.createElement('div');
  notesInput.className = 'chat-notes-input';
  notesInput.contentEditable = 'true';
  notesInput.setAttribute('data-placeholder', 'Add a note...');
  if (chat.notes) notesInput.innerText = chat.notes;

  const saveNotes = debounce((value) => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_CHAT,
      chatId: chat.id,
      updates: { notes: value }
    });
  }, 500);

  notesInput.addEventListener('input', () => {
    saveNotes(notesInput.innerText);
  });

  notesInput.addEventListener('blur', () => {
    if (!notesInput.innerText.trim()) {
      notesContainer.hidden = true;
    }
  });

  notesContainer.appendChild(notesInput);

  card.appendChild(header);
  card.appendChild(tags);
  card.appendChild(notesContainer);

  return card;
}

function escapeText(str) {
  const span = document.createElement('span');
  span.textContent = str;
  return span.innerHTML;
}

function openChat(url) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab) {
      chrome.tabs.update(tab.id, { url });
    }
  });
}

function togglePin(chat) {
  const isPinned = !chat.isPinned;
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.UPDATE_CHAT,
    chatId: chat.id,
    updates: {
      isPinned,
      pinnedAt: isPinned ? new Date().toISOString() : null
    }
  });
}

// ---- Settings ----
function showSettingsView() {
  showView('settings');
  renderSettingsFolders();
}

function renderSettingsFolders() {
  settingsFolderList.textContent = '';

  if (folders.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'settings-empty';
    empty.textContent = 'No folders yet';
    settingsFolderList.appendChild(empty);
    return;
  }

  const chatValues = Object.values(chats);
  folders.forEach(name => {
    const count = chatValues.filter(c => c.folder === name).length;

    const row = document.createElement('div');
    row.className = 'settings-folder-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'settings-folder-name';
    nameEl.textContent = name;

    const countEl = document.createElement('span');
    countEl.className = 'settings-folder-count';
    countEl.textContent = count + (count === 1 ? ' chat' : ' chats');

    const delBtn = document.createElement('button');
    delBtn.className = 'settings-folder-delete';
    delBtn.innerHTML = ICONS.trash;
    delBtn.title = 'Delete folder';
    delBtn.addEventListener('click', () => showFolderDeleteModal(name));

    row.appendChild(nameEl);
    row.appendChild(countEl);
    row.appendChild(delBtn);
    settingsFolderList.appendChild(row);
  });
}

// ---- Folder dropdown ----
function renderFolderDropdown() {
  folderDropdown.textContent = '';

  const allItem = document.createElement('div');
  allItem.className = 'folder-dropdown-item' + (activeFolder === null ? ' active' : '');
  allItem.textContent = 'All folders';
  allItem.addEventListener('click', () => {
    activeFolder = null;
    folderSelectorText.textContent = 'All folders';
    folderDropdown.classList.remove('open');
    renderChatList();
  });
  folderDropdown.appendChild(allItem);

  folders.forEach(name => {
    const item = document.createElement('div');
    item.className = 'folder-dropdown-item' + (activeFolder === name ? ' active' : '');
    item.textContent = name;
    item.addEventListener('click', () => {
      activeFolder = name;
      folderSelectorText.textContent = name;
      folderDropdown.classList.remove('open');
      renderChatList();
    });
    folderDropdown.appendChild(item);
  });
}

// ---- Folder assignment modal ----
let assignTargetChat = null;
let assignSelectedFolder = null;

function showFolderAssignModal(chat) {
  assignTargetChat = chat;
  assignSelectedFolder = chat.folder || null;
  renderFolderAssignList();
  folderAssignInput.value = '';
  folderAssignModal.classList.add('open');
}

function renderFolderAssignList() {
  folderAssignList.textContent = '';

  // "None" option
  const noneItem = document.createElement('div');
  noneItem.className = 'folder-assign-item' + (assignSelectedFolder === null ? ' selected' : '');
  const noneRadio = document.createElement('div');
  noneRadio.className = 'folder-assign-radio';
  const noneLabel = document.createElement('span');
  noneLabel.textContent = 'None';
  noneItem.appendChild(noneRadio);
  noneItem.appendChild(noneLabel);
  noneItem.addEventListener('click', () => {
    assignSelectedFolder = null;
    renderFolderAssignList();
  });
  folderAssignList.appendChild(noneItem);

  folders.forEach(name => {
    const item = document.createElement('div');
    item.className = 'folder-assign-item' + (assignSelectedFolder === name ? ' selected' : '');
    const radio = document.createElement('div');
    radio.className = 'folder-assign-radio';
    const label = document.createElement('span');
    label.textContent = name;
    item.appendChild(radio);
    item.appendChild(label);
    item.addEventListener('click', () => {
      assignSelectedFolder = name;
      renderFolderAssignList();
    });
    folderAssignList.appendChild(item);
  });
}

// ---- Delete modals ----
let pendingDeleteChat = null;
let pendingDeleteFolder = null;

function showDeleteModal(chat) {
  pendingDeleteChat = chat;
  deleteModal.classList.add('open');
}

function closeDeleteModal() {
  deleteModal.classList.remove('open');
  pendingDeleteChat = null;
}

function showFolderDeleteModal(name) {
  pendingDeleteFolder = name;
  folderDeleteModal.classList.add('open');
}

function closeFolderDeleteModal() {
  folderDeleteModal.classList.remove('open');
  pendingDeleteFolder = null;
}

function closeAllMenus() {
  document.querySelectorAll('.card-menu.open').forEach(m => m.classList.remove('open'));
}

// ---- Listeners ----
function setupListeners() {
  // Get Started button (direct storage call — avoids service worker sleep)
  btnGetStarted.addEventListener('click', async () => {
    await updateSettings({ onboardingDone: true });
    settings.onboardingDone = true;
    render();
  });

  // Platform chips (toggle behavior — click again to deactivate)
  document.querySelectorAll('.chip[data-platform]').forEach(chip => {
    chip.addEventListener('click', () => {
      const platform = chip.dataset.platform;
      if (activePlatform === platform) {
        // Toggle off — show all
        chip.classList.remove('active');
        activePlatform = null;
      } else {
        // Activate this one, deactivate others
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activePlatform = platform;
      }
      renderChatList();
    });
  });

  // Search
  searchInput.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim();
    renderChatList();
  }, 200));

  // Settings
  btnSettings.addEventListener('click', showSettingsView);
  btnSettingsBack.addEventListener('click', () => {
    showView('list');
    renderChatList();
  });

  // Folder selector
  folderSelector.addEventListener('click', (e) => {
    e.stopPropagation();
    renderFolderDropdown();
    folderDropdown.classList.toggle('open');
  });

  // Settings: create folder (direct storage call, no service worker round-trip)
  settingsAddFolder.addEventListener('click', async () => {
    const name = settingsNewFolder.value.trim();
    if (!name) return;
    await createFolder(name);
    settingsNewFolder.value = '';
  });

  settingsNewFolder.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') settingsAddFolder.click();
  });

  // Folder assign modal: create inline (direct storage call)
  folderAssignCreateBtn.addEventListener('click', async () => {
    const name = folderAssignInput.value.trim();
    if (!name || folders.includes(name)) return;
    await createFolder(name);
    folderAssignInput.value = '';
  });

  folderAssignInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') folderAssignCreateBtn.click();
  });

  // Folder assign modal: save
  folderAssignSave.addEventListener('click', () => {
    if (assignTargetChat) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.UPDATE_CHAT,
        chatId: assignTargetChat.id,
        updates: { folder: assignSelectedFolder }
      });
    }
    folderAssignModal.classList.remove('open');
    assignTargetChat = null;
  });

  folderAssignCancel.addEventListener('click', () => {
    folderAssignModal.classList.remove('open');
    assignTargetChat = null;
  });

  // Delete modal
  modalCancel.addEventListener('click', closeDeleteModal);
  modalDelete.addEventListener('click', () => {
    if (pendingDeleteChat) {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.DELETE_CHAT,
        chatId: pendingDeleteChat.id
      });
    }
    closeDeleteModal();
  });

  // Folder delete modal (direct storage call)
  folderModalCancel.addEventListener('click', closeFolderDeleteModal);
  folderModalDelete.addEventListener('click', async () => {
    if (pendingDeleteFolder) {
      await deleteFolder(pendingDeleteFolder);
      if (activeFolder === pendingDeleteFolder) {
        activeFolder = null;
        folderSelectorText.textContent = 'All folders';
      }
    }
    closeFolderDeleteModal();
  });

  // Close menus/dropdowns on outside click
  document.addEventListener('click', () => {
    closeAllMenus();
    folderDropdown.classList.remove('open');
  });

  // Listen for storage changes (reactive updates)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.chats) {
      chats = changes.chats.newValue || {};
      // Skip re-render if user is editing notes (avoids collapsing text)
      const editingNotes = document.activeElement &&
        document.activeElement.classList.contains('chat-notes-input');
      if (!viewSettings.hidden) {
        renderSettingsFolders();
      } else if (!editingNotes) {
        render();
      }
    }
    if (changes.folders) {
      folders = changes.folders.newValue || [];
      if (!viewSettings.hidden) {
        renderSettingsFolders();
      }
      // Update assign modal if open
      if (folderAssignModal.classList.contains('open')) {
        renderFolderAssignList();
      }
    }
    if (changes.settings) {
      settings = changes.settings.newValue || settings;
      render();
    }
  });
}

init();
