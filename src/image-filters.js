import { _ } from "./i18n.js";
import pbfe from "./pbfe.js";
import { redrawFunc, MenuInputs, createRangeDetents } from "./utils.js";

var dialog, inputs = new MenuInputs;
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
var imgSrc, callback;

var inputsInfo = {
    "brightness": { name: _("Brightness"), min: 0, max: 200, unit: "%" },
    "contrast":   { name: _("Contrast"),   min: 0, max: 200, unit: "%" },
    "hue-rotate": { name: _("Hue"),        min: 0, max: 360, unit: "deg" },
    "saturate":   { name: _("Saturation"), min: 0, max: 200, unit: "%" },
    "grayscale":  { name: _("Grayscale"),  min: 0, max: 100, unit: "%" },
    "sepia":      { name: _("Sepia"),      min: 0, max: 100, unit: "%" },
    "invert":     { name: _("Invert"),     min: 0, max: 100, unit: "%" },
    "opacity":    { name: _("Opacity"),    min: 0, max: 100, unit: "%" },
    "blur":       { name: _("Blur"),       min: 0, max: 100, unit: "px" }
}

var defaultInit = {
    "brightness": 100,
    "contrast":   100,
    "hue-rotate": 0,
    "saturate":   100,
    "grayscale":  0,
    "sepia":      0,
    "invert":     0,
    "opacity":    100,
    "blur":       0
}

var currentOptions;

function init(container) {
    dialog = new pbfe.Dialog(_("Filters"));
    dialog.element.style.textAlign = "center";
    dialog.element.style.minWidth = "22rem";
    container.appendChild(dialog);

    canvas.style.marginTop = "0";
    canvas.style.marginBottom = "0.5rem";
    dialog.body.appendChild(canvas);

    var detent0 = createRangeDetents("filterDetent0", [0]);
    var detent100 = createRangeDetents("filterDetent100", [100]);

    var inputWidgets = [];
    for (let func in inputsInfo) {
        var info = inputsInfo[func];
        var widget = inputs.create(func, info.name, "range");
        var input = inputs[func];
        input.min = info.min;
        input.max = info.max;
        
        var defaultValue = defaultInit[func];
        if (defaultValue == 0) input.setAttribute("list", detent0);
        else if (defaultValue == 100) input.setAttribute("list", detent100);

        input.addEventListener("input", function() {
            currentOptions[func] = this.value;
            redrawCanvas();
        });
        inputWidgets.push(widget);
    }

    var inputsBox = new pbfe.Widget;
    inputsBox.element.id = "filtersInputsBox";
    inputsBox.appendChildren(inputWidgets);
    dialog.appendChild(inputsBox);

    var resetBtn = new pbfe.Button(_("Reset"));
    resetBtn.element.style.marginRight = "auto";
    dialog.appendButton(resetBtn);

    var okBtn = new pbfe.Button(_("OK"));
    dialog.appendButton(okBtn);

    okBtn.addEventListener("click", function() {
        dialog.hide();
        if (callback) callback();
    });

    resetBtn.addEventListener("click", function() {
        for (let func in currentOptions) {
            inputs[func].value = defaultInit[func];
            delete currentOptions[func];
        }
        redrawCanvas();
    });
}

function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = optionsToFilter(currentOptions);
    ctx.drawImage(imgSrc, 0, 0);
}

var redrawCanvas = redrawFunc(drawCanvas);

function showOptions(init, imgSrc_, callback_) {
    if (!init) {
        init = defaultInit;
        currentOptions = {};
    }
    else currentOptions = init;

    for (let func in inputsInfo) {
        inputs[func].value = (func in init) ? init[func] : defaultInit[func];
    }

    imgSrc = imgSrc_;
    callback = callback_;

    canvas.width = imgSrc.width;
    canvas.height = imgSrc.height;
    redrawCanvas();
    dialog.show();
}

function optionsToFilter(options) {
    var filter = "";
    for (let func in options) {
        var value = options[func];
        if (value == defaultInit[func]) continue;

        var unit = inputsInfo[func].unit;
        filter += func + "(" + options[func] + unit + ")";
    }
    if (filter == "") filter = "none";
    return filter;
}

var imageFilters = {
    init, showOptions, optionsToFilter, canvas
};
export default imageFilters;