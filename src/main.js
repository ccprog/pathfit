const PathParser = require('./pathParser.js');
const TransformParser = require('./transformParser.js');
const Transformer = require('./transformer.js');
const Scale = require('./scale.js');
const Formatter = require('./formatter.js');

class Pathfit {
    constructor(base, style, path, pretransform, opt) {
        if (base) this.set_viewbox(base);

        if (style) this.set_object_style(style);

        this.formatter = new Formatter({ precision: 6, ...opt });

        if (path) this.set_path(path, pretransform);
    }

    set_viewbox(base) {
        const {width, height, viewBox, preserveAspectRatio} = base;
        this.scale = new Scale(width, height, viewBox, preserveAspectRatio);
    }

    set_aspect_ratio(preserveAspectRatio) {
        if (!this.scale) {
            throw new Error('no reference viewBox is set');
        }

        this.scale.set_preserveAspectRatio(preserveAspectRatio);
    }

    set_object_style(style) {
        if (!this.scale) {
            throw new Error('no reference viewBox is set');
        }

        if (style.objectFit) this.scale.set_object_fit(style.objectFit);
        if (style.objectPosition) this.scale.set_object_position(style.objectPosition);
    }

    set_path(path, pretransform) {
        this._ast = new PathParser().parse(path);

        if (pretransform) {
            const trans = new TransformParser().parse(pretransform);

            this._ast = this._transform_ast(trans);
        }

        return this.formatter.format(this._ast);
    }

    _transform_ast(trans) {
        if (!this._ast) {
            throw new Error('no path is set');
        }

        const transformer = new Transformer(trans);

        return transformer.transform(this._ast);
    }

    transform(str) {
        const trans = new TransformParser().parse(str);

        const ast = this._transform_ast(trans);

        return this.formatter.format(ast);
    }

    scale_with_aspect_ratio(width, height) {
        if (!this.scale) {
            throw new Error('no reference viewBox is set');
        }

        const trans = this.scale.transform_from_aspect_ratio(width, height);

        const ast = this._transform_ast(trans);

        return this.formatter.format(ast);
    }

    scale_with_object_fit(width, height) {
        if (!this.scale) {
            throw new Error('no reference viewBox is set');
        }

        const trans = this.scale.transform_from_object_fit(width, height);

        const ast = this._transform_ast(trans);

        return this.formatter.format(ast);
    }

    toString() {
        return this.formatter.format(this._ast || []);
    }
}

module.exports = Pathfit;
