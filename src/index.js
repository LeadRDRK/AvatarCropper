import pbfe from "./pbfe.js"
import welcomeScreen from "./welcome-screen.js";
import DndHandler from "./dnd.js";
import loadingDialog from "./loading-dialog.js";
import editor from "./editor.js";
import toast from "./toast.js";
import i18n from "./i18n.js";

function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register(new URL('./sw.js', import.meta.url));
    }
}

function getLang() {
    var lang = localStorage.getItem("lang");
    if (lang == null) {
        var langs = i18n.getLanguages();
        var preferredLang = navigator.language.toLowerCase();
        for (const i in langs) {
            if (i.indexOf(preferredLang) == 0) {
                lang = i;
                break;
            }
        }
        if (lang == null) lang = "en-us";
        localStorage.setItem("lang", lang);
    }
    return lang;
}

async function appInit() {
    registerServiceWorker();
    document.body.innerHTML = "";

    var container = new pbfe.Container;
    container.element.style.backgroundColor = "#1e1e1e";
    container.createShadow();

    toast.init(container);

    try {
        await i18n.init();
        var lang = getLang();
        try {
            await i18n.loadLanguage(lang);
        }
        catch {
            toast.show("Failed to load translations for " + lang);
        }
    }
    catch {
        toast.show("Failed to initialize i18n.");
    }

    editor.init(container);
    loadingDialog.init(container);
    welcomeScreen.init(container);
    welcomeScreen.show();

    var dnd = new DndHandler(container, document.body);
    dnd.addListener(e => {
        editor.open(e.detail, function() {
            if (welcomeScreen.shown)
                welcomeScreen.hide();
        });
    });

    window.scrollTo(0, 1);
}
appInit();

export default appInit;