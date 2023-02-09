import pbfe from "./pbfe.js"
import welcomeScreen from "./welcome-screen.js";
import DndHandler from "./dnd.js";
import loadingDialog from "./loading-dialog.js";
import editor from "./editor.js";
import toast from "./toast.js";
import i18n from "./i18n.js";
import { touchToMouseEvent } from "./utils.js";

function registerServiceWorker() {
    if ("serviceWorker" in navigator && process.env.NODE_ENV == "production") {
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

    loadingDialog.setProgress(-1);
    loadingDialog.show();

    welcomeScreen.init(container, function() {
        welcomeScreen.show();
        loadingDialog.hide();
    });

    var dnd = new DndHandler(container, document.body);
    dnd.addListener(e => {
        editor.open(e.detail, function() {
            if (welcomeScreen.shown)
                welcomeScreen.hide();
        });
    });

    if ("ontouchmove" in document) {
        document.addEventListener("touchmove", touchToMouseEvent, { passive: true });
        document.addEventListener("touchend", touchToMouseEvent, { passive: true });
    }

    window.scrollTo(0, 1);
}
appInit();

export default appInit;