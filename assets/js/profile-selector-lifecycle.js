/**
 * PromptDeMerde.com — profile-selector-lifecycle.js
 *
 * Synopsis : Cycle de vie du sélecteur (fetch, init, reload, change).
 * Objectif : Étendre PDM.ProfileSelector avec chargement bundle / ZIP free et switch.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-lifecycle] missing'); return; }

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
            return PS._readJsonResponse(res, PS.t('profileManifestLabel', null, 'manifest profils'));
        });
};

PS.reloadBundledProfiles = function() {
    return PS._fetchBundledProfiles().then(function(data) {
        if (data && data.available && Array.isArray(data.profiles) && data.profiles.length) {
            PS._rememberReservedNames(data.profiles);
            PS._bundledProfiles = data.profiles.slice();
        }
        var zipP = typeof PS.fetchZipFreeProfiles === 'function'
            ? PS.fetchZipFreeProfiles(true)
            : Promise.resolve(false);
        return zipP.then(function() {
            if (PS._bundledProfiles.length ||
                (PS._zipFreeProfiles && PS._zipFreeProfiles.length) ||
                (window.PDM.Storage && window.PDM.Storage.getCustomProfiles().length)) {
                PS.populateSelector();
                return true;
            }
            return false;
        });
    }).catch(function(err) {
        console.warn('[PDM.ProfileSelector]', err && err.message ? err.message : err);
        if (PS._bundledProfiles.length ||
            (PS._zipFreeProfiles && PS._zipFreeProfiles.length) ||
            (window.PDM.Storage && window.PDM.Storage.getCustomProfiles().length)) {
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
            if (typeof PS.scheduleZipFreeScan === 'function') {
                PS.scheduleZipFreeScan();
            }
        })
        .catch(function(err) {
            console.warn('[PDM.ProfileSelector]', err && err.message ? err.message : err);
        });
};

PS._runProfileSwitch = function(sel, nextId, prevId) {
    PS._busy = true;
    sel.disabled = true;
    if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(true);
    var chain;
    if (typeof PS.isZipFreeProfileId === 'function' && PS.isZipFreeProfileId(nextId) &&
        typeof PS.activateZipFreeProfile === 'function') {
        chain = PS.activateZipFreeProfile(nextId).then(function() { return nextId; });
    } else {
        chain = PS.resolveProfileConfig(nextId).then(function(config) {
            return PS.importProfileConfig(config, nextId);
        });
    }
    chain
        .then(function(appliedId) {
            PS._selectorAppliedId = appliedId || nextId;
            window.location.reload();
        })
        .catch(function(err) {
            PS._busy = false;
            sel.disabled = false;
            sel.value = prevId;
            PS._selectorAppliedId = prevId;
            var message = err && err.message ? err.message : PS.t('profileSwitchError', null,
                'Erreur lors du changement de profil.');
            if (window.PDM.UI && window.PDM.UI.notif) window.PDM.UI.notif(message, 'err');
            else alert(message);
        })
        .finally(function() {
            if (window.PDM.UI && window.PDM.UI.loader) window.PDM.UI.loader(false);
        });
};

PS._onChange = function() {
    if (PS._busy || PS._zipScanBusy || PS._zipScanUiOn) return;
    var sel = PS._getSelect();
    if (!sel) return;
    var nextId = sel.value;
    var prevId = PS._selectorAppliedId != null ? PS._selectorAppliedId : PS._getActiveId();
    if (!nextId || nextId === prevId) {
        if (PS._selectHasOption(sel, prevId)) sel.value = prevId;
        return;
    }
    if (!confirm(PS.t('profileSwitchConfirm', null,
        'Changer de profil ? Toutes les données locales seront effacées et remplacées par la configuration du profil sélectionné.'))) {
        sel.value = prevId;
        return;
    }
    var runSwitch = function() { PS._runProfileSwitch(sel, nextId, prevId); };
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
