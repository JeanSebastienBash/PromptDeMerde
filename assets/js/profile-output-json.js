/**
 * PromptDeMerde.com — profile-output-json.js
 *
 * Parse et rend les sorties JSON profil (protocole v2 — clé dynamique output_{lang}).
 */
(function() {

var POJ = window.PDM.ProfileOutputJson = window.PDM.ProfileOutputJson || {};

var OUTPUT_KEY_PATTERN = 'output_{lang}';

function stripCodeFence(text) {
    var t = String(text || '').trim();
    var m = t.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (m) return m[1].trim();
    var start = t.indexOf('{');
    var end = t.lastIndexOf('}');
    if (start >= 0 && end > start) return t.slice(start, end + 1);
    return t;
}

POJ.normalizeLang = function(lang) {
    var v = String(lang || 'fr').trim().toLowerCase();
    var m = v.match(/^([a-z]{2})/);
    return m ? m[1] : 'fr';
};

POJ.outputKeyForLang = function(lang, pattern) {
    var p = (pattern && String(pattern).trim()) || OUTPUT_KEY_PATTERN;
    return p.replace('{lang}', POJ.normalizeLang(lang));
};

POJ.buildSchemaForLang = function(valueSchema, lang, pattern) {
    var key = POJ.outputKeyForLang(lang, pattern);
    var vs = valueSchema && typeof valueSchema === 'object' && !Array.isArray(valueSchema)
        ? valueSchema
        : { type: 'string' };
    var schema = { type: 'object', additionalProperties: false, required: [key], properties: {} };
    schema.properties[key] = vs;
    return schema;
};

/**
 * Clone le schéma pour la génération Ollama (format=).
 * Tokens UI 0 = illimité → toujours retirer minLength/maxLength du profil
 * (sinon le format Ollama coupe la chaîne, peu importe num_predict).
 */
/**
 * Schéma freeform STT : uniquement des clés output_xx de type string simple.
 * → ne pas envoyer format=JSON Schema (grammar) : bufferise le stream et coupe tôt.
 */
POJ.isFreeformOutputLangSchema = function(schema) {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return false;
    var props = schema.properties;
    if (!props || typeof props !== 'object') return false;
    var keys = Object.keys(props);
    if (!keys.length) return false;
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (!/^output_[a-z]{2}$/.test(k)) return false;
        var p = props[k];
        if (!p || typeof p !== 'object' || p.type !== 'string') return false;
        if (p.enum || p.const || p.properties || p.items) return false;
    }
    return true;
};

/**
 * Consigne freeform STT — TEXTE BRUT (pas d’enveloppe JSON).
 * Les guillemets / accents / HTML / CJK dans l’input ou la sortie cassent souvent
 * un contrat {"output_xx":"..."} (échappement modèle → coupe ou silence long).
 * L’UI enrobe en JSON côté client si le chip d’affichage le demande.
 */
POJ.freeformJsonSystemSuffix = function(lang, pattern) {
    var key = POJ.outputKeyForLang(lang, pattern);
    return '\n\n[PDM_OUTPUT_MODE=plain]\n' +
        'IGNORE toute consigne d’enveloppe JSON ci-dessus (y compris <output_contract> / {"' +
        key + '":"..."}).\n' +
        'Réponds UNIQUEMENT avec le texte final, en UTF-8 brut.\n' +
        'Conserve tous les caractères du texte final : guillemets " \' « » „ “ ”, ' +
        'apostrophes, slashs / \\, accents, ligatures, HTML/XML si présents, emoji, ' +
        'CJK, arabes, cyrilliques, etc. Ne les escape pas, ne les retire pas.\n' +
        'Aucun objet JSON, aucun markdown, aucun fence ```, aucun préambule.\n' +
        'Ne coupe jamais avant la fin du sens.';
};

/** Décode léger des séquences JSON dans une tranche déjà délimitée. */
POJ.decodeJsonStringLight = function(slice) {
    return String(slice || '')
        .replace(/\\u([0-9a-fA-F]{4})/g, function(_, hex) {
            return String.fromCharCode(parseInt(hex, 16));
        })
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/\\\\/g, '\\');
};

