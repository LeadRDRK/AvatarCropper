import { GifReader, GifWriter } from "./omggif.js";
var frames = [];

function load(file, inputs) {
    var reader = new FileReader;
    reader.onloadend = async function() {
        if (reader.error) {
            toast.show(_("Failed to load GIF frames."));
            return;
        }

        var view = new Uint8Array(reader.result);
        var gifReader;
        try {
            gifReader = new GifReader(view);
        }
        catch (e) {
            toast.show(_("Failed to load GIF frames: ") + e.message);
            return;
        }

        var { width, height } = gifReader;
        inputs.loopCount.value = gifReader.loopCount();

        var ndFrameData, lastFrameData;
        var clearBg;
        for (let i = 0; i < gifReader.numFrames(); ++i) {
            const info = gifReader.frameInfo(i);
            let inheritFrame;
            if (!clearBg) {
                if (info.disposal == 3)
                    inheritFrame = ndFrameData;
                else if (info.disposal != 0 && i > 0)
                    inheritFrame = lastFrameData;
            }
            else clearBg = false;
            
            let imageData;
            if (inheritFrame)
                imageData = new ImageData(new Uint8ClampedArray(inheritFrame), width, height);
            else
                imageData = new ImageData(width, height);

            gifReader.decodeAndBlitFrameRGBA(i, imageData.data);
            lastFrameData = imageData.data;
            
            if (info.disposal == 0)
                ndFrameData = imageData.data;
            else if (info.disposal == 2)
                clearBg = true;

            let bitmap = await createImageBitmap(imageData);
            frames[i] = { info, bitmap };
        }

        var lastFrame = gifReader.numFrames() - 1;
        inputs.frame.min = 0;
        inputs.frame.max = lastFrame;
        inputs.frame.value = 0;
        inputs.frame.disabled = false;
        inputs.endFrame.value = lastFrame;
        inputs.keepGifColors.checked = true;
    }
    reader.readAsArrayBuffer(file);
}

function Renderer(width, height, gopts) {
    this.buffer = [];
    this.writer = new GifWriter(this.buffer, width, height, gopts);
}

Renderer.prototype.addFrame = function(imageData, opts) {
    let delay = opts.delay != undefined ? opts.delay : 0;
    let disposal = opts.disposal != undefined ? opts.disposal : 2;
    let keepColors = opts.keepColors;
    let x = opts.x != undefined ? opts.x : 0;
    let y = opts.y != undefined ? opts.y : 0;

    let width = imageData.width;
    let height = imageData.height;

    let palette = [];
    let indexedPixels = [];
    let transparent = createFrame(imageData.data, palette, indexedPixels, keepColors);
    this.writer.addFrame(x, y, width, height, indexedPixels, {
        palette, delay, transparent, disposal
    });
}

Renderer.prototype.end = function() {
    this.writer.end();
}

Renderer.prototype.getUint8Array = function() {
    return Uint8Array.from(this.buffer);
}

function createFrame(px, palette, indexedPixels, keepColors) {
    var transparentIndex = null;
    for (let i = 0; i < px.length; i += 4) {
        let r = px[i];
        let g = px[i+1];
        let b = px[i+2];
        let a = px[i+3];

        if (a == 0) {
            if (transparentIndex == null) {
                if (palette.length < 256)
                    transparentIndex = palette.push(0) - 1;
                else {
                    indexedPixels.push(0);
                    continue;
                }
            }

            indexedPixels.push(transparentIndex);
            continue;
        }

        let rgb = ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
        let index, lastDiff = null;
        for (let x = 1; x < palette.length; ++x) {
            // Find color in palette
            let prgb = palette[x];
            if (prgb == rgb) {
                index = x;
                lastDiff = null;
                break;
            }

            // Check if color is close
            if (!keepColors || palette.length == 256) {
                let pr = (prgb >> 16) & 0xff;
                let pg = (prgb >> 8) & 0xff;
                let pb = prgb & 0xff;
                let diff = Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb);
                if (lastDiff == null || diff < lastDiff) {
                    index = x;
                    lastDiff = diff;
                }
            }
        }
        // Exponentially increase tolerance
        var tolerance = 15 + (40 * Math.pow(2, 10 * (palette.length / 256) - 10));
        if (palette.length != 256 && lastDiff > tolerance)
            index = null;

        if (!index)
            index = palette.push(rgb) - 1;
        
        indexedPixels.push(index);
    }

    if (palette.length == 256) return transparentIndex;
    // Palette length needs to be a power of 2
    // We do a *bit* of twiddling
    let v = palette.length; // max is 256 = 8 bits
    if (v < 2)
        v = 2
    else {
        --v;
        v |= v >> 1;
        v |= v >> 2;
        v |= v >> 4;
        ++v;
    }

    // Pad extra values
    let needed = v - palette.length;
    for (let i = 0; i < needed; ++i)
        palette.push(0);
    
    return transparentIndex;
}

function reset() {
    if (frames.length) {
        gif.frames = frames = [];
        return true;
    }
    return false;
}

function isAnimated() {
    return frames.length > 1;
}

var gif = {
    Renderer,
    load,
    reset,
    isAnimated,
    frames
}
export default gif;