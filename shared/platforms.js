// ReThread Platform Configurations
// Loaded as a content script before content-script.js (no ES module imports)
// To add a new platform: add an entry here, update manifest.json matches,
// add CSS rules in content/content-styles.css with :host(.platform-<id>)

// eslint-disable-next-line no-unused-vars
var PLATFORMS = {
  claude: {
    id: 'claude',
    name: 'Claude',
    hostnames: ['claude.ai'],
    chatUrlPattern: /\/chat\/([a-f0-9-]+)/,
    getTitle: function () {
      return (document.title || '').replace(/\s*[-\u2013\u2014]\s*Claude\s*$/, '').trim() || 'Untitled chat';
    },
    getButtonAnchor: function () {
      // Floating position (CSS handles placement) — override for anchored injection
      return null;
    },
    buttonPosition: 'afterend',
    icon: '../icons/platform-claude.svg',
    cssClass: null
  },

  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    hostnames: ['chatgpt.com', 'chat.openai.com'],
    chatUrlPattern: /\/c\/([a-zA-Z0-9-]+)/,
    getTitle: function () {
      return (document.title || '')
        .replace(/\s*[-\u2013\u2014]\s*ChatGPT\s*$/, '')
        .replace(/^ChatGPT\s*$/, '')
        .trim() || 'Untitled chat';
    },
    getButtonAnchor: function () {
      return null;
    },
    buttonPosition: 'afterend',
    icon: '../icons/platform-gpt.svg',
    cssClass: 'platform-chatgpt'
  },

  gemini: {
    id: 'gemini',
    name: 'Gemini',
    hostnames: ['gemini.google.com'],
    chatUrlPattern: /\/app\/([a-zA-Z0-9]+)/,
    getTitle: function () {
      return (document.title || '')
        .replace(/\s*[-\u2013\u2014]\s*Google Gemini\s*$/, '')
        .replace(/\s*[-\u2013\u2014]\s*Gemini\s*$/, '')
        .trim() || 'Untitled chat';
    },
    getButtonAnchor: function () {
      return null;
    },
    buttonPosition: 'fixed',
    icon: '../icons/platform-gemini.svg',
    cssClass: 'platform-gemini'
  },

  grok: {
    id: 'grok',
    name: 'Grok',
    hostnames: ['grok.com'],
    chatUrlPattern: /\/c\/([a-f0-9-]+)/,
    getTitle: function () {
      return (document.title || '')
        .replace(/\s*[-\u2013\u2014]\s*Grok\s*$/, '')
        .trim() || 'Untitled chat';
    },
    getButtonAnchor: function () {
      return null;
    },
    buttonPosition: 'fixed',
    icon: '../icons/platform-grok.svg',
    cssClass: 'platform-grok'
  }
};