POJ.relaxSchemaForGeneration = function(schema, minMaxLength, opts) {
    opts = opts || {};
    var stripMax = opts.stripMaxLength !== false;
    var stripMin = opts.stripMinLength !== false;
    if (minMaxLength != null && minMaxLength > 0) {
        stripMax = opts.stripMaxLength === true;
    }
    if (!schema || typeof schema !== 'object') return schema;
    var clone;
    try {
        clone = JSON.parse(JSON.stringify(schema));
    } catch (e) {
        return schema;
    }
    function bump(node) {
        if (!node || typeof node !== 'object') return;
        if (stripMax && Object.prototype.hasOwnProperty.call(node, 'maxLength')) {
            delete node.maxLength;
        } else if (!stripMax && minMaxLength > 0 && typeof node.maxLength === 'number'
            && node.maxLength > 0 && node.maxLength < minMaxLength) {
            node.maxLength = minMaxLength;
        }
        if (stripMin && Object.prototype.hasOwnProperty.call(node, 'minLength')) {
            delete node.minLength;
        }
        if (node.properties && typeof node.properties === 'object') {
            var keys = Object.keys(node.properties);
            for (var i = 0; i < keys.length; i++) bump(node.properties[keys[i]]);
        }
        if (node.items) bump(node.items);
    }
    bump(clone);
    return clone;
};

POJ.isLikelyTruncatedJson = function(raw) {
    var t = String(raw || '').trim();
    if (!t) return false;
    var parsed = POJ.parseRaw(t);
    if (parsed.ok) return false;
    return t.charAt(0) === '{' || t.indexOf('output_') !== -1;
};

/**
 * Ancien « repair » structurel — neutralisé.
 * L’affichage JSON est désormais un format de sortie UI (workspace-output-format.js) ;
 * on ne ferme plus les guillemets/accolades pour masquer une coupure.
 */
POJ.tryRepairTruncatedJson = function(raw) {
    var t = String(raw || '').trim();
    if (!t) return { ok: false, raw: t };
    var first = POJ.parseRaw(t);
    if (first.ok) return { ok: true, raw: t, data: first.data, repaired: false };
    return { ok: false, raw: t };
};

/** @deprecated Ne plus utiliser pour masquer des coupures — conservé no-op. */
POJ.endsMidPhrase = function() {
    return false;
};

POJ.extractValueSchemaFromStored = function(stored) {
    if (!stored || typeof stored !== 'object') return null;
    var props = stored.properties;
    if (!props || typeof props !== 'object') return null;
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
        if (keys[i].indexOf('output_') === 0 && props[keys[i]] && typeof props[keys[i]] === 'object') {
            return props[keys[i]];
        }
    }
    return null;
};

POJ.extractOutputEnLegacy = function(data) {
    if (!data || typeof data !== 'object') return '';
    if (data.output && typeof data.output.prompt_en === 'string') {
        var line = String(data.output.prompt_en).trim();
        var mj = data.output.mj;
        if (mj && typeof mj === 'object') {
            var parts = [];
            if (mj.ar) parts.push('--ar ' + mj.ar);
            if (mj.v != null) parts.push('--v ' + mj.v);
            if (mj.style === 'raw') parts.push('--style raw');
            if (mj.s != null) parts.push('--s ' + mj.s);
            if (mj.q != null) parts.push('--q ' + mj.q);
            if (mj.chaos != null) parts.push('--chaos ' + mj.chaos);
            if (mj.seed != null) parts.push('--seed ' + mj.seed);
            if (Array.isArray(mj.no) && mj.no.length) parts.push('--no ' + mj.no.join(', '));
            if (parts.length) line += ' ' + parts.join(' ');
        }
        return line.replace(/\s+/g, ' ').trim();
    }
    return '';
};

