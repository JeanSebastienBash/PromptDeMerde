/**
 * PromptDeMerde.com — profile-zip-drop-validate.js
 *
 * Synopsis : Validation séquentielle des ZIP free-profile (skip invalides).
 * Objectif : Ne garder que les archives valides pour le sélecteur ; lister les refusées.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-zip-drop-validate] missing'); return; }

PS._mapServerRejected = function(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (!r || !r.filename) continue;
        out.push({
            filename: String(r.filename),
            reason: String(r.reason || 'filename')
        });
    }
    return out;
};

PS._validateZipFreeCandidates = function(candidates, rejectedAcc) {
    var S = window.PDM && window.PDM.Storage;
    var valid = [];
    var list = Array.isArray(candidates) ? candidates.slice() : [];
    var idx = 0;

    function next() {
        if (idx >= list.length) {
            return Promise.resolve({ valid: valid, rejected: rejectedAcc });
        }
        var entry = list[idx++];
        if (!entry || !entry.url) {
            rejectedAcc.push({
                filename: entry && entry.filename ? entry.filename : '—',
                reason: 'fetch'
            });
            return next();
        }
        return fetch(entry.url, { cache: 'no-store' })
            .then(function(res) {
                if (!res.ok) {
                    rejectedAcc.push({
                        filename: entry.filename || entry.url,
                        reason: 'fetch'
                    });
                    return next();
                }
                return res.arrayBuffer().then(function(buf) {
                    if (!S || typeof S.validateConfigZip !== 'function') {
                        rejectedAcc.push({
                            filename: entry.filename || entry.url,
                            reason: 'content'
                        });
                        return next();
                    }
                    return S.validateConfigZip(buf, { filename: entry.filename || '' })
                        .then(function(result) {
                            if (result && result.ok) {
                                if (result.version) entry.version = result.version;
                                if (!entry.version && entry.filename) {
                                    entry.version = typeof PS.extractArchiveVersion === 'function'
                                        ? PS.extractArchiveVersion(entry.filename)
                                        : '';
                                }
                                valid.push(entry);
                            } else {
                                rejectedAcc.push({
                                    filename: entry.filename || entry.url,
                                    reason: 'content',
                                    detail: result && result.error ? String(result.error) : ''
                                });
                            }
                            return next();
                        });
                });
            })
            .catch(function() {
                rejectedAcc.push({
                    filename: entry.filename || entry.url,
                    reason: 'fetch'
                });
                return next();
            });
    }

    return next();
};

})();
