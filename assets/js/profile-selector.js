/**
 * PromptDeMerde.com — profile-selector.js
 *
 * Synopsis : Sélecteur header Profil JSON (bundle assets/profiles/) — cœur.
 * Objectif : État partagé, helpers internes (PS._*), noms réservés et cycle de vie du sélecteur ; libellés/export dans profile-selector-export.js, actions (import/création) dans profile-selector-actions.js.
 */
(function() {

var PS = {};
window.PDM = window.PDM || {};
window.PDM.ProfileSelector = PS;

PS._busy = false;
PS._reservedNamesNormalized = [];
PS._bundledProfiles = [];
PS._selectorChangeBound = false;

PS._FALLBACK_RESERVED_NAMES = [
    'speech2texte',
    'adsgenerator',
    'videometadescriptor',
    'promptdemerde'
];

PS._getFileStem = function(fileName) {
    var base = String(fileName || '').replace(/^.*[\\/]/, '');
    var dot = base.lastIndexOf('.');
    if (dot > 0) base = base.slice(0, dot);
    return base.trim();
};

/** Minuscules + uniquement a-z0-9 (tirets, espaces, ponctuation ignorés). */
PS._normalizeReservedKey = function(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
};

PS._rememberReservedNames = function(profiles) {
    var seen = {};
    PS._reservedNamesNormalized = [];
    if (!Array.isArray(profiles)) return;
    for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        if (!p) continue;
        var keys = [];
        if (p.id) keys.push(PS._normalizeReservedKey(p.id));
        if (p.label) keys.push(PS._normalizeReservedKey(p.label));
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            if (!key || seen[key]) continue;
            seen[key] = true;
            PS._reservedNamesNormalized.push(key);
        }
    }
};

PS.getReservedNames = function() {
    return (PS._reservedNamesNormalized.length ? PS._reservedNamesNormalized : PS._FALLBACK_RESERVED_NAMES).slice();
};

PS.isReservedImportName = function(fileName) {
    if (!window.PDM.Env || !window.PDM.Env.hasProfileSelector()) return false;
    var key = PS._normalizeReservedKey(PS._getFileStem(fileName));
    if (!key) return false;
    var list = PS._reservedNamesNormalized.length ? PS._reservedNamesNormalized : PS._FALLBACK_RESERVED_NAMES;
    return list.indexOf(key) !== -1;
};

PS._getWrap = function() {
    return document.getElementById('profile-selector-wrap');
};

PS._getCreateBtn = function() {
    return document.getElementById('profile-create-btn');
};

PS._getSelect = function() {
    return document.getElementById('profile-selector');
};

PS._getActiveId = function() {
    if (window.PDM.Storage && typeof window.PDM.Storage.getActiveProfile === 'function') {
        return window.PDM.Storage.getActiveProfile();
    }
    return 'speech2texte';
};

PS._setActiveId = function(id) {
    if (window.PDM.Storage && typeof window.PDM.Storage.setActiveProfile === 'function') {
        window.PDM.Storage.setActiveProfile(id);
    }
};

PS._getEndpoint = function(key, fallback) {
    if (window.PDM.Env && window.PDM.Env.getServerPath) {
        return window.PDM.Env.getServerPath(key) || fallback;
    }
    return fallback;
};

PS._withQuery = function(url, query) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + query;
};

PS._readJsonResponse = function(res, label) {
    return res.text().then(function(text) {
        var payload = null;
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch (e) {
                var preview = text.replace(/\s+/g, ' ').slice(0, 80);
                throw new Error(label + ' n\'a pas renvoyé du JSON (HTTP ' + res.status + ') : ' + preview);
            }
        }
        if (!res.ok) {
            throw new Error((payload && payload.error) ? payload.error : label + ' HTTP ' + res.status);
        }
        return payload;
    });
};

