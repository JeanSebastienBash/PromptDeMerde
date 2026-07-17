/**
 * PromptDeMerde.com — config-schema-sanitize.js
 *
 * Synopsis : Sanitization HTML pour champs pdm_workspace_ui (sécurité JSON v2).
 * Objectif : Étendre PDM.ConfigSchema avec sanitizeWorkspaceHtml et détection de motifs dangereux.
 */
(function() {

var CS = window.PDM && window.PDM.ConfigSchema;
if (!CS) { console.warn('[config-schema-sanitize] PDM.ConfigSchema not found.'); return; }

var _BLOCKED_SELECTORS = 'script, iframe, object, embed, link[rel="import"], style, meta, base, form, input, button, svg, math';
var _ALLOWED_TAGS = { A: true, STRONG: true, EM: true, SPAN: true, B: true, I: true };
var _DANGEROUS_RE = /<script\b|<\/script\b|javascript\s*:|data\s*:\s*text\/html|\bon\w+\s*=/i;

CS.containsDangerousWorkspaceHtml = function(html) {
    if (html == null || typeof html !== 'string' || !html.length) return false;
    return _DANGEROUS_RE.test(html);
};

function stripDisallowedAttributes(el) {
    var tag = el.tagName;
    var attrs = el.attributes;
    for (var j = attrs.length - 1; j >= 0; j--) {
        var name = attrs[j].name;
        var val = attrs[j].value || '';
        if (/^on/i.test(name)) {
            el.removeAttribute(name);
            continue;
        }
        if (name === 'href') {
            var href = String(val).trim();
            if (!href || href.charAt(0) !== '#' || /[\s<>"']/.test(href.slice(1))) {
                el.removeAttribute('href');
            }
            continue;
        }
        if (name === 'class') {
            if (tag !== 'SPAN' || !/^inject-[\w-]*$/.test(String(val).trim())) {
                el.removeAttribute('class');
            }
            continue;
        }
        if (name !== 'href' && name !== 'class') {
            el.removeAttribute(name);
        }
    }
}

function unwrapNode(node) {
    var parent = node.parentNode;
    if (!parent) return;
    while (node.firstChild) {
        parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
}

function sanitizeElementTree(root) {
    if (!root) return;
    var blocked = root.querySelectorAll(_BLOCKED_SELECTORS);
    for (var b = 0; b < blocked.length; b++) {
        if (blocked[b].parentNode) blocked[b].parentNode.removeChild(blocked[b]);
    }
    var nodes = root.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!_ALLOWED_TAGS[el.tagName]) {
            unwrapNode(el);
            continue;
        }
        stripDisallowedAttributes(el);
    }
}

CS.sanitizeWorkspaceHtml = function(html) {
    if (html == null) return '';
    var raw = String(html);
    if (!raw.trim()) return '';
    try {
        var doc = new DOMParser().parseFromString(raw, 'text/html');
        sanitizeElementTree(doc.body);
        return doc.body ? doc.body.innerHTML : '';
    } catch (e) {
        return '';
    }
};

CS.sanitizeWorkspaceUiTexts = function(texts) {
    if (!texts || typeof texts !== 'object' || Array.isArray(texts)) return {};
    var out = {};
    for (var key in texts) {
        if (!Object.prototype.hasOwnProperty.call(texts, key)) continue;
        var val = texts[key];
        if (val == null) continue;
        var str = String(val);
        if (key === 'promptGuardHtml' || str.indexOf('<') >= 0) {
            out[key] = CS.sanitizeWorkspaceHtml(str);
        } else {
            out[key] = str;
        }
    }
    return out;
};

CS.hardenWorkspaceUi = function(raw) {
    var normalized = CS.normalizeWorkspaceUi(raw);
    if (normalized && normalized.texts) {
        normalized.texts = CS.sanitizeWorkspaceUiTexts(normalized.texts);
    }
    return normalized;
};

})();
