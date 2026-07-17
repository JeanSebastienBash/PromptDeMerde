/**
 * PromptDeMerde.com — profiles.js
 *
 * Synopsis : Gestion CRUD des prompts de contexte (#PascalCase).
 * Objectif : Créer, modifier, activer et persister les profils de contexte utilisateur.
 */
(function(){

function nextId() {
    var list = window.PDM.Storage.getProfiles();
    var maxN = 0;
    for (var i = 0; i < list.length; i++) {
        var n = parseInt(list[i].id.replace('p',''), 10);
        if (n > maxN) maxN = n;
    }
    return 'p' + String(maxN + 1).padStart(3, '0');
}

var DEFAULTS = [
    { id:'p001', tag:'CorrigeGrammaire', prompt:"Corrige la grammaire, l'orthographe et la ponctuation du texte source avant de le reformuler en prompt.", active:false },
    { id:'p002', tag:'TonFormel', prompt:"Adopte un ton formel et professionnel dans le prompt reformulé. Utilise un vocabulaire soutenu et une structure rigoureuse.", active:false },
    { id:'p003', tag:'AntiBullshit', prompt:"Va droit au but. Pas de blabla, pas de formule de politesse, pas de transition. Contenu brut, concis, directement exploitable.", active:false }
];

window.PDM = window.PDM || {};
window.PDM.Profiles = {
    load: function() {
        var p = window.PDM.Storage.getProfiles();
        if (p.length === 0) {
            p = JSON.parse(JSON.stringify(DEFAULTS));
            window.PDM.Storage.setProfiles(p);
        }
        return window.PDM.Profiles.normalizeList(p);
    },
    add: function(tag, prompt, origin) {
        var list = window.PDM.Storage.getProfiles();
        var max = window.PDM.Storage.getMaxProfiles();
        if (list.length >= max) return null;
        var id = nextId();
        var obj = { id:id, tag:window.PDM.Profiles.normalizeTag(tag), prompt:prompt||'', active:false };
        if (origin && typeof origin === 'object') {
            obj.origin = origin;
        }
        list.push(obj);
        window.PDM.Storage.setProfiles(list);
        return obj;
    },
    edit: function(id, data) {
        var list = window.PDM.Storage.getProfiles();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                if (data.tag !== undefined) list[i].tag = data.tag.replace(/^#/,'');
                if (data.prompt !== undefined) list[i].prompt = data.prompt;
                if (data.active !== undefined) list[i].active = data.active;
                window.PDM.Storage.setProfiles(list);
                try { document.dispatchEvent(new CustomEvent('pdm:profiles-changed')); } catch (e) {}
                return true;
            }
        }
        return false;
    },
    del: function(id) {
        var list = window.PDM.Storage.getProfiles();
        var out = [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id !== id) out.push(list[i]);
        }
        window.PDM.Storage.setProfiles(out);
        try { document.dispatchEvent(new CustomEvent('pdm:profiles-changed')); } catch (e) {}
    },
    reorder: function(orderedIds) {
        if (!orderedIds || !orderedIds.length) return window.PDM.Profiles.load();
        var list = window.PDM.Storage.getProfiles();
        var map = {};
        for (var i = 0; i < list.length; i++) map[list[i].id] = list[i];
        var out = [];
        for (var j = 0; j < orderedIds.length; j++) {
            var id = orderedIds[j];
            if (map[id]) {
                out.push(map[id]);
                delete map[id];
            }
        }
        for (var k in map) {
            if (Object.prototype.hasOwnProperty.call(map, k)) out.push(map[k]);
        }
        window.PDM.Storage.setProfiles(out);
        return out;
    },
    move: function(id, delta) {
        var list = window.PDM.Profiles.load();
        var idx = -1;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) { idx = i; break; }
        }
        if (idx < 0) return null;
        var next = idx + delta;
        if (next < 0 || next >= list.length) return list;
        var ids = list.map(function(p) { return p.id; });
        var tmp = ids[idx];
        ids[idx] = ids[next];
        ids[next] = tmp;
        return window.PDM.Profiles.reorder(ids);
    },
    active: function() {
        return window.PDM.Storage.getProfiles().filter(function(p){ return p.active; });
    },
    setAllActive: function(active) {
        var list = window.PDM.Profiles.load();
        for (var i = 0; i < list.length; i++) {
            list[i].active = !!active;
        }
        window.PDM.Storage.setProfiles(list);
        return list.length;
    },
    count: function() {
        return window.PDM.Storage.getProfiles().length;
    },
    normalizeTag: function(t) {
        if (t === null || t === undefined) return '';
        var c = String(t).trim().replace(/^#/, '').replace(/[\s_\-]+/g, '');
        if (!c.length) return c;
        if (/^[a-z]/.test(c)) c = c.charAt(0).toUpperCase() + c.slice(1);
        return c;
    },
    extractSuggestedTag: function(text) {
        if (!text) return null;
        var matches = String(text).match(/#([A-Za-z][A-Za-z0-9]*)/g);
        if (!matches || !matches.length) return null;
        var last = matches[matches.length - 1].replace(/^#/, '');
        return window.PDM.Profiles.normalizeTag(last);
    },
    validateTag: function(t) {
        var c = window.PDM.Profiles.normalizeTag(t);
        if (!c.length) return 'Le tag ne peut pas \u00eatre vide';
        if (c.length > 30) return 'Max 30 caract\u00e8res';
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(c)) return 'Le tag doit commencer par une majuscule, sans espace (ex. CorrigeGrammaire)';
        return null;
    },
    maxReached: function() {
        return window.PDM.Storage.getProfiles().length >= window.PDM.Storage.getMaxProfiles();
    },
    normalizeList: function(list) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].category !== undefined) delete list[i].category;
        }
        return list;
    }
};
})();
