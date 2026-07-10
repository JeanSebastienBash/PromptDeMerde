/**
 * PromptDeMerde.com — themes.js
 *
 * Synopsis : Gestion des 23 thèmes visuels, ordonnés par familles (clair/sombre adjacents).
 * Objectif : Appliquer le thème choisi (localStorage pdm_theme) sur document.documentElement.
 */
(function(){

var T = {};

var THEMES = [
    { id:'light', name:'Cassé', icon:'☀️', preview:'#f5f0eb',
      vars:{
        '--bg-black':'#f5f0eb','--bg-dark':'#e8e2db','--surface':'#d8d0c6',
        '--text-white':'#2a2a2a','--text-muted':'#6b6560',
        '--accent-red':'#c0392b','--accent-hover':'#d44637',
        '--border':'#c8c0b4','--success':'#389e0d','--error':'#c0392b',
        '--btn-text':'#ffffff','--input-bg':'#ede7e0','--input-focus-bg':'#f5f0eb',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'day', name:'Jour', icon:'🌤️', preview:'#f4f5f7',
      vars:{
        '--bg-black':'#f4f5f7','--bg-dark':'#e8eaef','--surface':'#d8dce4',
        '--text-white':'#1c1e24','--text-muted':'#5a6170',
        '--accent-red':'#e84057','--accent-hover':'#f05a6e',
        '--border':'#c4cad4','--success':'#1a9d55','--error':'#e84057',
        '--btn-text':'#ffffff','--input-bg':'#eef0f4','--input-focus-bg':'#f8f9fb',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'orange-day', name:'Orange clair', icon:'🍊', preview:'#faf3e8',
      vars:{
        '--bg-black':'#faf3e8','--bg-dark':'#f0e4d0','--surface':'#e6d6bc',
        '--text-white':'#2a2218','--text-muted':'#7a6a52',
        '--accent-red':'#e07800','--accent-hover':'#f09020',
        '--border':'#d4c4a8','--success':'#5a9a18','--error':'#d85030',
        '--btn-text':'#ffffff','--input-bg':'#f5ead8','--input-focus-bg':'#faf3e8',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'red-day', name:'Rouge clair', icon:'🌹', preview:'#faf0f0',
      vars:{
        '--bg-black':'#faf0f0','--bg-dark':'#f0e0e0','--surface':'#e6d0d0',
        '--text-white':'#2a1818','--text-muted':'#8a6060',
        '--accent-red':'#d83838','--accent-hover':'#e85050',
        '--border':'#d4b8b8','--success':'#2a9a50','--error':'#d83838',
        '--btn-text':'#ffffff','--input-bg':'#f5e6e6','--input-focus-bg':'#faf0f0',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'gray-day', name:'Gris clair', icon:'🩶', preview:'#f2f4f8',
      vars:{
        '--bg-black':'#f2f4f8','--bg-dark':'#e6eaf2','--surface':'#d8deea',
        '--text-white':'#1e2228','--text-muted':'#5a6478',
        '--accent-red':'#3a7bd8','--accent-hover':'#5090e8',
        '--border':'#c0c8d8','--success':'#2a9a68','--error':'#d84848',
        '--btn-text':'#ffffff','--input-bg':'#e8ecf4','--input-focus-bg':'#f2f4f8',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'yellow-day', name:'Jaune clair', icon:'🌻', preview:'#faf8e8',
      vars:{
        '--bg-black':'#faf8e8','--bg-dark':'#f0ecd0','--surface':'#e8e2b8',
        '--text-white':'#2a2810','--text-muted':'#7a7448',
        '--accent-red':'#c8a800','--accent-hover':'#e0c020',
        '--border':'#d8d0a0','--success':'#4a9a20','--error':'#d84838',
        '--btn-text':'#2a2810','--input-bg':'#f5f0d8','--input-focus-bg':'#faf8e8',
        '--text-on-accent':'#2a2810'
      }
    },
    { id:'fuchsia-day', name:'Fuchsia clair', icon:'🪻', preview:'#f8f0fa',
      vars:{
        '--bg-black':'#f8f0fa','--bg-dark':'#ece0f0','--surface':'#e0cce8',
        '--text-white':'#281830','--text-muted':'#785a88',
        '--accent-red':'#c02898','--accent-hover':'#d840b0',
        '--border':'#d0b8d8','--success':'#2a9a58','--error':'#c02898',
        '--btn-text':'#ffffff','--input-bg':'#f0e4f4','--input-focus-bg':'#f8f0fa',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'ocean-day', name:'Océan clair', icon:'🏖️', preview:'#eef6fa',
      vars:{
        '--bg-black':'#eef6fa','--bg-dark':'#dceaf2','--surface':'#c8dce8',
        '--text-white':'#102028','--text-muted':'#4a6878',
        '--accent-red':'#0898b8','--accent-hover':'#20b0d0',
        '--border':'#b8d0dc','--success':'#1a9a50','--error':'#d84848',
        '--btn-text':'#ffffff','--input-bg':'#e4f0f6','--input-focus-bg':'#eef6fa',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'forest-day', name:'Forêt claire', icon:'🌿', preview:'#eef6ee',
      vars:{
        '--bg-black':'#eef6ee','--bg-dark':'#dceadc','--surface':'#c8dcc8',
        '--text-white':'#102010','--text-muted':'#4a6848',
        '--accent-red':'#2a9a30','--accent-hover':'#40b048',
        '--border':'#b8d4b8','--success':'#2a9a30','--error':'#d84848',
        '--btn-text':'#ffffff','--input-bg':'#e4f2e4','--input-focus-bg':'#eef6ee',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'cyber-day', name:'Cyber clair', icon:'💠', preview:'#f0f0f8',
      vars:{
        '--bg-black':'#f0f0f8','--bg-dark':'#e0e0f0','--surface':'#d0d0e8',
        '--text-white':'#181828','--text-muted':'#585878',
        '--accent-red':'#0088a8','--accent-hover':'#00a8c8',
        '--border':'#c0c0d8','--success':'#1a9a68','--error':'#d84868',
        '--btn-text':'#ffffff','--input-bg':'#e8e8f4','--input-focus-bg':'#f0f0f8',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'rose-day', name:'Rose clair', icon:'🌷', preview:'#faf0f4',
      vars:{
        '--bg-black':'#faf0f4','--bg-dark':'#f0e0e8','--surface':'#e8ccd8',
        '--text-white':'#281820','--text-muted':'#886070',
        '--accent-red':'#d84868','--accent-hover':'#f06080',
        '--border':'#d8b8c4','--success':'#2a9a58','--error':'#d84868',
        '--btn-text':'#ffffff','--input-bg':'#f5e6ec','--input-focus-bg':'#faf0f4',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'terminal-day', name:'Terminal clair', icon:'📄', preview:'#f4f8f4',
      vars:{
        '--bg-black':'#f4f8f4','--bg-dark':'#e8f0e8','--surface':'#dce8dc',
        '--text-white':'#0a2810','--text-muted':'#3a6840',
        '--accent-red':'#109028','--accent-hover':'#28a840',
        '--border':'#b8d0b8','--success':'#109028','--error':'#d03030',
        '--btn-text':'#ffffff','--input-bg':'#ecf4ec','--input-focus-bg':'#f4f8f4',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'dark', name:'Sombre', icon:'🌙', preview:'#181818',
      vars:{
        '--bg-black':'#181818','--bg-dark':'#262626','--surface':'#333333',
        '--text-white':'#e8e8e8','--text-muted':'#a0a0a0',
        '--accent-red':'#e84057','--accent-hover':'#f05a6e',
        '--border':'#484848','--success':'#2ecc71','--error':'#e84057',
        '--btn-text':'#ffffff','--input-bg':'#1e1e1e','--input-focus-bg':'#2a2a2a',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'orange', name:'Orange', icon:'🔥', preview:'#1a1208',
      vars:{
        '--bg-black':'#1a1208','--bg-dark':'#2a1e10','--surface':'#3a2c18',
        '--text-white':'#f0dcc0','--text-muted':'#b8a080',
        '--accent-red':'#ff8c00','--accent-hover':'#ffa030',
        '--border':'#4a3820','--success':'#7acc00','--error':'#ff6347',
        '--btn-text':'#ffffff','--input-bg':'#1a1208','--input-focus-bg':'#2a1e10',
        '--text-on-accent':'#1a1208'
      }
    },
    { id:'red', name:'Rouge', icon:'🔴', preview:'#1a0808',
      vars:{
        '--bg-black':'#1a0808','--bg-dark':'#2a1212','--surface':'#3d1c1c',
        '--text-white':'#f0c8c8','--text-muted':'#b87878',
        '--accent-red':'#e85050','--accent-hover':'#f06868',
        '--border':'#4a2626','--success':'#44dd88','--error':'#e85050',
        '--btn-text':'#ffffff','--input-bg':'#1a0808','--input-focus-bg':'#2a1212',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'gray', name:'Gris', icon:'🔘', preview:'#1e1e1e',
      vars:{
        '--bg-black':'#1e1e1e','--bg-dark':'#282828','--surface':'#363636',
        '--text-white':'#d0d0d0','--text-muted':'#909090',
        '--accent-red':'#8ab4f8','--accent-hover':'#a0c4ff',
        '--border':'#4a4a4a','--success':'#66d9a0','--error':'#f87171',
        '--btn-text':'#1e1e1e','--input-bg':'#1e1e1e','--input-focus-bg':'#282828',
        '--text-on-accent':'#1e1e1e'
      }
    },
    { id:'yellow', name:'Jaune', icon:'💛', preview:'#141208',
      vars:{
        '--bg-black':'#141208','--bg-dark':'#22201a','--surface':'#33301e',
        '--text-white':'#f0e8c0','--text-muted':'#a09868',
        '--accent-red':'#f0c828','--accent-hover':'#ffd640',
        '--border':'#4a4628','--success':'#66dd44','--error':'#e85050',
        '--btn-text':'#141208','--input-bg':'#141208','--input-focus-bg':'#22201a',
        '--text-on-accent':'#141208'
      }
    },
    { id:'fuchsia', name:'Fuchsia', icon:'💜', preview:'#140818',
      vars:{
        '--bg-black':'#140818','--bg-dark':'#261428','--surface':'#361e38',
        '--text-white':'#e8c0f0','--text-muted':'#a078a8',
        '--accent-red':'#e040a0','--accent-hover':'#f058b4',
        '--border':'#462848','--success':'#44dd88','--error':'#e040a0',
        '--btn-text':'#ffffff','--input-bg':'#140818','--input-focus-bg':'#261428',
        '--text-on-accent':'#ffffff'
      }
    },
    { id:'ocean', name:'Océan', icon:'🌊', preview:'#081418',
      vars:{
        '--bg-black':'#081418','--bg-dark':'#102228','--surface':'#183038',
        '--text-white':'#c0e0f0','--text-muted':'#6898a8',
        '--accent-red':'#18b8d8','--accent-hover':'#30cce0',
        '--border':'#284048','--success':'#2ecc71','--error':'#e85050',
        '--btn-text':'#081418','--input-bg':'#081418','--input-focus-bg':'#102228',
        '--text-on-accent':'#081418'
      }
    },
    { id:'forest', name:'Forêt', icon:'🌲', preview:'#081408',
      vars:{
        '--bg-black':'#081408','--bg-dark':'#142214','--surface':'#1e321c',
        '--text-white':'#c8e8c0','--text-muted':'#78a870',
        '--accent-red':'#44cc44','--accent-hover':'#60dd60',
        '--border':'#284228','--success':'#44cc44','--error':'#e85050',
        '--btn-text':'#081408','--input-bg':'#081408','--input-focus-bg':'#142214',
        '--text-on-accent':'#081408'
      }
    },
    { id:'cyber', name:'Cyber', icon:'🤖', preview:'#0a0a14',
      vars:{
        '--bg-black':'#0a0a14','--bg-dark':'#141422','--surface':'#1e1e30',
        '--text-white':'#d0d0f0','--text-muted':'#7878a0',
        '--accent-red':'#00f0ff','--accent-hover':'#40f8ff',
        '--border':'#2a2a3e','--success':'#44ff88','--error':'#ff4060',
        '--btn-text':'#0a0a14','--input-bg':'#0a0a14','--input-focus-bg':'#141422',
        '--text-on-accent':'#0a0a14'
      }
    },
    { id:'rose', name:'Rose', icon:'🌸', preview:'#180810',
      vars:{
        '--bg-black':'#180810','--bg-dark':'#281420','--surface':'#381e2c',
        '--text-white':'#f0c8d8','--text-muted':'#a87888',
        '--accent-red':'#f06888','--accent-hover':'#ff80a0',
        '--border':'#482838','--success':'#66dd88','--error':'#f06888',
        '--btn-text':'#ffffff','--input-bg':'#180810','--input-focus-bg':'#281420',
        '--text-on-accent':'#180810'
      }
    },
    { id:'terminal', name:'Terminal', icon:'📟', preview:'#0a0a0a',
      vars:{
        '--bg-black':'#0a0a0a','--bg-dark':'#141414','--surface':'#1e1e1e',
        '--text-white':'#00ff41','--text-muted':'#009920',
        '--accent-red':'#00ff41','--accent-hover':'#33ff66',
        '--border':'#1e3e1e','--success':'#00ff41','--error':'#ff4444',
        '--btn-text':'#0a0a0a','--input-bg':'#0a0a0a','--input-focus-bg':'#141414',
        '--text-on-accent':'#0a0a0a'
      }
    }
];

/** Ordre affichage / bouton header : neutres puis chaque famille clair → sombre. */
(function resortThemesByFamily() {
    var order = [
        'light', 'day', 'dark',
        'orange-day', 'orange',
        'red-day', 'red',
        'gray-day', 'gray',
        'yellow-day', 'yellow',
        'fuchsia-day', 'fuchsia',
        'ocean-day', 'ocean',
        'forest-day', 'forest',
        'cyber-day', 'cyber',
        'rose-day', 'rose',
        'terminal-day', 'terminal'
    ];
    var byId = {};
    for (var i = 0; i < THEMES.length; i++) byId[THEMES[i].id] = THEMES[i];
    var sorted = [];
    for (var j = 0; j < order.length; j++) {
        if (byId[order[j]]) sorted.push(byId[order[j]]);
    }
    THEMES = sorted;
})();

T.list = function() { return THEMES; };

T.get = function(id) {
    for (var i = 0; i < THEMES.length; i++) {
        if (THEMES[i].id === id) return THEMES[i];
    }
    for (var j = 0; j < THEMES.length; j++) {
        if (THEMES[j].id === 'dark') return THEMES[j];
    }
    return THEMES[0];
};

T.current = function() {
    var saved = window.PDM.Storage.get(window.PDM.Storage.KEYS.THEME);
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
};

T.apply = function(id) {
    var theme = T.get(id);
    var root = document.documentElement;
    root.setAttribute('data-theme', id);
    var vars = theme.vars;
    for (var key in vars) {
        if (vars.hasOwnProperty(key)) {
            root.style.setProperty(key, vars[key]);
        }
    }
    /* Zones Output workspace — contrast lisible, calées sur le thème choisi */
    root.style.setProperty('--output-bg', vars['--input-bg']);
    root.style.setProperty('--output-text', vars['--text-white']);
    root.style.setProperty('--output-highlight', vars['--success']);
    root.style.setProperty('--thinking-bg', vars['--input-bg']);
    root.style.setProperty('--thinking-text', vars['--text-white']);
    root.style.setProperty('--thinking-accent', vars['--accent-red']);
    window.PDM.Storage.set(window.PDM.Storage.KEYS.THEME, id);
    T.updateToggleIcon(id);
    T.updatePicker(id);
};

T.init = function() {
    var id = T.current();
    T.apply(id);
};

T.toggleLightDark = function() {
    var cur = T.current();
    var ids = [];
    for (var i = 0; i < THEMES.length; i++) ids.push(THEMES[i].id);
    var idx = ids.indexOf(cur);
    var next = ids[(idx + 1) % ids.length];
    T.apply(next);
};

T.updateToggleIcon = function(id) {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var theme = T.get(id);
    btn.textContent = theme.icon;
    btn.title = 'Th\u00e8me : ' + theme.name;
    var btnMobile = document.getElementById('theme-toggle-mobile');
    if (btnMobile) {
        btnMobile.textContent = theme.icon + ' ' + theme.name;
    }
};

T.updatePicker = function(activeId) {
    var items = document.querySelectorAll('.theme-swatch');
    for (var i = 0; i < items.length; i++) {
        var isActive = items[i].dataset.theme === activeId;
        items[i].classList.toggle('active', isActive);
        items[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
    }
    if (window.PDM.UI && window.PDM.UI.updateThemeCurrentLabel) {
        window.PDM.UI.updateThemeCurrentLabel(activeId);
    }
};

window.PDM = window.PDM || {};
window.PDM.Themes = T;
})();