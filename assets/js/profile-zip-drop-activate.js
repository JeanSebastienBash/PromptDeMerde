/**
 * PromptDeMerde.com — profile-zip-drop-activate.js
 *
 * Synopsis : Activation d’une entrée ZIP free-profile depuis le sélecteur.
 * Objectif : Fetch + importConfigZip après validation scan.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-zip-drop-activate] missing'); return; }

PS.activateZipFreeProfile = function(zipId) {
    var entry = PS.getZipFreeEntry(zipId);
    if (!entry || !entry.url) {
        return Promise.reject(new Error(PS.t('zipFreeMissing', null,
            'Archive ZIP introuvable dans le dépôt free-profile. Rescanner Options ou recharger.')));
    }
    var S = window.PDM && window.PDM.Storage;
    if (!S || typeof S.importConfigZip !== 'function') {
        return Promise.reject(new Error(PS.t('zipFreeImportUnavailable', null,
            'Import ZIP indisponible. Recharger la page puis réessayer.')));
    }
    return fetch(entry.url, { cache: 'no-store' })
        .then(function(res) {
            if (!res.ok) {
                throw new Error(PS.t('zipFreeFetchError', null,
                    'Téléchargement de l’archive ZIP impossible. Vérifier le fichier sur le serveur.'));
            }
            return res.arrayBuffer();
        })
        .then(function(buf) {
            return S.importConfigZip(buf, {
                filename: entry.filename || '',
                source: 'zip',
                tier: entry.tier === 'premium' ? 'premium' : 'free',
                dropFilename: entry.filename || ''
            });
        })
        .then(function(result) {
            if (!result || result.ok === false) {
                var msg = (result && result.error) || PS.t('zipFreeValidateError', null,
                    'Archive ZIP rejetée à la validation. Vérifier le contrat profil puis redéposer.');
                throw new Error(msg);
            }
            return result;
        });
};

PS._onZipVisibility = function() {
    if (document.visibilityState !== 'visible') return;
    PS.fetchZipFreeProfiles(false);
};

PS._onZipFocus = function() {
    if (document.visibilityState === 'hidden') return;
    PS.fetchZipFreeProfiles(false);
};

PS._onZipSettingsHash = function() {
    var h = String(location.hash || '').replace(/^#/, '');
    if (h === 'settings' || h.indexOf('settings') === 0) {
        PS.fetchZipFreeProfiles(false);
    }
};

PS.bindZipFreeScan = function() {
    if (PS._zipScanBound) return;
    PS._zipScanBound = true;
    document.addEventListener('visibilitychange', PS._onZipVisibility);
    window.addEventListener('focus', PS._onZipFocus);
    window.addEventListener('hashchange', PS._onZipSettingsHash);
};

PS.scheduleZipFreeScan = function() {
    PS.bindZipFreeScan();
    var run = function() { PS.fetchZipFreeProfiles(false); };
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(run, { timeout: 2500 });
    } else {
        setTimeout(run, 0);
    }
};

})();
