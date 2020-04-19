const PathParser = require('./pathParser.js');
const TransformParser = require('./transformParser.js');
const Transformer = require('./transformer.js');
const Scale = require('./scale.js');
const Formatter = require('./formatter.js');

class Pathfit {
    constructor(attr, path, pretransform, opt) {
        if (attr) this.set_viewbox(attr);

        if (path) this.set_path(path, pretransform);

        this.formatter = new Formatter(Object.assign({ precision: 6 }, opt));
    }

    set_viewbox(attr) {
        const {width, height, viewBox, preserveAspectRatio} = attr;
        this.scale = new Scale(width, height, viewBox, preserveAspectRatio);
    }

    set_fit(preserveAspectRatio) {
        if (!this.scale) {
            throw new Error('no reference viewBox is set');
        }

        this.scale.set_preserveAspectRatio(preserveAspectRatio);
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

        const transformer$1 = new Transformer(trans);

        return transformer$1.transform(this._ast);
    }

    transform(str) {
        const trans = new TransformParser().parse(str);

        const ast = this._transform_ast(trans);

        return this.formatter.format(ast);
    }

    scale_to(width, height) {
        if (!this.scale) {
            throw new Error('no reference viewBox is set');
        }

        const trans = this.scale.transform(width, height);

        const ast = this._transform_ast(trans);

        return this.formatter.format(ast);
    }
}

module.exports = Pathfit;
