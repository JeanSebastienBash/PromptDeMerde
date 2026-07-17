/**
 * PromptDeMerde.com — themes.js
 *
 * Synopsis : 50 thèmes en 25 familles (clair/sombre), Cassé figé, tokens sémantiques.
 * Objectif : Appliquer le thème (localStorage pdm_theme) sur document.documentElement.
 */
(function(){

var T = {};

function defaultThemeId() {
    if (window.PDM && window.PDM.ConfigSchema && window.PDM.ConfigSchema.DEFAULT_THEME_ID) {
        return window.PDM.ConfigSchema.DEFAULT_THEME_ID;
    }
    return 'jaune';
}

function themeT(key, vars) {
    var I = window.PDM && window.PDM.I18n;
    if (!I) return null;
    return I.t('themes.' + key, vars);
}

function localizedFamilyName(id, fallback) {
    var t = themeT('families.' + id);
    if (t && t.indexOf('themes.families.' + id) !== 0) return t;
    return fallback != null ? fallback : id;
}

function resolveThemeDisplayName(id, family, mode, fallback) {
    var fam = localizedFamilyName(family);
    if (id === 'light') return fam;
    if (id === 'dark') {
        var night = themeT('variantNight', { family: fam });
        if (night && night.indexOf('themes.variantNight') !== 0) return night;
        return fallback || (fam + ' sombre');
    }
    if (mode === 'day') {
        var day = themeT('variantDay', { family: fam });
        if (day && day.indexOf('themes.variantDay') !== 0) return day;
        return fallback || (fam + ' clair');
    }
    return fam;
}

function cloneThemeEntry(entry) {
    if (!entry) return entry;
    return {
        id: entry.id,
        name: resolveThemeDisplayName(entry.id, entry.family, entry.mode, entry.name),
        icon: entry.icon,
        preview: entry.preview,
        family: entry.family,
        mode: entry.mode,
        vars: entry.vars
    };
}

function cloneFamilyEntry(entry) {
    return {
        id: entry.id,
        name: localizedFamilyName(entry.id, entry.name),
        icon: entry.icon,
        dayId: entry.dayId,
        nightId: entry.nightId
    };
}

var THEME_MIGRATION = {
    day: 'light',
    'gray-day': 'gris-day', gray: 'gris',
    'forest-day': 'vert-day', forest: 'vert',
    'ocean-day': 'turquoise-day', ocean: 'turquoise',
    'cyber-day': 'bleu-day', cyber: 'bleu',
    'terminal-day': 'dark', terminal: 'dark',
    'red-day': 'rouge-day', red: 'rouge',
    'yellow-day': 'jaune-day', yellow: 'jaune'
};

var FROZEN_LIGHT = {
    '--bg-black': '#f5f0eb', '--bg-dark': '#e8e2db', '--surface': '#d8d0c6',
    '--text-white': '#2a2a2a', '--text-muted': '#6b6560',
    '--accent-red': '#c0392b', '--accent-hover': '#d44637',
    '--border': '#c8c0b4', '--success': '#389e0d', '--error': '#c0392b',
    '--btn-text': '#ffffff', '--input-bg': '#ede7e0', '--input-focus-bg': '#f5f0eb',
    '--text-on-accent': '#ffffff'
};

var FROZEN_DARK = {
    '--bg-black': '#1a1612', '--bg-dark': '#262018', '--surface': '#332c24',
    '--text-white': '#f0e8dc', '--text-muted': '#a89888',
    '--accent-red': '#c0392b', '--accent-hover': '#d44637',
    '--border': '#4a4038', '--success': '#5aad2e', '--error': '#e05040',
    '--btn-text': '#ffffff', '--input-bg': '#1e1914', '--input-focus-bg': '#262018',
    '--text-on-accent': '#ffffff'
};

var GENERATED_PALETTES = {
    'bleu-day': {
        '--bg-black': '#f2f4f8', '--bg-dark': '#e6eaf2', '--surface': '#d8deea',
        '--text-white': '#1e2228', '--text-muted': '#5a6478',
        '--accent-red': '#3a7bd8', '--accent-hover': '#5090e8',
        '--border': '#c0c8d8', '--success': '#2a9a68', '--error': '#d84848',
        '--btn-text': '#ffffff', '--input-bg': '#e8ecf4', '--input-focus-bg': '#f2f4f8',
        '--text-on-accent': '#ffffff'
    },
    bleu: {
        '--bg-black': '#1e1e1e', '--bg-dark': '#282828', '--surface': '#363636',
        '--text-white': '#d0d0d0', '--text-muted': '#909090',
        '--accent-red': '#8ab4f8', '--accent-hover': '#a0c4ff',
        '--border': '#4a4a4a', '--success': '#66d9a0', '--error': '#f87171',
        '--btn-text': '#1e1e1e', '--input-bg': '#1e1e1e', '--input-focus-bg': '#282828',
        '--text-on-accent': '#1e1e1e'
    },
    'vert-day': {
        '--bg-black': '#eef6ee', '--bg-dark': '#dceadc', '--surface': '#c8dcc8',
        '--text-white': '#102010', '--text-muted': '#4a6848',
        '--accent-red': '#2a9a30', '--accent-hover': '#40b048',
        '--border': '#b8d4b8', '--success': '#2a9a30', '--error': '#d84848',
        '--btn-text': '#ffffff', '--input-bg': '#e4f2e4', '--input-focus-bg': '#eef6ee',
        '--text-on-accent': '#ffffff'
    },
    vert: {
        '--bg-black': '#081408', '--bg-dark': '#142214', '--surface': '#1e321c',
        '--text-white': '#c8e8c0', '--text-muted': '#78a870',
        '--accent-red': '#44cc44', '--accent-hover': '#60dd60',
        '--border': '#284228', '--success': '#44cc44', '--error': '#e85050',
        '--btn-text': '#081408', '--input-bg': '#081408', '--input-focus-bg': '#142214',
        '--text-on-accent': '#081408'
    },
    'jaune-day': {
        '--bg-black': '#faf8e8', '--bg-dark': '#f0ecd0', '--surface': '#e8e2b8',
        '--text-white': '#2a2810', '--text-muted': '#7a7448',
        '--accent-red': '#c8a800', '--accent-hover': '#e0c020',
        '--border': '#d8d0a0', '--success': '#4a9a20', '--error': '#d84838',
        '--btn-text': '#2a2810', '--input-bg': '#f5f0d8', '--input-focus-bg': '#faf8e8',
        '--text-on-accent': '#2a2810'
    },
    jaune: {
        '--bg-black': '#141208', '--bg-dark': '#22201a', '--surface': '#33301e',
        '--text-white': '#f0e8c0', '--text-muted': '#a09868',
        '--accent-red': '#f0c828', '--accent-hover': '#ffd640',
        '--border': '#4a4628', '--success': '#66dd44', '--error': '#e85050',
        '--btn-text': '#141208', '--input-bg': '#141208', '--input-focus-bg': '#22201a',
        '--text-on-accent': '#141208'
    },
    'orange-day': {
        '--bg-black': '#faf3e8', '--bg-dark': '#f0e4d0', '--surface': '#e6d6bc',
        '--text-white': '#2a2218', '--text-muted': '#7a6a52',
        '--accent-red': '#e07800', '--accent-hover': '#f09020',
        '--border': '#d4c4a8', '--success': '#5a9a18', '--error': '#d85030',
        '--btn-text': '#ffffff', '--input-bg': '#f5ead8', '--input-focus-bg': '#faf3e8',
        '--text-on-accent': '#ffffff'
    },
    orange: {
        '--bg-black': '#1a1208', '--bg-dark': '#2a1e10', '--surface': '#3a2c18',
        '--text-white': '#f0dcc0', '--text-muted': '#b8a080',
        '--accent-red': '#ff8c00', '--accent-hover': '#ffa030',
        '--border': '#4a3820', '--success': '#7acc00', '--error': '#ff6347',
        '--btn-text': '#ffffff', '--input-bg': '#1a1208', '--input-focus-bg': '#2a1e10',
        '--text-on-accent': '#1a1208'
    },
    'rouge-day': {
        '--bg-black': '#faf2f2', '--bg-dark': '#f0e4e4', '--surface': '#e6d4d4',
        '--text-white': '#2a1010', '--text-muted': '#8a5050',
        '--accent-red': '#b91c1c', '--accent-hover': '#dc2626',
        '--border': '#d4b0b0', '--success': '#2a9a50', '--error': '#b91c1c',
        '--btn-text': '#ffffff', '--input-bg': '#f5e8e8', '--input-focus-bg': '#faf2f2',
        '--text-on-accent': '#ffffff'
    },
    rouge: {
        '--bg-black': '#180606', '--bg-dark': '#280e0e', '--surface': '#3a1414',
        '--text-white': '#f0d0d0', '--text-muted': '#b87070',
        '--accent-red': '#ff3b30', '--accent-hover': '#ff6961',
        '--border': '#4a2020', '--success': '#44dd88', '--error': '#ff3b30',
        '--btn-text': '#ffffff', '--input-bg': '#180606', '--input-focus-bg': '#280e0e',
        '--text-on-accent': '#ffffff'
    },
    'violet-day': {
        '--bg-black': '#f4f0fa', '--bg-dark': '#e8e0f2', '--surface': '#d8cce8',
        '--text-white': '#201828', '--text-muted': '#6a5878',
        '--accent-red': '#7b3fd4', '--accent-hover': '#9258e8',
        '--border': '#c4b8d8', '--success': '#2a9a58', '--error': '#d84868',
        '--btn-text': '#ffffff', '--input-bg': '#ece4f4', '--input-focus-bg': '#f4f0fa',
        '--text-on-accent': '#ffffff'
    },
    violet: {
        '--bg-black': '#120818', '--bg-dark': '#201428', '--surface': '#2e1e38',
        '--text-white': '#e0c8f0', '--text-muted': '#9878a8',
        '--accent-red': '#a868e8', '--accent-hover': '#bc80f8',
        '--border': '#403048', '--success': '#44dd88', '--error': '#e86888',
        '--btn-text': '#ffffff', '--input-bg': '#120818', '--input-focus-bg': '#201428',
        '--text-on-accent': '#120818'
    },
    'fuchsia-day': {
        '--bg-black': '#f8f0fa', '--bg-dark': '#ece0f0', '--surface': '#e0cce8',
        '--text-white': '#281830', '--text-muted': '#785a88',
        '--accent-red': '#c02898', '--accent-hover': '#d840b0',
        '--border': '#d0b8d8', '--success': '#2a9a58', '--error': '#c02898',
        '--btn-text': '#ffffff', '--input-bg': '#f0e4f4', '--input-focus-bg': '#f8f0fa',
        '--text-on-accent': '#ffffff'
    },
    fuchsia: {
        '--bg-black': '#140818', '--bg-dark': '#261428', '--surface': '#361e38',
        '--text-white': '#e8c0f0', '--text-muted': '#a078a8',
        '--accent-red': '#e040a0', '--accent-hover': '#f058b4',
        '--border': '#462848', '--success': '#44dd88', '--error': '#e040a0',
        '--btn-text': '#ffffff', '--input-bg': '#140818', '--input-focus-bg': '#261428',
        '--text-on-accent': '#ffffff'
    },
    'turquoise-day': {
        '--bg-black': '#eef6fa', '--bg-dark': '#dceaf2', '--surface': '#c8dce8',
        '--text-white': '#102028', '--text-muted': '#4a6878',
        '--accent-red': '#0898b8', '--accent-hover': '#20b0d0',
        '--border': '#b8d0dc', '--success': '#1a9a50', '--error': '#d84848',
        '--btn-text': '#ffffff', '--input-bg': '#e4f0f6', '--input-focus-bg': '#eef6fa',
        '--text-on-accent': '#ffffff'
    },
    turquoise: {
        '--bg-black': '#081418', '--bg-dark': '#102228', '--surface': '#183038',
        '--text-white': '#c0e0f0', '--text-muted': '#6898a8',
        '--accent-red': '#18b8d8', '--accent-hover': '#30cce0',
        '--border': '#284048', '--success': '#2ecc71', '--error': '#e85050',
        '--btn-text': '#081418', '--input-bg': '#081418', '--input-focus-bg': '#102228',
        '--text-on-accent': '#081418'
    },
    'rose-day': {
        '--bg-black': '#faf0f6', '--bg-dark': '#f0e4ef', '--surface': '#e8d4e4',
        '--text-white': '#281028', '--text-muted': '#886878',
        '--accent-red': '#be185d', '--accent-hover': '#db2777',
        '--border': '#d8b8cc', '--success': '#2a9a58', '--error': '#be185d',
        '--btn-text': '#ffffff', '--input-bg': '#f5e8f0', '--input-focus-bg': '#faf0f6',
        '--text-on-accent': '#ffffff'
    },
    rose: {
        '--bg-black': '#140610', '--bg-dark': '#241020', '--surface': '#341830',
        '--text-white': '#f0d0e4', '--text-muted': '#a87898',
        '--accent-red': '#f0abfc', '--accent-hover': '#f5c2ff',
        '--border': '#442838', '--success': '#66dd88', '--error': '#f0abfc',
        '--btn-text': '#140610', '--input-bg': '#140610', '--input-focus-bg': '#241020',
        '--text-on-accent': '#140610'
    }
};

var EXTRA_FAMILY_DEFS = [
    {
        id: 'noir', name: 'Noir', icon: '\uD83D\uDDA4', nightIcon: '\u26AB',
        day: {
            '--bg-black': '#f2f2f7', '--bg-dark': '#e5e5ea', '--surface': '#d1d1d6',
            '--text-white': '#1c1c1e', '--text-muted': '#636366',
            '--accent-red': '#1c1c1e', '--accent-hover': '#3a3a3c',
            '--border': '#c7c7cc', '--success': '#2a9850', '--error': '#c41e3a',
            '--btn-text': '#ffffff', '--input-bg': '#ececf0', '--input-focus-bg': '#f2f2f7',
            '--text-on-accent': '#ffffff'
        },
        night: {
            '--bg-black': '#000000', '--bg-dark': '#0c0c0e', '--surface': '#1c1c1e',
            '--text-white': '#f5f5f7', '--text-muted': '#98989d',
            '--accent-red': '#f5f5f7', '--accent-hover': '#ffffff',
            '--border': '#38383a', '--success': '#3ecf7a', '--error': '#ff6961',
            '--btn-text': '#000000', '--input-bg': '#000000', '--input-focus-bg': '#0c0c0e',
            '--text-on-accent': '#000000'
        }
    },
    { id: 'gris', name: 'Gris', icon: '\u2B1C', nightIcon: '\uD83D\uDD32',
        dayAccent: '#636366', dayHover: '#48484a', nightAccent: '#aeaeb2', nightHover: '#c7c7cc',
        dayOpts: { neutral: true }, nightOpts: { hueMix: 0.06 } },
    { id: 'indigo', name: 'Indigo', icon: '\uD83D\uDC99', nightIcon: '\uD83C\uDF19',
        dayAccent: '#5856d6', dayHover: '#6e6ce8', nightAccent: '#7b79e8', nightHover: '#9492ff' },
    { id: 'cyan', name: 'Cyan', icon: '\uD83E\uDE75', nightIcon: '\uD83D\uDCA7',
        dayAccent: '#32ade6', dayHover: '#48c0f0', nightAccent: '#64d2ff', nightHover: '#80dcff' },
    { id: 'menthe', name: 'Menthe', icon: '\uD83C\uDF3F', nightIcon: '\uD83C\uDF43',
        dayAccent: '#00a896', dayHover: '#00c7be', nightAccent: '#40e0d0', nightHover: '#60f0e0' },
    { id: 'lime', name: 'Lime', icon: '\uD83C\uDF4B', nightIcon: '\u2728',
        dayAccent: '#65a30d', dayHover: '#84cc16', nightAccent: '#a3e635', nightHover: '#bef264' },
    { id: 'ambre', name: 'Ambre', icon: '\uD83D\uDFE1', nightIcon: '\uD83D\uDD26',
        dayAccent: '#d97706', dayHover: '#f59e0b', nightAccent: '#ff9f0a', nightHover: '#ffb340' },
    { id: 'corail', name: 'Corail', icon: '\uD83E\uDEB8', nightIcon: '\uD83C\uDF0A',
        dayAccent: '#ea580c', dayHover: '#f97316', nightAccent: '#fb7185', nightHover: '#fda4af' },
    { id: 'marron', name: 'Marron', icon: '\uD83E\uDDF4', nightIcon: '\u2615',
        dayAccent: '#78350f', dayHover: '#92400e', nightAccent: '#b45309', nightHover: '#d97706' },
    { id: 'lavande', name: 'Lavande', icon: '\uD83C\uDF38', nightIcon: '\uD83D\uDC9C',
        dayAccent: '#7c6bc4', dayHover: '#9585dc', nightAccent: '#b8a8ff', nightHover: '#ccc0ff' },
    { id: 'prune', name: 'Prune', icon: '\uD83C\uDF47', nightIcon: '\uD83D\uDC9F',
        dayAccent: '#581c87', dayHover: '#6b21a8', nightAccent: '#9333ea', nightHover: '#a855f7' },
    { id: 'olive', name: 'Olive', icon: '\uD83E\uDDED', nightIcon: '\uD83C\uDF3F',
        dayAccent: '#4d7c0f', dayHover: '#65a30d', nightAccent: '#84cc16', nightHover: '#a3e635' },
    { id: 'marine', name: 'Marine', icon: '\u2693', nightIcon: '\uD83C\uDF0A',
        dayAccent: '#1e3a8a', dayHover: '#1d4ed8', nightAccent: '#3b82f6', nightHover: '#60a5fa' },
    { id: 'or', name: 'Or', icon: '\u2728', nightIcon: '\uD83C\uDFC6',
        dayAccent: '#a16207', dayHover: '#ca8a04', nightAccent: '#eab308', nightHover: '#facc15' },
    { id: 'magenta', name: 'Magenta', icon: '\uD83D\uDC96', nightIcon: '\uD83D\uDC95',
        dayAccent: '#db2777', dayHover: '#ec4899', nightAccent: '#ff2d55', nightHover: '#ff6488' }
];

function registerExtraFamilies(defs) {
    for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        var dayId = d.id + '-day';
        var nightId = d.id;
        if (d.day && d.night) {
            GENERATED_PALETTES[dayId] = d.day;
            GENERATED_PALETTES[nightId] = d.night;
        } else {
            GENERATED_PALETTES[dayId] = makeDayPalette(d.dayAccent, d.dayHover, d.dayOpts);
            GENERATED_PALETTES[nightId] = makeNightPalette(d.nightAccent, d.nightHover, d.nightOpts);
        }
        FAMILIES.push({
            id: d.id,
            name: d.name,
            icon: d.icon,
            dayId: dayId,
            nightId: nightId
        });
        THEME_META[dayId] = {
            name: d.name + ' clair',
            icon: d.icon,
            preview: GENERATED_PALETTES[dayId]['--bg-black'],
            family: d.id,
            mode: 'day'
        };
        THEME_META[nightId] = {
            name: d.name,
            icon: d.nightIcon || d.icon,
            preview: GENERATED_PALETTES[nightId]['--bg-black'],
            family: d.id,
            mode: 'night'
        };
    }
}

var FAMILIES = [
    { id: 'casse', name: 'Cassé', icon: '\u2600\uFE0F', dayId: 'light', nightId: 'dark' },
    { id: 'bleu', name: 'Bleu', icon: '\uD83D\uDC99', dayId: 'bleu-day', nightId: 'bleu' },
    { id: 'vert', name: 'Vert', icon: '\uD83C\uDF3F', dayId: 'vert-day', nightId: 'vert' },
    { id: 'jaune', name: 'Jaune', icon: '\uD83C\uDF3B', dayId: 'jaune-day', nightId: 'jaune' },
    { id: 'orange', name: 'Orange', icon: '\uD83C\uDF4A', dayId: 'orange-day', nightId: 'orange' },
    { id: 'rouge', name: 'Rouge', icon: '\uD83C\uDF39', dayId: 'rouge-day', nightId: 'rouge' },
    { id: 'violet', name: 'Violet', icon: '\uD83D\uDC9C', dayId: 'violet-day', nightId: 'violet' },
    { id: 'fuchsia', name: 'Fuchsia', icon: '\uD83E\uDEA6', dayId: 'fuchsia-day', nightId: 'fuchsia' },
    { id: 'turquoise', name: 'Turquoise', icon: '\uD83C\uDFD6\uFE0F', dayId: 'turquoise-day', nightId: 'turquoise' },
    { id: 'rose', name: 'Rose', icon: '\uD83C\uDF37', dayId: 'rose-day', nightId: 'rose' }
];

var THEME_META = {
    light: { name: 'Cassé', icon: '\u2600\uFE0F', preview: '#f5f0eb', family: 'casse', mode: 'day' },
    dark: { name: 'Cassé sombre', icon: '\uD83C\uDF19', preview: '#1a1612', family: 'casse', mode: 'night' },
    'bleu-day': { name: 'Bleu clair', icon: '\uD83D\uDC99', preview: '#f2f4f8', family: 'bleu', mode: 'day' },
    bleu: { name: 'Bleu', icon: '\uD83D\uDC99', preview: '#1e1e1e', family: 'bleu', mode: 'night' },
    'vert-day': { name: 'Vert clair', icon: '\uD83C\uDF3F', preview: '#eef6ee', family: 'vert', mode: 'day' },
    vert: { name: 'Vert', icon: '\uD83C\uDF3F', preview: '#081408', family: 'vert', mode: 'night' },
    'jaune-day': { name: 'Jaune clair', icon: '\uD83C\uDF3B', preview: '#faf8e8', family: 'jaune', mode: 'day' },
    jaune: { name: 'Jaune', icon: '\uD83C\uDF3B', preview: '#141208', family: 'jaune', mode: 'night' },
    'orange-day': { name: 'Orange clair', icon: '\uD83C\uDF4A', preview: '#faf3e8', family: 'orange', mode: 'day' },
    orange: { name: 'Orange', icon: '\uD83D\uDD25', preview: '#1a1208', family: 'orange', mode: 'night' },
    'rouge-day': { name: 'Rouge clair', icon: '\uD83C\uDF39', preview: '#faf2f2', family: 'rouge', mode: 'day' },
    rouge: { name: 'Rouge', icon: '\uD83D\uDD34', preview: '#180606', family: 'rouge', mode: 'night' },
    'violet-day': { name: 'Violet clair', icon: '\uD83D\uDC9C', preview: '#f4f0fa', family: 'violet', mode: 'day' },
    violet: { name: 'Violet', icon: '\uD83D\uDC9C', preview: '#120818', family: 'violet', mode: 'night' },
    'fuchsia-day': { name: 'Fuchsia clair', icon: '\uD83E\uDEA6', preview: '#f8f0fa', family: 'fuchsia', mode: 'day' },
    fuchsia: { name: 'Fuchsia', icon: '\uD83D\uDC9C', preview: '#140818', family: 'fuchsia', mode: 'night' },
    'turquoise-day': { name: 'Turquoise clair', icon: '\uD83C\uDFD6\uFE0F', preview: '#eef6fa', family: 'turquoise', mode: 'day' },
    turquoise: { name: 'Turquoise', icon: '\uD83C\uDF0A', preview: '#081418', family: 'turquoise', mode: 'night' },
    'rose-day': { name: 'Rose clair', icon: '\uD83C\uDF37', preview: '#faf0f6', family: 'rose', mode: 'day' },
    rose: { name: 'Rose', icon: '\uD83C\uDF38', preview: '#140610', family: 'rose', mode: 'night' }
};

function parseHex(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6) return { r: 0, g: 0, b: 0 };
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16)
    };
}

