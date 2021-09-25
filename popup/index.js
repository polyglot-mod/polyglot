const getHost = () => chrome.extension.getBackgroundPage().host;

const hotLoadPlugin = (host, name) => chrome.extension.getBackgroundPage().sendHostMsg(getHost(), { loadPlugin: [ host, name ] })
const hotUnloadPlugin = (name) => chrome.extension.getBackgroundPage().sendHostMsg(getHost(), { unloadPlugin: [ name ] })

const hostFriendlyNames = {
  'app.revolt.chat': 'Revolt',
  'app.element.io': 'Element',
  'www.guilded.gg': 'Guilded',
  'app.slack.com': 'Slack',
  'teams.microsoft.com': 'Teams'
};

let pluginsEnabled, plugins;

const makeSwitch = (listener, initial = false) => {
  const switchEl = document.createElement('label');
  switchEl.className = 'switch';
  if (initial) switchEl.classList.add('on');
  
  const switchInputChildEl = document.createElement('input');
  switchInputChildEl.type = 'checkbox';
  switchInputChildEl.checked = initial;
  
  switchInputChildEl.onchange = () => {
    const value = switchInputChildEl.checked;
    
    setTimeout(() => {
      if (value) switchEl.classList.add('on');
      else switchEl.classList.remove('on');
    }, 160);

    listener(value);
  };
  
  switchEl.appendChild(switchInputChildEl);
  
  const switchDivChildEl = document.createElement('div');
  switchEl.appendChild(switchDivChildEl);
  
  return switchEl;
};

const makeOptions = (target, header, items, clear = true) => {
  if (clear) target.innerHTML = '';

  const hostEl = document.createElement('div');
  hostEl.className = 'header';
  hostEl.textContent = header;
  
  target.appendChild(hostEl);
  
  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'item';
    
    const nameEl = document.createElement('div');
    nameEl.className = 'item-name';
    nameEl.textContent = item[0];
    
    el.appendChild(nameEl);
    
    const switchEl = makeSwitch(item[2], item[1]);
    
    el.appendChild(switchEl);
    
    target.appendChild(el);
  }
};

const makePluginContent = (target, themes = false) => {
  const host = getHost();
  
  if (!plugins[host]) return;

  makeOptions(target, themes ? 'Themes' : 'Plugins for ' + hostFriendlyNames[host], (themes ? plugins.themes : plugins[host]).map((x) => ([
    x.split('.').slice(0, -1).join('.'),
    pluginsEnabled[host + '-' + x],
    (value) => {
      if (value) hotLoadPlugin(themes ? 'themes' : host, x);
        else hotUnloadPlugin(x);

      pluginsEnabled[host + '-' + x] = value;
      chrome.storage.local.set({ enabled: JSON.stringify(pluginsEnabled) });
    }
  ])));
};

const init = async () => {
  await new Promise((res) => {
    chrome.storage.local.get(null, (data) => {
      pluginsEnabled = JSON.parse(data.enabled || '{}');
      
      res();
    });
  });
  
  plugins = await (await fetch(`https://polyglot-mod.github.io/plugins/plugins.json?_${Date.now()}`)).json();
  
  const activeTab = localStorage.getItem('activeTab') || 'plugins';

  const tabs = {
    'plugins': pluginsTab,
    'themes': themesTab,
    'settings': settingsTab
  };

  transitionActiveTab(tabs[activeTab]);


  if (activeTab === 'settings') {
    return openSettings();
  }
  
  makePluginContent(document.querySelector('.content'), activeTab === 'themes');
};

init();

const themesTab = document.getElementById('themes-tab');
const pluginsTab = document.getElementById('plugins-tab');
const settingsTab = document.getElementById('settings-tab');

const tabHighlight = document.getElementById('tab-highlight');

const transitionActiveTab = (el) => {
  [themesTab, pluginsTab, settingsTab].forEach((x) => x.classList.remove('active'));

  const box = el.getBoundingClientRect();

  tabHighlight.style.borderRadius = getComputedStyle(el).borderRadius;

  tabHighlight.style.left = box.left + 'px';
  tabHighlight.style.top = box.top + 'px';
  tabHighlight.style.width = box.width + 'px';
  tabHighlight.style.height = box.height + 'px';

  setTimeout(() => {
    el.classList.add('active');
  }, 150);
};

pluginsTab.onclick = () => {
  transitionActiveTab(pluginsTab);
  
  makePluginContent(document.querySelector('.content'), false);
  localStorage.setItem('activeTab', 'plugins');
};

themesTab.onclick = () => {
  transitionActiveTab(themesTab);
  
  makePluginContent(document.querySelector('.content'), true);
  localStorage.setItem('activeTab', 'themes');
};

settingsTab.onclick = () => {
  transitionActiveTab(settingsTab);
  
  openSettings();
  localStorage.setItem('activeTab', 'settings');
};

const openSettings = () => {
  const target = document.querySelector('.content');

  target.innerHTML = '';

  makeOptions(target, 'UI', ['Disable App Accents'].map((x) => ([x, localStorage.getItem(x) === 'true', (value) => {
    localStorage.setItem(x, value);

    setTimeout(() => { location.reload() }, 300);
  }])), false);
};

document.body.id = getHost();

if (localStorage.getItem('Disable App Accents') !== 'true') document.body.classList.add('app-accents');