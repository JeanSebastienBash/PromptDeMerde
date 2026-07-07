/**
 * PromptDeMerde.com — Sélection et application des thèmes visuels de l'interface.
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

T.list = function() { return THEMES; };

T.get = function(id) {
    for (var i = 0; i < THEMES.length; i++) {
        if (THEMES[i].id === id) return THEMES[i];
    }
    return THEMES[1];
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
        items[i].classList.toggle('active', items[i].dataset.theme === activeId);
    }
};

window.PDM = window.PDM || {};
window.PDM.Themes = T;
})();