POJ.extractOutputLang = function(data, lang, pattern) {
    if (!data || typeof data !== 'object') return '';
    var key = POJ.outputKeyForLang(lang, pattern);
    if (typeof data[key] === 'string' && data[key].trim()) {
        return data[key].trim();
    }
    if (typeof data.output_fr === 'string' && data.output_fr.trim()) {
        return data.output_fr.trim();
    }
    if (typeof data.output_en === 'string' && data.output_en.trim()) {
        return data.output_en.trim();
    }
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        if (/^output_[a-z]{2}$/.test(keys[i]) && typeof data[keys[i]] === 'string' && data[keys[i]].trim()) {
            return data[keys[i]].trim();
        }
    }
    return POJ.extractOutputEnLegacy(data);
};

/** Décode une valeur JSON-string (échappements) jusqu’à la fin ou le " fermant. */
POJ.unescapeJsonStringSlice = function(slice) {
    var out = '';
    var s = String(slice || '');
    for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        if (ch === '\\' && i + 1 < s.length) {
            var n = s.charAt(i + 1);
            if (n === 'n') out += '\n';
            else if (n === 'r') out += '\r';
            else if (n === 't') out += '\t';
            else if (n === '"') out += '"';
            else if (n === '\\') out += '\\';
            else if (n === '/') out += '/';
            else if (n === 'u' && i + 5 < s.length) {
                var hex = s.slice(i + 2, i + 6);
                if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                    out += String.fromCharCode(parseInt(hex, 16));
                    i += 5;
                    continue;
                }
                out += n;
            } else out += n;
            i++;
            continue;
        }
        if (ch === '"') break;
        out += ch;
    }
    return out;
};

/**
 * Texte canonique depuis la réponse modèle (enveloppe JSON profil ou texte libre).
 * Ne « répare » jamais le JSON — extrait uniquement une valeur string lisible,
 * y compris en cours de stream (JSON incomplet sans guillemet / } final).
 */