function toHex(r, g, b) {
    function clamp(n) { return Math.max(0, Math.min(255, Math.round(n))); }
    function pad(n) { var s = clamp(n).toString(16); return s.length === 1 ? '0' + s : s; }
    return '#' + pad(r) + pad(g) + pad(b);
}

function hexMix(a, b, ratioA) {
    var ca = parseHex(a);
    var cb = parseHex(b);
    var t = ratioA;
    return toHex(
        ca.r * t + cb.r * (1 - t),
        ca.g * t + cb.g * (1 - t),
        ca.b * t + cb.b * (1 - t)
    );
}

function luminance(hex) {
    var c = parseHex(hex);
    function lin(v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

function contrastRatio(fgHex, bgHex) {
    var l1 = luminance(fgHex);
    var l2 = luminance(bgHex);
    var lighter = Math.max(l1, l2);
    var darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

function ensureContrast(fgHex, bgHex, minRatio) {
    minRatio = minRatio || 4.5;
    if (!fgHex || !bgHex) return bestTextOnBg(bgHex, minRatio);
    if (contrastRatio(fgHex, bgHex) >= minRatio) return fgHex;
    var mixTarget = luminance(bgHex) > 0.45 ? '#111111' : '#f5f5f5';
    var t;
    for (t = 0.05; t <= 1; t += 0.05) {
        var candidate = hexMix(fgHex, mixTarget, t);
        if (contrastRatio(candidate, bgHex) >= minRatio) return candidate;
    }
    return bestTextOnBg(bgHex, minRatio);
}

/** Soft accent adjust: keep hue recognizable (max mix toward black/white). */
function softEnsureAccent(fgHex, bgHex, minRatio, maxMix) {
    minRatio = minRatio || 2.2;
    maxMix = maxMix == null ? 0.45 : maxMix;
    if (!fgHex || !bgHex) return fgHex || '#c0392b';
    if (contrastRatio(fgHex, bgHex) >= minRatio) return fgHex;
    var mixTarget = luminance(bgHex) > 0.45 ? '#111111' : '#f5f5f5';
    var t;
    var best = fgHex;
    var bestRatio = contrastRatio(fgHex, bgHex);
    for (t = 0.05; t <= maxMix + 0.001; t += 0.05) {
        var candidate = hexMix(fgHex, mixTarget, t);
        var r = contrastRatio(candidate, bgHex);
        if (r > bestRatio) {
            best = candidate;
            bestRatio = r;
        }
        if (r >= minRatio) return candidate;
    }
    return best;
}

function isLogoPairDistinct(aHex, bHex) {
    if (!aHex || !bHex) return false;
    return contrastRatio(aHex, bHex) >= 1.85 ||
        Math.abs(luminance(aHex) - luminance(bHex)) >= 0.14;
}

/**
 * Logo nav : mot1 = texte principal ; mot2 = accent thème, toujours distinct.
 * Ne réutilise pas --role-brand-text (trop assombri pour le chrome hero).
 */
function buildNavLogoColors(vars, semantic) {
    var navBg = vars['--bg-dark'] || vars['--bg-black'];
    var accent = vars['--accent-red'];
    var accentHover = vars['--accent-hover'] || accent;
    var textMain = (semantic && semantic['--text-white-safe']) || vars['--text-white'];
    var word1 = ensureContrast(textMain, navBg, 4.5);
    var word2 = softEnsureAccent(accent, navBg, 2.2, 0.4);

    if (!isLogoPairDistinct(word1, word2)) {
        var tryHover = softEnsureAccent(accentHover, navBg, 2.2, 0.4);
        if (isLogoPairDistinct(word1, tryHover)) {
            word2 = tryHover;
        } else {
            var away = luminance(word1) > 0.5 ? '#1a1a1a' : '#f5f5f5';
            var t;
            word2 = accent;
            for (t = 0.15; t <= 0.85; t += 0.05) {
                var candidate = softEnsureAccent(hexMix(accent, away, t), navBg, 2.2, 0.35);
                if (isLogoPairDistinct(word1, candidate) && contrastRatio(candidate, navBg) >= 2.0) {
                    word2 = candidate;
                    break;
                }
            }
            if (!isLogoPairDistinct(word1, word2)) {
                word2 = softEnsureAccent(hexMix(accent, away, 0.55), navBg, 2.2, 0.5);
            }
        }
    }

    return {
        '--nav-logo-word1': word1,
        '--nav-logo-word2': word2
    };
}

function ensureContrastDual(fgHex, bgA, bgB, minRatio) {
    var onA = ensureContrast(fgHex, bgA, minRatio);
    if (contrastRatio(onA, bgB) >= minRatio) return onA;
    var worst = contrastRatio(fgHex, bgA) <= contrastRatio(fgHex, bgB) ? bgA : bgB;
    return ensureContrast(fgHex, worst, minRatio);
}

function contrastText(bgHex) {
    return luminance(bgHex) > 0.45 ? '#1a1a1a' : '#ffffff';
}

function bestTextOnBg(bgHex, minRatio) {
    minRatio = minRatio || 4.5;
    if (!bgHex) return '#ffffff';
    var options = ['#000000', '#111111', '#ffffff', '#f5f5f5'];
    var i;
    for (i = 0; i < options.length; i++) {
        if (contrastRatio(options[i], bgHex) >= minRatio) return options[i];
    }
    var t;
    for (t = 0.05; t <= 1; t += 0.05) {
        var dark = hexMix('#666666', '#000000', t);
        if (contrastRatio(dark, bgHex) >= minRatio) return dark;
    }
    for (t = 0.05; t <= 1; t += 0.05) {
        var light = hexMix('#999999', '#ffffff', t);
        if (contrastRatio(light, bgHex) >= minRatio) return light;
    }
    return contrastRatio('#000000', bgHex) >= contrastRatio('#ffffff', bgHex) ? '#000000' : '#ffffff';
}

function ensureMinLumGap(lighterHex, darkerHex, minGap) {
    var result = darkerHex;
    var steps = 0;
    while (luminance(lighterHex) - luminance(result) < minGap && steps < 24) {
        result = hexMix(result, '#505050', 0.14);
        steps++;
    }
    return result;
}

function makeDayPalette(accent, hover, opts) {
    opts = opts || {};
    if (opts.neutral) {
        return {
            '--bg-black': '#f2f2f7',
            '--bg-dark': '#e5e5ea',
            '--surface': '#d1d1d6',
            '--text-white': '#1c1c1e',
            '--text-muted': '#636366',
            '--accent-red': accent,
            '--accent-hover': hover,
            '--border': '#c7c7cc',
            '--success': '#2a9850',
            '--error': opts.error || '#d83030',
            '--btn-text': luminance(accent) > 0.62 ? '#111111' : '#ffffff',
            '--input-bg': '#ececf0',
            '--input-focus-bg': '#f2f2f7',
            '--text-on-accent': luminance(accent) > 0.62 ? '#111111' : '#ffffff'
        };
    }


    var canvas = hexMix(accent, '#f6f6f6', 0.08);
    var raised = hexMix(accent, '#e8e8e8', 0.14);
    var surface = hexMix(accent, '#d4d4d4', 0.20);
    var border = hexMix(accent, '#ababab', 0.28);
    var inputBg = hexMix(accent, '#eeeeee', 0.11);
    var textMain = hexMix(accent, '#141414', 0.10);
    var textMuted = hexMix(accent, '#505050', 0.22);

    raised = ensureMinLumGap(canvas, raised, 0.07);
    surface = ensureMinLumGap(raised, surface, 0.08);
    border = ensureMinLumGap(surface, border, 0.06);

    return {
        '--bg-black': canvas,
        '--bg-dark': raised,
        '--surface': surface,
        '--text-white': textMain,
        '--text-muted': textMuted,
        '--accent-red': accent,
        '--accent-hover': hover,
        '--border': border,
        '--success': '#2a9850',
        '--error': opts.error || '#d83030',
        '--btn-text': luminance(accent) > 0.62 ? '#111111' : '#ffffff',
        '--input-bg': inputBg,
        '--input-focus-bg': canvas,
        '--text-on-accent': luminance(accent) > 0.62 ? '#111111' : '#ffffff'
    };
}

function makeNightPalette(accent, hover, opts) {
    opts = opts || {};
    var mix = opts.hueMix != null ? opts.hueMix : 0.55;
    return {
        '--bg-black': hexMix('#060606', accent, mix),
        '--bg-dark': hexMix('#101010', accent, mix - 0.04),
        '--surface': hexMix('#1a1a1a', accent, mix - 0.08),
        '--text-white': hexMix('#eaeaea', accent, 0.12),
        '--text-muted': hexMix('#909090', accent, 0.18),
        '--accent-red': accent,
        '--accent-hover': hover,
        '--border': hexMix('#2e2e2e', accent, 0.28),
        '--success': '#3ecf7a',
        '--error': opts.error || '#f06060',
        '--btn-text': luminance(accent) > 0.62 ? '#080808' : '#ffffff',
        '--input-bg': hexMix('#060606', accent, mix),
        '--input-focus-bg': hexMix('#101010', accent, mix - 0.04),
        '--text-on-accent': luminance(accent) > 0.62 ? '#080808' : '#ffffff'
    };
}

registerExtraFamilies(EXTRA_FAMILY_DEFS);

function reorderThemeFamilies() {
    var priority = ['casse', 'noir', 'gris'];
    var map = {};
    var i;
    for (i = 0; i < FAMILIES.length; i++) map[FAMILIES[i].id] = FAMILIES[i];
    var next = [];
    for (i = 0; i < priority.length; i++) {
        if (map[priority[i]]) {
            next.push(map[priority[i]]);
            delete map[priority[i]];
        }
    }
    for (i = 0; i < FAMILIES.length; i++) {
        if (map[FAMILIES[i].id]) next.push(FAMILIES[i]);
    }
    FAMILIES.length = 0;
    for (i = 0; i < next.length; i++) FAMILIES.push(next[i]);
}

reorderThemeFamilies();

function getBaseVars(id) {
    if (id === 'light') return FROZEN_LIGHT;
    if (id === 'dark') return FROZEN_DARK;
    return GENERATED_PALETTES[id] || null;
}

function buildSemantic(vars) {
    var brand = vars['--accent-red'];
    var brandHover = vars['--accent-hover'];
    var surface = vars['--surface'];
    var bg = vars['--bg-black'];
    var bgDark = vars['--bg-dark'];
    var textMain = vars['--text-white'];
    var muted = vars['--text-muted'];
    var contextBg = brand;
    var bgLum = luminance(bg);
    var brandTextMin = bgLum < 0.2 ? 6 : 4.5;
    var ctaText = ensureContrast(vars['--text-on-accent'] || contrastText(brand), brand, 4.5);
    var success = vars['--success'];
    var error = vars['--error'];
    var pendingBg = bgLum > 0.45 ? hexMix(muted, '#ffffff', 0.78) : hexMix(muted, bg, 0.38);
    var loadingBg = bgLum > 0.45 ? hexMix(brand, bg, 0.90) : hexMix(brand, bg, 0.68);
    var okBg = bgLum > 0.45 ? hexMix(success, '#ffffff', 0.82) : hexMix(success, bg, 0.86);
    var errorBg = bgLum > 0.45 ? hexMix(error, '#ffffff', 0.84) : hexMix(error, bg, 0.84);
    var warnBase = '#ffb020';
    var warnBg = bgLum > 0.45 ? hexMix(warnBase, '#ffffff', 0.82) : hexMix(warnBase, bg, 0.84);
    var preprodBg = bgLum > 0.45 ? hexMix('#e89020', '#ffffff', 0.80) : hexMix('#e89020', bgDark, 0.38);
    var prodBg = bgLum > 0.45 ? hexMix(success, '#ffffff', 0.78) : hexMix(success, bgDark, 0.36);
    var selfhostedBg = bgLum > 0.45 ? hexMix(muted, '#ffffff', 0.72) : hexMix(muted, bg, 0.42);

    return {
        '--role-brand': brand,
        '--role-brand-hover': brandHover,
        '--role-brand-text': ensureContrast(brand, bg, brandTextMin),
        '--role-brand-text-hover': ensureContrast(brandHover, bg, brandTextMin),
        '--role-brand-text-on-surface': ensureContrast(brand, surface, 4.5),
        '--role-cta-primary': brand,
        '--role-cta-primary-text': ctaText,
        '--role-cta-primary-muted': hexMix(brand, surface, 0.72),
        '--role-context': contextBg,
        '--role-context-text': bestTextOnBg(contextBg, 4.5),
        '--role-context-surface': hexMix(surface, bg, 0.55),
        '--role-options': hexMix(brand, textMain, 0.35),
        '--role-options-text': ensureContrast(brand, bgDark, 4.5),
        '--role-options-surface': hexMix(surface, bg, 0.4),
        '--role-chrome': ensureContrast(muted, bg, 3),
        '--role-listening': ensureContrast(brand, bg, 3),
        '--role-thinking': ensureContrast(hexMix(brand, surface, 0.55), bgDark, 3),
        '--role-stream': ensureContrast(brand, bg, 3),
        '--role-badge-text': ensureContrast(brand, hexMix(brand, bg, 0.88), brandTextMin),
        '--role-error-text': ensureContrast(vars['--error'], bg, brandTextMin),
        '--role-success-text': ensureContrast(vars['--success'], bg, bgLum < 0.2 ? 4.5 : 3),
        '--role-on-accent': ctaText,
        '--text-white-safe': ensureContrastDual(textMain, bg, surface, 4.5),
        '--text-muted-safe': ensureContrastDual(muted, bg, surface, 3),
        '--role-chrome-text': ensureContrast(textMain, bg, 4.5),
        '--role-stt-chip-bg': bg,
        '--role-stt-chip-text': ensureContrast(textMain, bg, 4.5),
        '--role-stt-pending-bg': pendingBg,
        '--role-stt-pending-text': bestTextOnBg(pendingBg, 4.5),
        '--role-stt-pending-border': ensureContrast(muted, bg, 3),
        '--role-stt-loading-bg': loadingBg,
        '--role-stt-loading-text': bestTextOnBg(loadingBg, 4.5),
        '--role-stt-loading-border': ensureContrast(brand, loadingBg, 3),
        '--role-stt-ok-bg': okBg,
        '--role-stt-ok-text': bestTextOnBg(okBg, 4.5),
        '--role-stt-error-bg': errorBg,
        '--role-stt-error-text': bestTextOnBg(errorBg, 4.5),
        '--role-stt-warn-bg': warnBg,
        '--role-stt-warn-text': bestTextOnBg(warnBg, 4.5),
        '--role-env-prod-bg': prodBg,
        '--role-env-prod-text': bestTextOnBg(prodBg, 4.5),
        '--role-env-preprod-bg': preprodBg,
        '--role-env-preprod-text': bestTextOnBg(preprodBg, 4.5),
        '--role-env-selfhosted-bg': selfhostedBg,
        '--role-env-selfhosted-text': bestTextOnBg(selfhostedBg, 4.5)
    };
}

function buildThemesList() {
    var list = [];
    var order = [
        'light', 'dark',
        'noir-day', 'noir', 'gris-day', 'gris',
        'bleu-day', 'bleu', 'marine-day', 'marine', 'indigo-day', 'indigo', 'cyan-day', 'cyan', 'turquoise-day', 'turquoise',
        'vert-day', 'vert', 'lime-day', 'lime', 'menthe-day', 'menthe', 'olive-day', 'olive',
        'jaune-day', 'jaune', 'or-day', 'or', 'ambre-day', 'ambre', 'orange-day', 'orange',
        'rouge-day', 'rouge', 'corail-day', 'corail', 'rose-day', 'rose', 'magenta-day', 'magenta',
        'violet-day', 'violet', 'lavande-day', 'lavande', 'fuchsia-day', 'fuchsia', 'prune-day', 'prune',
        'marron-day', 'marron'
    ];
    for (var i = 0; i < order.length; i++) {
        var id = order[i];
        var base = getBaseVars(id);
        var meta = THEME_META[id];
        if (!base || !meta) continue;
        list.push({
            id: id,
            name: meta.name,
            icon: meta.icon,
            preview: meta.preview,
            family: meta.family,
            mode: meta.mode,
            vars: base
        });
    }
    return list;
}

var THEMES = buildThemesList();

T.migrateThemeId = function(id) {
    if (!id) return id;
    var s = String(id);
    if (THEME_MIGRATION[s]) return THEME_MIGRATION[s];
    for (var i = 0; i < THEMES.length; i++) {
        if (THEMES[i].id === s) return s;
    }
    return defaultThemeId();
};

T.list = function() {
    var out = [];
    for (var i = 0; i < THEMES.length; i++) out.push(cloneThemeEntry(THEMES[i]));
    return out;
};

T.listFamilies = function() { return FAMILIES.map(cloneFamilyEntry); };

T.get = function(id) {
    var migrated = T.migrateThemeId(id);
    for (var i = 0; i < THEMES.length; i++) {
        if (THEMES[i].id === migrated) return cloneThemeEntry(THEMES[i]);
    }
    for (var j = 0; j < THEMES.length; j++) {
        if (THEMES[j].id === defaultThemeId()) return cloneThemeEntry(THEMES[j]);
    }
    return cloneThemeEntry(THEMES[0]);
};

T.getFamily = function(themeId) {
    var theme = T.get(themeId);
    for (var i = 0; i < FAMILIES.length; i++) {
        if (FAMILIES[i].id === theme.family) return cloneFamilyEntry(FAMILIES[i]);
    }
    return cloneFamilyEntry(FAMILIES[0]);
};

T.isDayMode = function(themeId) {
    var theme = T.get(themeId);
    return theme.mode === 'day';
};

T.resolveThemeId = function(raw) {
    if (raw) return T.migrateThemeId(String(raw));
    return defaultThemeId();
};

T.current = function() {
    var saved = null;
    if (window.PDM && window.PDM.Storage) {
        saved = window.PDM.Storage.get(window.PDM.Storage.KEYS.THEME);
    }
    return T.resolveThemeId(saved);
};

T.apply = function(id) {
    var canonical = T.migrateThemeId(id);
    var theme = T.get(canonical);
    var root = document.documentElement;
    root.setAttribute('data-theme', canonical);
    root.setAttribute('data-theme-mode', theme.mode);
    root.setAttribute('data-theme-family', theme.family);

    var vars = theme.vars;
    var semantic = buildSemantic(vars);
    var all = {};
    var k;
    for (k in vars) {
        if (vars.hasOwnProperty(k)) all[k] = vars[k];
    }
    for (k in semantic) {
        if (semantic.hasOwnProperty(k)) all[k] = semantic[k];
    }

    for (k in all) {
        if (all.hasOwnProperty(k)) {
            root.style.setProperty(k, all[k]);
        }
    }

    root.style.setProperty('--output-bg', vars['--input-bg']);
    root.style.setProperty('--output-text', semantic['--text-white-safe'] || vars['--text-white']);
    root.style.setProperty('--output-highlight', semantic['--role-brand-text'] || vars['--accent-red']);
    root.style.setProperty('--thinking-bg', vars['--input-bg']);
    root.style.setProperty('--thinking-text', semantic['--text-white-safe'] || vars['--text-white']);
    root.style.setProperty('--thinking-accent', semantic['--role-thinking']);
    root.style.setProperty('--accent-red', vars['--accent-red']);
    root.style.setProperty('--accent-hover', vars['--accent-hover']);
    root.style.setProperty('--text-white', semantic['--text-white-safe'] || vars['--text-white']);
    root.style.setProperty('--text-muted', semantic['--text-muted-safe'] || vars['--text-muted']);
    root.style.setProperty('--text-on-accent', bestTextOnBg(vars['--accent-red'], 4.5));

    var logoColors = buildNavLogoColors(vars, semantic);
    root.style.setProperty('--nav-logo-word1', logoColors['--nav-logo-word1']);
    root.style.setProperty('--nav-logo-word2', logoColors['--nav-logo-word2']);

    root.style.colorScheme = theme.mode === 'day' ? 'light' : 'dark';

    if (window.PDM && window.PDM.Storage) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.THEME, canonical);
    }
    T.updateToggleIcon(canonical);
    T.updatePicker(canonical);
};

T.init = function() {
    var id = T.current();
    var migrated = T.migrateThemeId(id);
    if (window.PDM && window.PDM.Storage && migrated !== window.PDM.Storage.get(window.PDM.Storage.KEYS.THEME)) {
        window.PDM.Storage.set(window.PDM.Storage.KEYS.THEME, migrated);
    }
    T.apply(migrated);
};

T.toggleNightMode = function() {
    var cur = T.current();
    var family = T.getFamily(cur);
    var next = T.isDayMode(cur) ? family.nightId : family.dayId;
    T.apply(next);
};

T.toggleLightDark = function() {
    T.toggleNightMode();
};

T.applyFamilyMode = function(familyId, mode) {
    for (var i = 0; i < FAMILIES.length; i++) {
        if (FAMILIES[i].id === familyId) {
            T.apply(mode === 'night' ? FAMILIES[i].nightId : FAMILIES[i].dayId);
            return;
        }
    }
};

T.updateToggleIcon = function(id) {
    var btn = document.getElementById('theme-toggle');
    var theme = T.get(id);
    var family = T.getFamily(id);
    var modeLabel = T.isDayMode(id) ? themeT('modeLight') : themeT('modeDark');
    if (!modeLabel || modeLabel.indexOf('themes.mode') === 0) {
        modeLabel = T.isDayMode(id) ? 'clair' : 'sombre';
    }
    var prefix = themeT('titlePrefix');
    if (!prefix || prefix.indexOf('themes.titlePrefix') === 0) prefix = 'Th\u00e8me :';
    var title = prefix + ' ' + family.name + ' (' + modeLabel + ')';
    if (btn) {
        btn.textContent = theme.icon;
        btn.title = title;
    }
    var btnMobile = document.getElementById('theme-toggle-mobile');
    if (btnMobile) {
        btnMobile.textContent = theme.icon + ' ' + family.name;
        btnMobile.title = title;
    }
};

T.refresh = function() {
    var cur = T.current();
    T.updateToggleIcon(cur);
    T.updatePicker(cur);
};

T.updatePicker = function(activeId) {
    var canonical = T.migrateThemeId(activeId || T.current());
    var activeTheme = T.get(canonical);
    var activeFamily = activeTheme.family;
    var items = document.querySelectorAll('.theme-swatch');
    for (var i = 0; i < items.length; i++) {
        var fam = items[i].dataset.family;
        var isActive = fam === activeFamily;
        items[i].classList.toggle('active', isActive);
        items[i].setAttribute('aria-selected', isActive ? 'true' : 'false');
        var dayBtn = items[i].querySelector('[data-theme-mode="day"]');
        var nightBtn = items[i].querySelector('[data-theme-mode="night"]');
        if (dayBtn) dayBtn.classList.toggle('is-active-mode', isActive && activeTheme.mode === 'day');
        if (nightBtn) nightBtn.classList.toggle('is-active-mode', isActive && activeTheme.mode === 'night');
    }
    if (window.PDM.UI && window.PDM.UI.updateThemeCurrentLabel) {
        window.PDM.UI.updateThemeCurrentLabel(canonical);
    }
};

window.PDM = window.PDM || {};
window.PDM.Themes = T;
})();
