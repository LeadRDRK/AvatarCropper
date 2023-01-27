import pbfe from "./pbfe.js";
import touchToMouseEvent from "./touch-to-mouse-event.js";

var container, box;
var hslModeBtn, rgbModeBtn;
var hexInput;
var pickers = [];

var currentElement;

var modeInfo = {
    hsl: {
        maxValues: [360, 100, 100, 255],
        toCss: cssHsla,
        toHex: hslToHex,
        convFunc: rgbToHsl
    },
    rgb: {
        maxValues: [255, 255, 255, 255],
        toCss: cssRgba,
        toHex: rgbToHex,
        convFunc: hslToRgb
    }
};

function init(_container) {
    container = _container;

    box = new pbfe.Floatbox;
    box.element.classList.add("hide");
    box.element.id = "colorPicker";

    var rootFlex = new pbfe.Flexbox;
    rootFlex.flexDirection = "column";
    rootFlex.gap = "0.25rem";
    box.appendChild(rootFlex);

    var modeFlex = new pbfe.Flexbox;
    modeFlex.element.style.marginBottom = "0.5rem";
    rootFlex.appendChild(modeFlex);

    hslModeBtn = new pbfe.Button("HSL");
    hslModeBtn.element.classList.add("modeBtn");
    modeFlex.appendChild(hslModeBtn);

    rgbModeBtn = new pbfe.Button("RGB");
    rgbModeBtn.element.classList.add("modeBtn");
    modeFlex.appendChild(rgbModeBtn);

    rootFlex.appendChildren([
        createValuePicker("H"),
        createValuePicker("S"),
        createValuePicker("L"),
        createValuePicker("A"),
    ]);

    var hexFlex = new pbfe.Flexbox;
    hexFlex.justifyContent = "center";
    hexFlex.gap = "0.5rem";
    rootFlex.appendChild(hexFlex);

    var hexLabel = new pbfe.Label("Hex");
    hexFlex.appendChild(hexLabel);

    hexInput = new pbfe.Input("text");
    hexInput.placeholder = "ffffff";
    hexInput.element.style.fontFamily = "monospace";
    hexFlex.appendChild(hexInput);

    var closeBtn = new pbfe.Button("Close");
    closeBtn.element.style.marginTop = "0.5rem";
    rootFlex.appendChild(closeBtn);

    /* Events */
    hslModeBtn.addEventListener("click", setMode.bind(null, "hsl"));
    rgbModeBtn.addEventListener("click", setMode.bind(null, "rgb"));

    for (var i = 0; i < pickers.length; ++i) {
        var p = pickers[i];
        p.input.addEventListener("input", function() {
            setInputValue(p.input, p.input.value);
            updateColor();
        });
        var slider = p.slider;
        slider.addEventListener("mousedown", sliderMouseDown.bind(p));
        document.addEventListener("mousemove", mouseMoveListener);
        document.addEventListener("mouseup", mouseUpListener);
        slider.addEventListener("touchstart", touchToMouseEvent, { passive: true });
    }

    var hexColorRegexp = /^#?[0-9A-F]{6}$/i;
    var a = pickers[3];
    hexInput.addEventListener("input", function() {
        var value = this.value;
        if (!hexColorRegexp.test(value)) return;
        if (value[0] == "#") value = value.slice(1);

        var [r, g, b] = hexToRgb(value);
        setMode("rgb");
        setColor(r, g, b, getInputValue(pickers[3].input)); // keep alpha value
    });

    closeBtn.addEventListener("click", hide);

    /* Init */
    setSliderGradient(a.slider, [cssRgba(255, 255, 255, 0), cssRgba(255, 255, 255, 1)]);
    setMode("hsl");
}

function createValuePicker(text) {
    var flex = new pbfe.Flexbox;
    flex.element.classList.add("valueFlex");

    var label = new pbfe.Label(text);
    flex.appendChild(label);

    var slider = new pbfe.Widget;
    slider.element.classList.add("slider");
    flex.appendChild(slider);

    var point = new pbfe.Widget;
    point.element.classList.add("sliderPoint");
    slider.appendChild(point);

    var input = new pbfe.Input("number");
    input.element.min = input.value = 0;
    flex.appendChild(input);

    pickers.push({
        label, slider, point, input, num: pickers.length
    });
    return flex;
}

function setInputValue(input, value) {
    input.value = Math.round(value);
    input.element.dataset.value = value;
}

function getInputValue(input) {
    return +input.element.dataset.value;
}

var mode;
function setMode(name) {
    if (mode == name) return;
    var prevMode = mode;
    mode = name;

    var [p0, p1, p2, p3] = pickers;
    var { maxValues, convFunc } = modeInfo[name];

    for (var i = 0; i < pickers.length; ++i) {
        var p = pickers[i];
        p.input.element.max = maxValues[i];
        if (i < mode.length) p.label.text = mode[i].toUpperCase();
    }

    // Mode specific stuff
    if (mode == "hsl") {
        setSliderGradient(p0.slider, [
            cssHsla(0,   100, 50, 1),
            cssHsla(60,  100, 50, 1),
            cssHsla(120, 100, 50, 1),
            cssHsla(180, 100, 50, 1),
            cssHsla(240, 100, 50, 1),
            cssHsla(300, 100, 50, 1),
            cssHsla(360, 100, 50, 1),
        ])

        hslModeBtn.element.classList.add("chosen");
        rgbModeBtn.element.classList.remove("chosen");
    }
    else if (mode == "rgb") {
        setSliderGradient(p0.slider, ["#000000", "#ff0000"]);
        setSliderGradient(p1.slider, ["#000000", "#00ff00"]);
        setSliderGradient(p2.slider, ["#000000", "#0000ff"]);

        rgbModeBtn.element.classList.add("chosen");
        hslModeBtn.element.classList.remove("chosen");
    }

    if (prevMode) {
        setColor(
            ...convFunc(
                getInputValue(p0.input),
                getInputValue(p1.input),
                getInputValue(p2.input)
            ),
            getInputValue(p3.input)
        );
    }
}