POJ.extractPlainFromModelRaw = function(raw, lang, pattern) {
    var t = String(raw || '').trim();
    if (!t) return '';

    var preferred = POJ.outputKeyForLang(lang, pattern);
    var out = t;

    // Déjà du texte brut (pas une enveloppe objet) — quand même retirer les fuites "}} en queue
    if (t.charAt(0) !== '{' && t.indexOf('```') !== 0) {
        return POJ.stripEnvelopeResidue(t);
    }

    var parsed = POJ.parseRaw(t);
    if (parsed.ok && parsed.data) {
        var plain = POJ.extractOutputLang(parsed.data, lang, pattern);
        if (plain) return POJ.stripEnvelopeResidue(plain);
    }

    try {
        var o = JSON.parse(t);
        var plain2 = POJ.extractOutputLang(o, lang, pattern);
        if (plain2) return POJ.stripEnvelopeResidue(plain2);
    } catch (e) { /* ignore */ }

    // Stream / JSON cassé : NE PAS s’arrêter au 1er " (c’est du contenu, pas un délimiteur).
    var keyRe = new RegExp(
        '"(?:' + preferred.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '|output_[a-z]{2})"\\s*:\\s*"'
    );
    var open = t.match(keyRe) || t.match(/"(output_[a-z]{2})"\s*:\s*"/);
    if (open) {
        var startIdx = open.index + open[0].length;
        var greedy = POJ.extractGreedyOutputString(t.slice(startIdx));
        if (greedy) out = greedy;
    }

    return POJ.stripEnvelopeResidue(out);
};

/**
 * Retire les résidus d’enveloppe JSON en tête/queue (fuite typique en mode « texte brut » : …"}).
 * Ne touche pas au contenu légitime au milieu du texte.
 */
POJ.stripEnvelopeResidue = function(text) {
    var s = String(text || '');
    if (!s) return '';
    s = s.replace(/^\s*\{\s*"(?:output_[a-z]{2})"\s*:\s*"/i, '');
    var prev;
    do {
        prev = s;
        // "}}  puis "}  puis } orphelin de fermeture JSON
        s = s.replace(/"\s*\}\s*\}\s*$/g, '');
        s = s.replace(/"\s*\}\s*$/g, '');
        s = s.replace(/\}\s*\}\s*$/g, '');
    } while (s !== prev);
    return s;
};

/**
 * Valeur après `"output_xx":"` — guillemets internes = contenu.
 * Fermeture : `" }` / `" }}` en fin ; sinon tout le reste (stream).
 */
POJ.extractGreedyOutputString = function(afterOpenQuote) {
    var rest = String(afterOpenQuote || '');
    if (!rest) return '';
    var closed = rest.match(/^([\s\S]*)"\s*\}\s*\}?\s*$/);
    if (closed) {
        return POJ.decodeJsonStringLight(closed[1]);
    }
    return rest;
};

POJ.extractOutputEn = POJ.extractOutputLang;

POJ.normalizePayload = function(data, lang, pattern) {
    var line = POJ.extractOutputLang(data, lang, pattern);
    if (!line) return null;
    var key = POJ.outputKeyForLang(lang, pattern);
    var out = {};
    out[key] = line;
    return out;
};

POJ.formatOutputJson = function(data, options) {
    options = options || {};
    var lang = options.lang;
    var pattern = options.pattern;
    var payload = POJ.normalizePayload(data, lang, pattern);
    if (!payload) return '';
    var json = JSON.stringify(payload, null, options.compact ? 0 : 2);
    if (options.wrap !== false) {
        return POJ.wrapLongLine(json);
    }
    return json;
};

POJ.formatDisplay = function(data, bundle, lang) {
    bundle = bundle || {};
    var mode = (bundle.display && bundle.display.mode) || 'json_output_lang';
    if (mode === 'json_output_lang' || mode === 'json_output_en' || mode === 'midjourney_line') {
        return POJ.formatOutputJson(data, {
            lang: lang,
            pattern: bundle.outputKeyPattern,
            wrap: bundle.display && bundle.display.wrap !== false
        });
    }
    return POJ.formatOutputJson(data, { lang: lang, pattern: bundle.outputKeyPattern });
};

POJ.parseRaw = function(raw) {
    try {
        return { ok: true, data: JSON.parse(stripCodeFence(raw)) };
    } catch (e) {
        return { ok: false, error: String(e && e.message ? e.message : e) };
    }
};

POJ.inferDisplayBundle = function(schema, meta) {
    meta = meta || {};
    var bundle = {
        display: { mode: 'json_output_lang', wrap: true },
        outputKeyPattern: meta.outputKeyPattern || OUTPUT_KEY_PATTERN
    };
    if (schema && schema.properties) {
        var keys = Object.keys(schema.properties);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].indexOf('output_') === 0) {
                bundle.display.mode = 'json_output_lang';
                return bundle;
            }
        }
        if (schema.properties.output) {
            bundle.display.mode = 'json_output_lang';
        }
    }
    return bundle;
};

POJ.parseAndRender = function(raw, schemaBundle, options) {
    options = options || {};
    var parsed = POJ.parseRaw(raw);
    if (!parsed.ok) return parsed;
    var bundle = schemaBundle || POJ.inferDisplayBundle(null, options);
    var lang = options.lang;
    var display = POJ.formatDisplay(parsed.data, bundle, lang);
    if (!display) return { ok: false, error: 'empty_display' };
    var normalized = POJ.normalizePayload(parsed.data, lang, bundle.outputKeyPattern);
    return { ok: true, data: normalized || parsed.data, display: display };
};

POJ.wrapLongLine = function(text, maxLen) {
    maxLen = maxLen || 96;
    var lines = String(text || '').split('\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.length <= maxLen) {
            out.push(line);
            continue;
        }
        var rest = line;
        while (rest.length > maxLen) {
            var cut = rest.lastIndexOf(' ', maxLen);
            if (cut < 40) cut = maxLen;
            out.push(rest.slice(0, cut).trim());
            rest = rest.slice(cut).trim();
        }
        if (rest) out.push(rest);
    }
    return out.join('\n');
};

})();
