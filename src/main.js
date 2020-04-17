import Parser from './parser.js';
import Transformer from './transformer.js';
import Scale from './scale.js';
import Formatter from'./formatter.js';

export default class Pathfit {
    constructor(attr, path, opt) {
        const {width, height, viewBox, preserveAspectRatio} = attr;
        this.scale = new Scale(width, height, viewBox, preserveAspectRatio);

        if (path) {
            this.path = path;
        }

        this.formatter = new Formatter(Object.assign({ precision: 6 }, opt));
    }

    set_fit(preserveAspectRatio) {
        this.scale.set_preserveAspectRatio(preserveAspectRatio);
    }

    set_path(path) {
        this._ast = new Parser().parse(path);
    }

    scale_to(width, height) {
        const trans = this.scale.transform(width, height);

        const transformer = new Transformer(trans);

        const new_ast = transformer.transform(this._ast);

        return this.formatter.format(new_ast);
    }
}