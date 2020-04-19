class Scale {
    constructor(width, height, viewBox, preserveAspectRatio) {
        this.set_viewport(width, height, viewBox);
        this.set_preserveAspectRatio(preserveAspectRatio);
    }

    static get error () {
        return new Error('Cannot determine the size of the drawing.');
    }

    static parse_length (len) {
        const unit = typeof len === 'number' ? null : len.match(Scale.regex)[1];

        const value = parseFloat(len);
        if (value <= 0 || (unit && unit !== 'px')) throw Scale.error;

        return value;
    }

    set_viewport(width, height, viewBox) {
        if (viewBox) {
            [
                this.x, 
                this.y, 
                this.width, 
                this.height
            ] = viewBox.split(/[,\s]+/).map(str => parseFloat(str));

            if (this.width <= 0 || this.height <= 0) throw Scale.error;
        } else if (width && height) {
            this.x = 0;
            this.y = 0;
            this.width = Scale.parse_length(width);
            this.height = Scale.parse_length(height);
        } else {
            throw Scale.error;
        }
    }

    set_preserveAspectRatio(preserveAspectRatio = 'xMidYMid meet') {
        [ this.align, this.meetOrSlice ] = preserveAspectRatio.split(/\s/);
    }

    transform (w, h) {
        const width = Scale.parse_length(w);
        const height = Scale.parse_length(h);

        let sx = width / this.width,
            sy = height / this.height;

        if (this.align !== 'none') {
            if (this.meetOrSlice === 'slice') {
                sx = sy = Math.max(sx, sy);
            } else {
                sx = sy = Math.min(sx, sy);
            }
        }

        let tx = -this.x * sx + 0,
            ty = -this.y * sy + 0;

        if (this.align.includes('xMid')) {
            tx += (width - this.width * sx) / 2;
        }
        if (this.align.includes('xMax')) {
            tx += (width - this.width * sx);
        }
        if (this.align.includes('YMid')) {
            ty += (height - this.height * sy) / 2;
        }
        if (this.align.includes('YMax')) {
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
}
Scale.regex = /^(?:\d*\.\d+|\d+\.?)(?:[eE][\+\-]?\d+)*(.+)?/;

module.exports = Scale;