PS.populateSelector = function() {
    var sel = PS._getSelect();
    if (!sel) return;

    var entries = [];
    var i;
    for (i = 0; i < PS._bundledProfiles.length; i++) {
        var bp = PS._bundledProfiles[i];
        if (!bp || !bp.id) continue;
        entries.push({ id: bp.id, label: bp.label || bp.id, custom: false });
    }
    var custom = window.PDM.Storage.getCustomProfiles();
    for (i = 0; i < custom.length; i++) {
        var cp = custom[i];
        if (!cp || !cp.id) continue;
        entries.push({ id: cp.id, label: cp.label || cp.id, custom: true });
    }

    entries.sort(function(a, b) {
        var la = String(a.label).toLowerCase();
        var lb = String(b.label).toLowerCase();
        return la.localeCompare(lb, 'fr', { sensitivity: 'base' });
    });

    var active = PS._getActiveId();
    sel.innerHTML = '';
    for (i = 0; i < entries.length; i++) {
        var e = entries[i];
        var opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.custom ? (e.label + ' (perso)') : e.label;
        sel.appendChild(opt);
    }

    if (sel.querySelector('option[value="' + active + '"]')) {
        sel.value = active;
    } else if (sel.options.length) {
        sel.selectedIndex = 0;
        PS._setActiveId(sel.value);
    }
};

PS.init = function() {
    if (!window.PDM.Env || !window.PDM.Env.hasProfileSelector()) {
        return Promise.resolve();
    }

    var sel = PS._getSelect();
    if (!sel) return Promise.resolve();

    return fetch(PS._getEndpoint('profileManifest', 'lib/api/manifest.php'), { cache: 'no-store' })
        .then(function(res) {
            return PS._readJsonResponse(res, 'manifest profils');
        })
        .then(function(data) {
            if (!data || !data.available || !Array.isArray(data.profiles) || !data.profiles.length) {
                return;
            }

            PS._rememberReservedNames(data.profiles);
            PS._bundledProfiles = data.profiles.slice();

            for (var di = 0; di < PS._bundledProfiles.length; di++) {
                var dp = PS._bundledProfiles[di];
                if (dp && dp.default && window.PDM.Storage &&
                    window.PDM.Storage.get(window.PDM.Storage.KEYS.ACTIVE_PROFILE) == null) {
                    PS._setActiveId(dp.id);
                }
            }

            PS.populateSelector();

            sel.hidden = false;
            var wrap = PS._getWrap();
            if (wrap) wrap.hidden = false;
            var createBtn = PS._getCreateBtn();
            if (createBtn) {
                createBtn.hidden = false;
                if (!createBtn._pdmBound) {
                    createBtn._pdmBound = true;
                    createBtn.addEventListener('click', function() {
                        PS.createNewProfileJson();
                    });
                }
            }
            if (!PS._selectorChangeBound) {
                PS._selectorChangeBound = true;
                sel.addEventListener('change', PS._onChange);
            }
        })
        .catch(function(err) {
            console.warn('[PDM.ProfileSelector]', err && err.message ? err.message : err);
        });
};

PS._onChange = function() {
    if (PS._busy) return;

    var sel = PS._getSelect();
    if (!sel) return;

    var nextId = sel.value;
    var prevId = PS._getActiveId();

    if (nextId === prevId) return;

    if (!confirm('Changer de profil ? Toutes les données locales seront effacées et remplacées par la configuration du profil sélectionné.')) {
        sel.value = prevId;
        return;
    }

    PS._busy = true;
    sel.disabled = true;
    if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(true);

    PS.resolveProfileConfig(nextId)
        .then(function(config) {
            return PS.importProfileConfig(config, nextId);
        })
        .then(function(appliedId) {
            if (window.PDM.WorkspaceUi && typeof window.PDM.WorkspaceUi.syncFromActiveProfile === 'function') {
                return window.PDM.WorkspaceUi.syncFromActiveProfile().then(function() {
                    window.location.reload();
                });
            }
            window.location.reload();
        })
        .catch(function(err) {
            PS._busy = false;
            sel.disabled = false;
            sel.value = prevId;
            var message = err && err.message ? err.message : 'Erreur lors du changement de profil.';
            if (window.PDM.UI && window.PDM.UI.notif) {
                window.PDM.UI.notif(message, 'err');
            } else {
                alert(message);
            }
        })
        .finally(function() {
            if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(false);
        });
};

})();
