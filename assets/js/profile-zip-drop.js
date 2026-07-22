/**
 * PromptDeMerde.com — profile-zip-drop.js
 *
 * Synopsis : Catalogue ZIP free-profile (scan événementiel) pour le sélecteur Options.
 * Objectif : Lister + valider séquentiellement ; sélecteur = valides seulement.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-zip-drop] PDM.ProfileSelector missing'); return; }

PS._zipFreeProfiles = [];
PS._zipListEtag = null;
PS._zipScanBound = false;
PS._zipScanBusy = false;

PS.isZipFreeProfileId = function(id) {
    return String(id || '').indexOf('zipfree-') === 0;
};

PS.getZipFreeEntry = function(id) {
    var list = PS._zipFreeProfiles || [];
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].id === id) return list[i];
    }
    return null;
};

PS._zipListEndpoint = function() {
    return PS._getEndpoint('zipProfiles', 'lib/api/zip-profiles.php');
};

PS._applyZipFreeList = function(validProfiles) {
    PS._zipFreeProfiles = Array.isArray(validProfiles) ? validProfiles.slice() : [];
    if (typeof PS.populateSelector === 'function') PS.populateSelector();
};

PS._finishZipScanStatus = function(rejected) {
    if (typeof PS.setProfileScanUi === 'function') PS.setProfileScanUi(false);
    if (rejected && rejected.length) {
        if (typeof PS.showProfileScanRejected === 'function') {
            PS.showProfileScanRejected(rejected);
        }
        return;
    }
    if (typeof PS.showProfileScanOk === 'function') PS.showProfileScanOk();
};

PS.fetchZipFreeProfiles = function(force) {
    if (!window.PDM.Env || !window.PDM.Env.hasProfileSelector()) {
        return Promise.resolve(false);
    }
    if (PS._zipScanBusy) return Promise.resolve(false);
    PS._zipScanBusy = true;
    if (typeof PS.setProfileScanUi === 'function') PS.setProfileScanUi(true);
    var headers = {};
    if (!force && PS._zipListEtag) {
        headers['If-None-Match'] = '"' + PS._zipListEtag + '"';
    }
    return fetch(PS._zipListEndpoint(), { cache: 'no-store', headers: headers })
        .then(function(res) {
            if (res.status === 304) {
                return { notModified: true };
            }
            if (!res.ok) {
                throw new Error(PS.t('zipFreeListError', null,
                    'Liste des profils ZIP indisponible. Vérifier le dépôt free-profile ou recharger.'));
            }
            var rawEtag = res.headers.get('ETag');
            if (rawEtag) {
                PS._zipListEtag = String(rawEtag).replace(/^"|"$/g, '');
            }
            return res.json().then(function(data) {
                if (data && data.etag) PS._zipListEtag = String(data.etag);
                return { data: data };
            });
        })
        .then(function(payload) {
            if (payload && payload.notModified) {
                PS._finishZipScanStatus(PS._zipRejected || []);
                return false;
            }
            var data = payload && payload.data ? payload.data : {};
            var candidates = Array.isArray(data.profiles) ? data.profiles.slice() : [];
            var rejected = typeof PS._mapServerRejected === 'function'
                ? PS._mapServerRejected(data.rejected)
                : [];
            if (typeof PS._validateZipFreeCandidates !== 'function') {
                PS._applyZipFreeList(candidates);
                PS._finishZipScanStatus(rejected);
                return true;
            }
            return PS._validateZipFreeCandidates(candidates, rejected).then(function(result) {
                PS._applyZipFreeList(result.valid || []);
                PS._finishZipScanStatus(result.rejected || []);
                return true;
            });
        })
        .catch(function(err) {
            console.warn('[PDM.ProfileZipDrop]', err && err.message ? err.message : err);
            if (typeof PS.setProfileScanUi === 'function') PS.setProfileScanUi(false);
            if (typeof PS.showProfileScanRejected === 'function') {
                PS.showProfileScanRejected([{
                    filename: '—',
                    reason: 'fetch'
                }]);
            }
            return false;
        })
        .finally(function() {
            PS._zipScanBusy = false;
        });
};

})();
