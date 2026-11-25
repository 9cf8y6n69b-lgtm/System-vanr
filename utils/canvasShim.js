// بديل خفيف لـ canvas-constructor (يشتغل مع @napi-rs/canvas) — نفس أسماء الدوال المستخدمة في بوت التقييم
const path = require("path");
const { createCanvas, loadImage, GlobalFonts } = require("canvas");

function loadFont(file, { family }) {
    try { GlobalFonts.registerFromPath(path.resolve(file), family); } catch {}
}

class Canvas {
    constructor(width, height) {
        this.canvas = createCanvas(width, height);
        this.ctx = this.canvas.getContext("2d");
    }

    printImage(img, x, y, w, h) { this.ctx.drawImage(img, x, y, w, h); return this; }

    printCircularImage(img, x, y, radius) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
        this.ctx.restore();
        return this;
    }

    setTextAlign(align) { this.ctx.textAlign = align; return this; }
    setColor(color) { this.ctx.fillStyle = color; return this; }
    setTextFont(font) { this.ctx.font = font; return this; }

    printText(text, x, y) {
        const size = parseInt(this.ctx.font) || 25;
        String(text).split("\n").forEach((line, i) => this.ctx.fillText(line, x, y + i * (size + 4)));
        return this;
    }

    toBuffer() { return this.canvas.toBuffer("image/png"); }
}

module.exports = { Canvas, loadImage, loadFont };
