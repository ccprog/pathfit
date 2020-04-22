const sizeParser = require('./sizeParser.js');

class Scale {
    constructor(width, height, viewBox, fit) {
        this.fit = {};
        this.set_viewport(width, height, viewBox);
        this.set_preserveAspectRatio(fit.preserveAspectRatio);
        this.set_object_size(fit.object || {});
    }

    set_viewport(width, height, viewBox) {
        Object.assign(this, sizeParser.viewport(width, height, viewBox));
    }

    set_preserveAspectRatio(preserveAspectRatio = 'xMidYMid meet') {
        this.fit.par = sizeParser.aspect_ratio(preserveAspectRatio);
    }

    set_object_size({fit = 'contain', position = '50% 50%'}) {
        this.fit.object = sizeParser.object_size(fit, position);
    }

    transform_from_aspect_ratio (w, h) {
        const width = sizeParser.length(w);
        const height = sizeParser.length(h);

        let sx = width / this.width,
            sy = height / this.height;

        if (this.fit.par.preserve) {
            if (this.fit.par.slice) {
                sx = sy = Math.max(sx, sy);
            } else {
                sx = sy = Math.min(sx, sy);
            }
        }

        let tx = -this.x * sx + 0,
            ty = -this.y * sy + 0;

        if (this.fit.par.x === 'Mid') {
            tx += (width - this.width * sx) / 2;
        }
        if (this.fit.par.x === 'Max') {
            tx += (width - this.width * sx);
        }
        if (this.fit.par.y === 'Mid') {
            ty += (height - this.height * sy) / 2;
        }
        if (this.fit.par.y === 'Max') {
            ty += (height - this.height * sy);
        }

        const transform = [];
        if (tx !== 0 || ty !== 0) {
            transform.push({
                command: 'translate',
                tx,
                ty
            });
        }
        if (sx !== 1 || sy !== 1) {
            transform.push({
                command: 'scale',
                sx,
                sy
            });
        }
        return transform;
    }

    transform_from_object_fit (w, h) {
        const width = sizeParser.length(w);
        const height = sizeParser.length(h);

        const transform = [];

        return transform;
    }
}

module.exports = Scale;
