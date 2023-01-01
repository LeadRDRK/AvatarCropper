var strings = {};
var langs = {};

async function init() {
    var res = await fetch("./i18n/langs.json");
    var json = await res.json();
    langs = json;
}

async function loadLanguage(lang) {
    if (!(lang in langs)) throw new Error;
    var res = await fetch("./i18n/" + lang + ".json");
    var json = await res.json();
    strings = json;
}

function getString(str) {
    if (str in strings)
        return strings[str];
    else
        return str;
}

function getLanguages() {
    return langs;
}

var i18n = {
    init,
    loadLanguage,
    getString,
    getLanguages
};
export default i18n;
export var _ = getString;