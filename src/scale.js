const sizeParser = require('./sizeParser.js');

class Scale {
    constructor(width, height, viewBox, preserveAspectRatio, fit, position) {
        this.fit = { par: {}, object: {} };
        this.set_viewport(width, height, viewBox);
        this.set_preserveAspectRatio(preserveAspectRatio || undefined);
        this.set_object_fit(fit || undefined);
        this.set_object_position(position || undefined);
    }

    set_viewport(width, height, viewBox) {
        Object.assign(this, sizeParser.viewport(width, height, viewBox));
    }

    set_preserveAspectRatio(preserveAspectRatio = 'xMidYMid meet') {
        this.fit.par = sizeParser.aspect_ratio(preserveAspectRatio);
    }

    set_object_fit(fit = 'fill') {
        this.fit.object.fit = sizeParser.object_fit(fit);
    }

    set_object_position(position = '50% 50%') {
        Object.assign(this.fit.object, sizeParser.object_position(position));
    }

    static optimize_transform (sx, sy, tx, ty) {
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

        return Scale.optimize_transform (sx, sy, tx, ty);
    }

    static offset(position, scale, source, target) {
        if (position.relative) {
            if (position.reverse) {
                return (target - source * scale) * (100 - position.value) / 100;
            } else {
                return (target - source * scale) * position.value / 100;
            }
        } else {
            if (position.reverse) {
                return (target - source * scale) - position.value;
            } else {
                return position.value;
            }
        }
    }

    transform_from_object_fit (w, h) {
        const width = sizeParser.length(w);
        const height = sizeParser.length(h);

        let sx = width / this.width,
            sy = height / this.height;

        switch(this.fit.object.fit) {
        case 'contain':
            sx = sy = Math.min(sx, sy);
            break;

        case 'cover':
            sx = sy = Math.max(sx, sy);
            break;

        case 'none':
            sx = sy = 1;
            break;

        case 'scale-down':
            sx = sy = Math.min(1, sx, sy);
            break;
        }

        let tx = Scale.offset(this.fit.object.x, sx, this.width, width);
        let ty = Scale.offset(this.fit.object.y, sy, this.height, height);

        return Scale.optimize_transform (sx, sy, tx, ty);
    }
}

module.exports = Scale;
