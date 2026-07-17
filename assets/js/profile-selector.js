/**
 * PromptDeMerde.com — profile-selector.js
 *
 * Synopsis : Sélecteur Options Profil JSON (bundle assets/profiles/) — cœur.
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
PS._selectorAppliedId = null;

function psT(key, vars, fallback) {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        var val = I.t('settings.' + key, vars);
        if (val && val.indexOf('settings.' + key) !== 0) return val;
    }
    return fallback != null ? fallback : '';
}
PS.t = psT;

function psSortLocale() {
    var I = window.PDM && window.PDM.I18n;
    return I && typeof I.getLocale === 'function' ? I.getLocale() : 'fr';
}

PS._FALLBACK_RESERVED_NAMES = ['promptdemerde'];

PS._getFileStem = function(fileName) {
    var base = String(fileName || '').replace(/^.*[\\/]/, '');
    var dot = base.lastIndexOf('.');
    if (dot > 0) base = base.slice(0, dot);
    return base.trim();
};

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

PS._getSelect = function() {
    return document.getElementById('profile-selector');
};

PS._getCreateBtn = function() {
    return document.getElementById('profile-create-btn');
};

PS._getActiveId = function() {
    if (window.PDM.Storage && typeof window.PDM.Storage.getActiveProfile === 'function') {
        return window.PDM.Storage.getActiveProfile();
    }
    var I = window.PDM && window.PDM.I18n;
    if (I && typeof I.getBootProfileId === 'function') {
        return I.getBootProfileId() || '';
    }
    return '';
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

PS._getAssembleLang = function() {
    var I = window.PDM && window.PDM.I18n;
    if (I) {
        if (typeof I.getProfileLang === 'function') {
            return I.getProfileLang();
        }
        if (typeof I.getLocale === 'function') {
            var loc = I.getLocale();
            return loc === 'fr' ? 'fr' : 'en';
        }
    }
    return 'fr';
};

PS._withQuery = function(url, query) {
    return url + (url.indexOf('?') === -1 ? '?' : '&') + query;
};

PS.profileJsonUrl = function(id) {
    id = String(id || '').trim();
    try {
        return new URL('assets/profiles/' + encodeURIComponent(id) + '/parts/config.json', document.baseURI).toString();
    } catch (e) {
        return 'assets/profiles/' + encodeURIComponent(id) + '/parts/config.json';
    }
};

PS._readJsonResponse = function(res, label) {
    return res.text().then(function(text) {
        var payload = null;
        if (text) {
            try {
                payload = JSON.parse(text);
            } catch (e) {
                var preview = text.replace(/\s+/g, ' ').slice(0, 80);
                throw new Error(psT('profileJsonInvalid', {
                    label: label,
                    status: res.status,
                    preview: preview
                }, label + ' n\'a pas renvoyé du JSON (HTTP ' + res.status + ') : ' + preview));
            }
        }
        if (!res.ok) {
            throw new Error((payload && payload.error) ? payload.error : psT('profileHttpError', {
                label: label,
                status: res.status
            }, label + ' HTTP ' + res.status));
        }
        return payload;
    });
};

PS.getBundledSynopsisRaw = function(profileId) {
    for (var i = 0; i < PS._bundledProfiles.length; i++) {
        var p = PS._bundledProfiles[i];
        if (p && p.id === profileId && p.synopsis) {
            return String(p.synopsis);
        }
    }
    return '';
};

PS.getBundledSynopsis = function(profileId) {
    var SR = window.PDM && window.PDM.SynopsisResolve;
    var lang = PS._getAssembleLang ? PS._getAssembleLang() : '';
    if (SR && typeof SR.resolveBundledProfileSynopsis === 'function') {
        return SR.resolveBundledProfileSynopsis(profileId, lang);
    }
    return PS.getBundledSynopsisRaw(profileId);
};

PS._selectHasOption = function(sel, id) {
    if (!sel || id == null) return false;
    id = String(id);
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === id) return true;
    }
    return false;
};

PS._syncSelectorToActive = function() {
    var sel = PS._getSelect();
    if (!sel) return;
    var active = PS._getActiveId();
    PS._selectorAppliedId = active;
    if (PS._selectHasOption(sel, active)) {
        sel.value = active;
    }
};

PS._entryExists = function(entries, id) {
    for (var i = 0; i < entries.length; i++) {
        if (entries[i] && entries[i].id === id) return true;
    }
    return false;
};

PS._dedupeStoredCustomProfiles = function() {
    if (!window.PDM.Storage || typeof window.PDM.Storage.getCustomProfiles !== 'function') return;
    var list = window.PDM.Storage.getCustomProfiles();
    if (!list.length) return;
    var active = PS._getActiveId();
    var bestByLabel = {};
    var order = [];
    for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (!p || !p.id) continue;
        var key = String(p.label || p.id).trim().toLowerCase();
        if (!key) key = String(p.id);
        if (!bestByLabel[key]) {
            bestByLabel[key] = p;
            order.push(key);
            continue;
        }
        var keep = bestByLabel[key];
        var replace = false;
        if (active && p.id === active && keep.id !== active) {
            replace = true;
        } else if (!active || (keep.id !== active && p.id !== active)) {
            var keepAt = keep.updatedAt ? Date.parse(keep.updatedAt) : 0;
            var candAt = p.updatedAt ? Date.parse(p.updatedAt) : 0;
            if (candAt > keepAt) replace = true;
        }
        if (replace) bestByLabel[key] = p;
    }
    var next = [];
    for (var j = 0; j < order.length; j++) {
        next.push(bestByLabel[order[j]]);
    }
    if (next.length === list.length) return;
    if (window.PDM.Storage.set) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.CUSTOM_PROFILES, next);
    }
};

PS.populateSelector = function() {
    PS._dedupeStoredCustomProfiles();
    var sel = PS._getSelect();
    if (!sel) return;

    var entries = [];
    var i;
    for (i = 0; i < PS._bundledProfiles.length; i++) {
        var bp = PS._bundledProfiles[i];
        if (!bp || !bp.id) continue;
        entries.push({ id: bp.id, label: bp.label || bp.id, custom: false });
    }
    if (window.PDM.Storage && typeof window.PDM.Storage.getCustomProfiles === 'function') {
        var custom = window.PDM.Storage.getCustomProfiles();
        var seenCustom = {};
        for (i = 0; i < custom.length; i++) {
            var cp = custom[i];
            if (!cp || !cp.id || seenCustom[cp.id]) continue;
            seenCustom[cp.id] = true;
            entries.push({ id: cp.id, label: cp.label || cp.id, custom: true });
        }
    }

    var active = PS._getActiveId();
    if (active && !PS._entryExists(entries, active)) {
        var orphanLabel = active;
        var orphanCustom = window.PDM.Storage && typeof window.PDM.Storage.isCustomProfileId === 'function' &&
            window.PDM.Storage.isCustomProfileId(active);
        if (orphanCustom && typeof window.PDM.Storage.getCustomProfile === 'function') {
            var orphanCp = window.PDM.Storage.getCustomProfile(active);
            if (orphanCp && orphanCp.label) orphanLabel = orphanCp.label;
        }
        entries.push({ id: active, label: orphanLabel, custom: !!orphanCustom });
    }

    entries.sort(function(a, b) {
        var la = String(a.label).toLowerCase();
        var lb = String(b.label).toLowerCase();
        return la.localeCompare(lb, psSortLocale(), { sensitivity: 'base' });
    });

    var personalSuffix = psT('profilePersonalSuffix', null, ' (perso)');
    sel.innerHTML = '';
    for (i = 0; i < entries.length; i++) {
        var e = entries[i];
        var opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.custom ? (e.label + personalSuffix) : e.label;
        sel.appendChild(opt);
    }

    PS._selectorAppliedId = active;
    if (PS._selectHasOption(sel, active)) {
        sel.value = active;
    } else if (sel.options.length) {
        sel.selectedIndex = 0;
    }
};

PS._fetchBundledProfiles = function() {
    if (!window.PDM.Env || !window.PDM.Env.hasProfileSelector()) {
        return Promise.resolve(null);
    }
    return fetch(
        PS._withQuery(
            PS._getEndpoint('profileManifest', 'lib/api/manifest.php'),
            'lang=' + encodeURIComponent(PS._getAssembleLang())
        ),
        { cache: 'no-store' }
    )
        .then(function(res) {
            return PS._readJsonResponse(res, psT('profileManifestLabel', null, 'manifest profils'));
        });
};

PS.reloadBundledProfiles = function() {
    return PS._fetchBundledProfiles().then(function(data) {
        if (data && data.available && Array.isArray(data.profiles) && data.profiles.length) {
            PS._rememberReservedNames(data.profiles);
            PS._bundledProfiles = data.profiles.slice();
        }
        if (PS._bundledProfiles.length || (window.PDM.Storage && window.PDM.Storage.getCustomProfiles().length)) {
            PS.populateSelector();
            return true;
        }
        return false;
    }).catch(function(err) {
        console.warn('[PDM.ProfileSelector]', err && err.message ? err.message : err);
        if (PS._bundledProfiles.length || (window.PDM.Storage && window.PDM.Storage.getCustomProfiles().length)) {
            PS.populateSelector();
        }
        return false;
    });
};

PS.init = function() {
    if (!window.PDM.Env || !window.PDM.Env.hasProfileSelector()) {
        return Promise.resolve();
    }

    var sel = PS._getSelect();
    if (!sel) return Promise.resolve();

    return PS._fetchBundledProfiles()
        .then(function(data) {
            if (!data || !data.available || !Array.isArray(data.profiles) || !data.profiles.length) {
                return;
            }

            PS._rememberReservedNames(data.profiles);
            PS._bundledProfiles = data.profiles.slice();

            for (var di = 0; di < PS._bundledProfiles.length; di++) {
                var dp = PS._bundledProfiles[di];
                if (!dp || !dp.default || !window.PDM.Storage) continue;
                var rawActive = window.PDM.Storage.get(window.PDM.Storage.KEYS.ACTIVE_PROFILE);
                if (rawActive != null && String(rawActive).trim() !== '') continue;
                var I = window.PDM && window.PDM.I18n;
                if (I && typeof I.isBundledProfileId === 'function' && !I.isBundledProfileId(dp.id)) {
                    continue;
                }
                PS._setActiveId(dp.id);
            }

            PS.populateSelector();

            sel.hidden = false;
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
    var prevId = PS._selectorAppliedId != null ? PS._selectorAppliedId : PS._getActiveId();

    if (!nextId || nextId === prevId) {
        if (PS._selectHasOption(sel, prevId)) sel.value = prevId;
        return;
    }

    if (!confirm(psT('profileSwitchConfirm', null,
        'Changer de profil ? Toutes les données locales seront effacées et remplacées par la configuration du profil sélectionné.'))) {
        sel.value = prevId;
        return;
    }

    var runSwitch = function() {
        PS._busy = true;
        sel.disabled = true;
        if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(true);

        PS.resolveProfileConfig(nextId)
            .then(function(config) {
                return PS.importProfileConfig(config, nextId);
            })
            .then(function(appliedId) {
                PS._selectorAppliedId = appliedId;
                window.location.reload();
            })
            .catch(function(err) {
                PS._busy = false;
                sel.disabled = false;
                sel.value = prevId;
                PS._selectorAppliedId = prevId;
                var message = err && err.message ? err.message : psT('profileSwitchError', null, 'Erreur lors du changement de profil.');
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

    var STT = window.PDM && window.PDM.STT;
    if (STT && typeof STT.confirmDisruptiveAction === 'function' && STT.isActive && STT.isActive()) {
        STT.confirmDisruptiveAction({ reason: 'reload' }).then(function(ok) {
            if (ok) runSwitch();
            else sel.value = prevId;
        });
        return;
    }
    runSwitch();
};

})();
