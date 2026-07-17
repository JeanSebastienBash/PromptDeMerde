/**
 * PromptDeMerde.com — providers.js
 *
 * Synopsis : Registry des adaptateurs LLM (Ollama, futurs providers).
 * Objectif : Enregistrer, activer et déléguer aux providers chargés selon env.php.
 */
(function() {

var _adapters = {};
var _models = {};

function enabledIds() {
    if (window.PDM.Env && window.PDM.Env.getEnabledProviders) {
        return window.PDM.Env.getEnabledProviders();
    }
    return ['ollama'];
}

window.PDM = window.PDM || {};
window.PDM.Providers = {
    register: function(adapter) {
        if (!adapter || !adapter.id) return;
        _adapters[adapter.id] = adapter;
    },

    get: function(id) {
        return _adapters[id] || null;
    },

    has: function(id) {
        return !!_adapters[id] && enabledIds().indexOf(id) !== -1;
    },

    getActiveId: function() {
        var stored = window.PDM.Storage.get(window.PDM.Storage.KEYS.PROVIDER);
        if (stored && this.has(stored)) return stored;
        var def = window.PDM.Env ? window.PDM.Env.getDefaultProvider() : 'ollama';
        if (this.has(def)) return def;
        var ids = enabledIds();
        for (var i = 0; i < ids.length; i++) {
            if (this.has(ids[i])) return ids[i];
        }
        return null;
    },

    getActive: function() {
        return this.get(this.getActiveId());
    },

    visibleList: function() {
        var ids = enabledIds();
        var out = [];
        for (var i = 0; i < ids.length; i++) {
            var a = this.get(ids[i]);
            if (a) out.push(a);
        }
        return out;
    },

    setModels: function(providerId, models) {
        var list = Array.isArray(models) ? models : [];
        var CS = window.PDM && window.PDM.ConfigSchema;
        if (CS && typeof CS.filterTextLlmModels === 'function') {
            list = CS.filterTextLlmModels(list);
        }
        _models[providerId] = list;
        var p = this.get(providerId);
        if (p) p.models = _models[providerId];
    },

    models: function(providerId) {
        var pid = providerId || this.getActiveId();
        if (_models[pid]) return _models[pid];
        var p = this.get(pid);
        return (p && p.models) ? p.models : [];
    },

    modelMeta: function(providerId, modelId) {
        var models = this.models(providerId);
        for (var i = 0; i < models.length; i++) {
            if (models[i].id === modelId) return models[i];
        }
        return null;
    },

    modelSupportsThinking: function(providerId, modelId) {
        var meta = this.modelMeta(providerId, modelId);
        return !!(meta && meta.thinkingSupported === true);
    },


    formatModelOptionLabel: function(model, style) {
        if (!model) return '\u2014';
        var name = model.label || model.id || '';
        var size = model.sizeLabel;
        if (!size && model.ctx) {
            size = String(model.ctx).replace(/^\s*\(|\)\s*$/g, '').trim();
        }
        if (!size) return name;
        if (style === 'settings') return name + ' ' + size;
        return name + ' (' + size + ')';
    },

    updateModelMeta: function(providerId, modelId, patch) {
        var pid = providerId || this.getActiveId();
        var list = this.models(pid).slice();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id !== modelId) continue;
            var meta = patch || {};
            for (var k in meta) {
                if (Object.prototype.hasOwnProperty.call(meta, k)) list[i][k] = meta[k];
            }
            this.setModels(pid, list);
            return list[i];
        }
        return null;
    },

    defaultModel: function(providerId) {
        var m = this.models(providerId);
        return m.length ? m[0].id : null;
    },

    defaultProvider: function() {
        return this.getActiveId() || (window.PDM.Env ? window.PDM.Env.getDefaultProvider() : null);
    },

    populateProviderSelect: function() {
        var sel = document.getElementById('llm-provider-select');
        if (!sel) return;
        var current = this.getActiveId() || (window.PDM.Env ? window.PDM.Env.getDefaultProvider() : null);
        var opts = [];
        var visible = this.visibleList();
        for (var i = 0; i < visible.length; i++) {
            opts.push({
                value: visible[i].id,
                label: visible[i].selectLabel || visible[i].label || visible[i].id,
                disabled: false
            });
        }
        var upcoming = window.PDM.Env && window.PDM.Env.getUpcomingProviders
            ? window.PDM.Env.getUpcomingProviders()
            : [];
        for (var j = 0; j < upcoming.length; j++) {
            if (!this.get(upcoming[j].id)) {
                opts.push({
                    value: upcoming[j].id,
                    label: upcoming[j].label || upcoming[j].id,
                    disabled: true
                });
            }
        }
        if (!current && opts.length) current = opts[0].value;
        sel.innerHTML = '';
        for (var k = 0; k < opts.length; k++) {
            var o = document.createElement('option');
            o.value = opts[k].value;
            o.textContent = opts[k].label;
            if (opts[k].disabled) o.disabled = true;
            if (opts[k].value === current) o.selected = true;
            sel.appendChild(o);
        }
        if (current && sel.value !== current) sel.value = current;
    },

    applyActiveSettingsUi: function() {
        var card = document.getElementById('llm-settings-card');
        var active = this.getActive();
        if (!card || !active || !active.applySettingsUi) return;
        active.applySettingsUi(card);
    },

    afterScriptsLoaded: function() {
        var active = this.getActive();
        if (!active) return;
        var stored = window.PDM.Storage.get(window.PDM.Storage.KEYS.PROVIDER);
        if (!stored || !this.has(stored)) {
            window.PDM.Storage.set(window.PDM.Storage.KEYS.PROVIDER, this.getActiveId());
        }
        this.populateProviderSelect();
        this.applyActiveSettingsUi();
        this.visibleList().forEach(function(a) {
            if (a.applyMarketingCopy) a.applyMarketingCopy(document);
        });
    },

    applyMarketingCopy: function() {
        this.visibleList().forEach(function(a) {
            if (a.applyMarketingCopy) a.applyMarketingCopy(document);
        });
    }
};

})();
