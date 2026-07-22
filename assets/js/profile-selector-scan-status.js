/**
 * PromptDeMerde.com — profile-selector-scan-status.js
 *
 * Synopsis : Status permanent sous le sélecteur Profil JSON (scan free-profile).
 * Objectif : Wait pendant scan ; OK ou refusés permanents + Voir plus / Voir moins.
 */
(function() {

var PS = window.PDM && window.PDM.ProfileSelector;
if (!PS) { console.warn('[profile-selector-scan-status] missing'); return; }

PS._zipRejected = PS._zipRejected || [];
PS._zipRejectExpanded = false;

PS._getScanStatusEl = function() {
    return document.getElementById('profile-scan-status');
};

PS._getScanRejectDetailEl = function() {
    return document.getElementById('profile-scan-rejected-detail');
};

PS._scanT = function(key, vars, fallback) {
    if (typeof PS.t === 'function') return PS.t(key, vars, fallback);
    return fallback != null ? fallback : '';
};

PS._setScanSelectBusy = function(scanning) {
    var sel = typeof PS._getSelect === 'function' ? PS._getSelect() : document.getElementById('profile-selector');
    if (!sel) return;
    if (scanning) {
        sel.disabled = true;
        sel.setAttribute('aria-busy', 'true');
        sel.classList.add('stg-profile-select-scanning');
        return;
    }
    if (!PS._busy) {
        sel.disabled = false;
        sel.removeAttribute('aria-busy');
        sel.classList.remove('stg-profile-select-scanning');
    }
};

PS._reasonLabel = function(reason) {
    var map = {
        filename: 'profileScanRejectFilename',
        size: 'profileScanRejectSize',
        unreadable: 'profileScanRejectUnreadable',
        max_files: 'profileScanRejectMaxFiles',
        content: 'profileScanRejectContent',
        fetch: 'profileScanRejectFetch'
    };
    var key = map[String(reason || '')] || 'profileScanRejectContent';
    return PS._scanT(key, null, String(reason || 'invalide'));
};

PS.setProfileScanUi = function(scanning) {
    PS._zipScanUiOn = !!scanning;
    PS._setScanSelectBusy(scanning);
    var st = PS._getScanStatusEl();
    var detail = PS._getScanRejectDetailEl();
    if (detail) {
        detail.hidden = true;
        detail.innerHTML = '';
    }
    if (!st) return;
    if (scanning) {
        PS._zipRejectExpanded = false;
        var msg = PS._scanT('profileScanInProgress', null,
            'Chargement et validation des profils JSON en cours.');
        st.innerHTML = '<span class="dot wait" aria-hidden="true"></span> ' + msg;
        st.className = 'conn-status stg-conn-status stg-profile-scan-status';
        st.hidden = false;
        return;
    }
};

PS.showProfileScanOk = function() {
    var st = PS._getScanStatusEl();
    var detail = PS._getScanRejectDetailEl();
    if (detail) {
        detail.hidden = true;
        detail.innerHTML = '';
    }
    PS._zipRejected = [];
    PS._zipRejectExpanded = false;
    if (!st) return;
    var msg = PS._scanT('profileScanArchivesValid', null, 'Toutes les archives JSON sont valides.');
    st.innerHTML = '<span class="dot ok" aria-hidden="true"></span> ' + msg;
    st.className = 'conn-status stg-conn-status stg-profile-scan-status';
    st.hidden = false;
};

PS._renderRejectDetail = function() {
    var detail = PS._getScanRejectDetailEl();
    if (!detail) return;
    if (!PS._zipRejectExpanded || !PS._zipRejected.length) {
        detail.hidden = true;
        detail.innerHTML = '';
        return;
    }
    var ul = document.createElement('ul');
    ul.className = 'stg-profile-scan-reject-list';
    for (var i = 0; i < PS._zipRejected.length; i++) {
        var row = PS._zipRejected[i];
        if (!row) continue;
        var li = document.createElement('li');
        li.textContent = String(row.filename || '—') + ' — ' + PS._reasonLabel(row.reason);
        ul.appendChild(li);
    }
    detail.innerHTML = '';
    detail.appendChild(ul);
    detail.hidden = false;
};

PS.showProfileScanRejected = function(rejected) {
    PS._zipRejected = Array.isArray(rejected) ? rejected.slice() : [];
    var st = PS._getScanStatusEl();
    if (!st) return;
    var n = PS._zipRejected.length;
    var msg = PS._scanT('profileScanArchivesRefused', { count: n },
        n === 1
            ? '1 archive JSON refus\u00e9e.'
            : n + ' archives JSON refus\u00e9es.');
    st.innerHTML = '';
    var dot = document.createElement('span');
    dot.className = 'dot fail';
    dot.setAttribute('aria-hidden', 'true');
    st.appendChild(dot);
    st.appendChild(document.createTextNode(' ' + msg + ' '));
    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'btn secondary btn-sm stg-profile-scan-toggle';
    moreBtn.textContent = PS._zipRejectExpanded
        ? PS._scanT('profileScanSeeLess', null, 'Voir moins')
        : PS._scanT('profileScanSeeMore', null, 'Voir plus');
    moreBtn.addEventListener('click', function() {
        PS._zipRejectExpanded = !PS._zipRejectExpanded;
        PS.showProfileScanRejected(PS._zipRejected);
    });
    st.appendChild(moreBtn);
    st.className = 'conn-status stg-conn-status stg-profile-scan-status is-rejected';
    st.hidden = false;
    PS._renderRejectDetail();
};

})();
