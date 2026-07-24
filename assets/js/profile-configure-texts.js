/**
 * PromptDeMerde.com — profile-configure-texts.js
 *
 * Synopsis : Liste filtrable des textes workspace_ui dans Configurer le profil.
 * Objectif : Construire le panneau Textes sans grossir profile-configure-form.js.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-configure-texts.js] PDM.ProfileSelector not found.'); return; }

PS._applyConfigureTextsFilter = function() {
    var list = document.getElementById('cfg-texts-list');
    var filter = document.getElementById('cfg-texts-filter');
    if (!list) return;
    var q = String((filter && filter.value) || '').toLowerCase().trim();
    var rows = list.querySelectorAll('.configure-text-row');
    for (var r = 0; r < rows.length; r++) {
        var k = rows[r].getAttribute('data-text-key') || '';
        var inp = rows[r].querySelector('[data-cfg-text]');
        var v = inp ? String(inp.value || '') : '';
        var hay = (k + '\n' + v).toLowerCase();
        rows[r].hidden = !!(q && hay.indexOf(q) < 0);
    }
};

PS._bindConfigureTextsFilterOnce = function() {
    var filter = document.getElementById('cfg-texts-filter');
    if (!filter || filter._cfgBound) return;
    filter._cfgBound = true;
    filter.addEventListener('input', function() { PS._applyConfigureTextsFilter(); });
};

PS._buildConfigureTextsList = function(texts) {
    var list = document.getElementById('cfg-texts-list');
    if (!list) return;
    var CS = window.PDM && window.PDM.ConfigSchema;
    var keys = CS && CS.WORKSPACE_UI_TEXT_KEYS ? CS.WORKSPACE_UI_TEXT_KEYS.slice() : Object.keys(texts);
    list.innerHTML = '';
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var row = document.createElement('label');
        row.className = 'configure-text-row';
        row.setAttribute('data-text-key', key);
        var lab = document.createElement('span');
        lab.className = 'configure-text-key';
        lab.textContent = key;
        var inp = document.createElement('textarea');
        inp.className = 'stg-input configure-text-input';
        inp.rows = 2;
        inp.setAttribute('data-cfg-text', key);
        inp.value = texts[key] != null ? String(texts[key]) : '';
        row.appendChild(lab);
        row.appendChild(inp);
        list.appendChild(row);
    }
    PS._bindConfigureTextsFilterOnce();
    PS._applyConfigureTextsFilter();
};

PS._collectConfigureTexts = function() {
    var out = {};
    var nodes = document.querySelectorAll('[data-cfg-text]');
    for (var i = 0; i < nodes.length; i++) {
        var k = nodes[i].getAttribute('data-cfg-text');
        if (k) out[k] = String(nodes[i].value || '');
    }
    return out;
};

})();