function setSliderGradient(slider, list) {
    slider.element.style.backgroundImage = "linear-gradient(90deg," + list.join(",") + ")";
}

function setColor(v1, v2, v3, a) {
    if (mode == "hsl") {
        var [h, s, l] = pickers;
        setSliderGradient(s.slider, [cssHsla(v1, 0, v3, 1), cssHsla(v1, 100, v3, 1)]);
        setSliderGradient(l.slider, ["#000000", cssHsla(v1, v2, 50, 1), "#ffffff"]);
    }

    var { maxValues, toCss, toHex } = modeInfo[mode];
    for (var i = 0; i < pickers.length; ++i) {
        var p = pickers[i];
        setInputValue(p.input, arguments[i]);
        p.point.element.style.left = (arguments[i] / maxValues[i]) * 100 + "%";
    }

    hexInput.value = toHex(v1, v2, v3);

    if (currentElement) {
        currentElement.style.backgroundColor = toCss(v1, v2, v3, a/255);
        currentElement.dispatchEvent(new Event("colorchange"));
    }
}

function updateColor() {
    var values = [];
    for (var i = 0; i < pickers.length; ++i) {
        values.push(pickers[i].input.value);
    }
    setColor(...values);
}

var currentPicker;
function sliderMouseDown(e) {
    currentPicker = this;
    mouseMoveListener(e);
}

function mouseMoveListener(e) {
    if (currentPicker) {
        e.preventDefault();

        var p = currentPicker;
        var sliderEl = p.slider.element;
        var rect = sliderEl.getBoundingClientRect();
        var rx = Math.max(rect.left, Math.min(e.clientX, rect.right)) - rect.left;
        var max = modeInfo[mode].maxValues[p.num];
        setInputValue(p.input, Math.round((rx / rect.width) * max));
        updateColor();
    }
}

function mouseUpListener(e) {
    currentPicker = null;
}

function show(colorEl) {
    if (!container.contains(box)) {
        container.appendChild(box);
        setTimeout(function() { box.element.classList.remove("hide"); }, 0);
    }

    if (colorEl) {
        if (currentElement == colorEl) return;
        currentElement = colorEl;

        var colorCss = colorEl.style.backgroundColor;
        if (colorCss.startsWith("rgb") || colorCss[0] == "#") {
            setMode("rgb");
            var [r, g, b, a] = colorCss[0] == "#" ?
                hexToRgb(colorCss.slice(1)) :
                colorCss.replace(/rgba?\(|\)/g, "").split(",");
            setColor(r, g, b, a === undefined ? 255 : a);
        }
        else if (colorCss.startsWith("hsl")) {
            setMode("hsl");
            var [h, s, l, a] = colorCss.replace(/hsla?\(|\)/g, "").split(",");
            setColor(h, s, l, a === undefined ? 255 : a);
        }

        var rect = colorEl.getBoundingClientRect();
        var boxEl = box.element;
        var pickerRect = boxEl.getBoundingClientRect();

        var top = Math.max(0, Math.min(rect.top - pickerRect.height - 6, window.innerHeight - pickerRect.height));
        var left = Math.max(0, Math.min(rect.right - pickerRect.width, window.innerWidth - pickerRect.width));

        boxEl.style.top = top + "px";
        boxEl.style.left = left + "px";
    }
    else {
        currentElement = null;
        setColor(0, 100, 100, 255);
    }
}

var hiding = false;
function hide() {
    if (!container.contains(box) || hiding) return;
    box.element.classList.add("hide");
    hiding = true;
    container.removeChildAfterTransition(box, function() { hiding = false; });
    currentElement = null;
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
        ? l === r
            ? (g - b) / s
            : l === g
            ? 2 + (b - r) / s
            : 4 + (r - g) / s
        : 0;
    return [
        60 * h < 0 ? 60 * h + 360 : 60 * h,
        100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
        (100 * (2 * l - s)) / 2,
    ];
};

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * f(0), 255 * f(8), 255 * f(4)];
};

function numToHex(num) {
    var hex = num.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    r = Math.floor(r);
    g = Math.floor(g);
    b = Math.floor(b);
    return numToHex(r) + numToHex(g) + numToHex(b);
}

function hslToHex(h, s, l) {
    return rgbToHex(...hslToRgb(h, s, l));
}

function hexToRgb(hex) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

function cssRgba(r, g, b, a) {
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

function cssHsla(h, s, l, a) {
    return "hsla(" + h + "," + s + "%," + l + "%," + a + ")";
}

var colorPicker = {
    init, show, hide
}
export default colorPicker;