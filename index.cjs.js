'use strict';

class RawCommand {
    constructor(command, str) {
        this._str = str;
        this._pos = 0;

        this.string = command + str;
        this.offset = command.length;
    }

    get more() {
        return this._pos < this._str.length;
    }

    get position() {
        return this._pos;
    }

    get_token(token, assert) {
        const result = this._str.substr(this._pos).match(RawCommand.regex[token]);
        const sequence = (result || [""])[0];

        this._pos += sequence.length;

        return assert ? result !== null : sequence;
    }
}
RawCommand.regex = {
    wsp: /^[\x09\x20\x0D\x0A]*/,
    comma: /^\,/,
    brace_open: /^\(/,
    brace_close: /^\)/,
    flag: /^[01]/,
    number: /^[\+\-]?(\d*\.\d+|\d+\.?)([eE][\+\-]?\d+)*/,
    nonnegative: /^(\d*\.\d+|\d+\.?)([eE][\+\-]?\d+)*/
};

class ParseError extends Error {
    constructor(desc, string, position) {
        super();

        this.name = 'ParseError';
        this.message = desc + '\n';
        this.message += (string.string || string) + '\n';
        this.message += Array(position).fill('_').join('') + '^';
    }
}

class Parser {
    constructor() {
        this.current = [];
        this.source = '';
    }

    get_raw(command, str) {
        return new RawCommand(command, str);
    }

    throw_parse_error(desc, string, position) {
        throw new ParseError(desc, string, position);
    }

    commands(str) {
        const splited = str.split(this.command_names);
        const start = splited.shift();

        if (/[^\x09\x20\x0D\x0A]+/.test(start)) {
            this.throw_parse_error('expected nothing before command', start + splited[0], 0);
        }

        return splited;
    }

    coordinate(raw) {
        return {
            coordinate: this.number(raw)
        };
    }

    coordinate_pair_sequence(raw, len) {
        const argument = {};
        let idx = 1;

        while (idx < len) {
            argument['control_' + idx] = this.coordinate_pair(raw);
            this.comma_wsp(raw);
            idx++;
        }

        argument.coordinate_pair = this.coordinate_pair(raw);
    
        return argument;
    }

    elliptical_arc(raw) {
        const argument = {
            rx: this.number(raw, true)
        };
        this.comma_wsp(raw);

        argument.ry = this.number(raw, true);
        this.comma_wsp(raw);

        argument.rotation = this.number(raw);
        this.comma_wsp(raw);

        argument.large_arc = this.flag(raw);
        this.comma_wsp(raw);

        argument.sweep = this.flag(raw);
        this.comma_wsp(raw);

        argument.coordinate_pair = this.coordinate_pair(raw);

        return argument;
    }

    coordinate_pair(raw) {
        const argument = {
            x: this.number(raw)
        };
        this.comma_wsp(raw);

        argument.y = this.number(raw);

        return argument;
    }

    coordinate_triple(raw) {
        const argument = {
            x: this.number(raw)
        };
        this.comma_wsp(raw);

        argument.y = this.number(raw);
        this.comma_wsp(raw);

        argument.z = this.number(raw);

        return argument;
    }

    flag(raw) {
        const flag = raw.get_token('flag');
        if (!flag) {
            this.throw_parse_error('expected flag', raw);
        }

        return flag === '1';
    }

    number(raw, nonnegative) {
        const token = raw.get_token(nonnegative ? 'nonnegative' : 'number');
        const number = parseFloat(token);

        if (isNaN(number)) {
            this.throw_parse_error('expected number', raw);
        }

        return number;
    }

    comma_wsp(raw) {
        raw.get_token('wsp');
        const has_comma = raw.get_token('comma', true);
        raw.get_token('wsp');

        return has_comma;
    }

    test_end(raw) {
        raw.get_token('wsp');
        if (raw.more) {
            this.throw_parse_error('expected nothing after close', raw);
        }
    }

    parse(str) {
        this.current = [];
        this.source = str;

        return this.group(str);
    }
}

const path_commands = /([mzlhvcsqta])/i;
const movoto_command = /m/i;

class PathParser extends Parser {
    get command_names() {
        return path_commands;
    }

    collect_arguments(get, raw, len) {
        const array = [];
        let must_follow = true;

        while (must_follow || raw.more) {
            if (array.length) {
                must_follow = this.comma_wsp(raw);
            }

            if (must_follow || raw.more) {
                array.push(this[get](raw, len));
            }
        }

        return array;
    }

    group (str) {
        const splited = this.commands(str);

        if (splited.length && !splited[0].match(movoto_command)) {
            this.throw_parse_error('expected moveto at start', splited.slice(0, 2).join(''), 0);
        }

        while (splited.length > 1) {
            const letter = splited.shift();
            const command = {
                command: letter.toUpperCase()
            };

            if (command.command !== 'Z') {
                command.relative = letter !== letter.toUpperCase();
            }

            const raw = this.get_raw(letter, splited.shift());
            raw.get_token('wsp');

            switch (command.command) {
            case 'M':
            case 'L':
            case 'T':
                command.sequence = this.collect_arguments('coordinate_pair_sequence', raw, 1);
                break;

            case 'S':
            case 'Q':
                command.sequence = this.collect_arguments('coordinate_pair_sequence', raw, 2);
                break;

            case 'C':
                command.sequence = this.collect_arguments('coordinate_pair_sequence', raw, 3);
                break;

            case 'H':
            case 'V':
                command.sequence = this.collect_arguments('coordinate', raw);
                break;

            case 'A':
                command.sequence = this.collect_arguments('elliptical_arc', raw);
                break;

            case 'Z':
                this.test_end(raw);
                break;
            }
            this.current.push(command);
        }

        return this.current;
    }

    parse(str) {
        this.current = [];
        this.source = str;

        return this.group(str);
    }
}

const transform_commands = /(matrix|translate|scale|rotate|skewX|skewY)/i;

const group_structure = {
    "matrix":{
        args: ["a", "b", "c", "d", "e", "f"],
        required: 6
    },
    "translate": {
        args: ["tx", "ty"],
        required: 1
    },
    "scale": {
        args: ["sx", "sy"],
        required: 1
    },
    "rotate": {
        args: ["angle", "cx", "cy"],
        required: 1
    },
    "skewX": {
        args: ["angle"],
        required: 1
    },
    "skewY": {
        args: ["angle"],
        required: 1
    }
};

class TransformParser extends Parser {
    get command_names() {
        return transform_commands;
    }

    collect_arguments(raw, args, required) {
        raw.get_token("wsp");

        if (!raw.get_token("brace_open", true)) {
            this.throw_parse_error("expected opening brace", raw);
        }

        raw.get_token("wsp");

        const numbers = {};

        const test = args.some(id => {
            numbers[id] = this.number(raw);

            const must_follow = this.comma_wsp(raw);
            return raw.get_token("brace_close", true) && !must_follow;
        });

        if (!test) {
            this.throw_parse_error("expected closing brace", raw);
        }

        const len = Object.keys(numbers).length;
        if (len !== required && len !== args.length) {
            this.throw_parse_error("wrong number of arguments", raw);
        }

        this.test_end(raw);

        return numbers;
    }

    group(str) {
        const splited = this.commands(str, transform_commands);

        while (splited.length > 1) {
            const transform = splited.shift();
            const raw = this.get_raw(transform, splited.shift());

            const {args, required} = group_structure[transform];

            const command = this.collect_arguments(raw, args, required);

            command.command = transform;
            this.current.push(command);
        }

        return this.current;
    }

    parse(str) {
        if (Array.isArray(str)) {
            str = str.join(' ');
        }

        super.parse(str);
    }
}

class Transformer {
    constructor(trans) {
        this.normal_abs = [];
        this.normal_rel = [];

        this.transformation = [{
            command: "scale",
            sx: 1
        }];

        if (Array.isArray(trans) && trans.length > 0) {
            this.transformation = trans;
        }

        this.preprocess();
    }

    preprocess () {
        this.transformation.forEach(function (t) {
            const trans_abs = Object.assign({}, t);
            const trans_rel = Object.assign({}, t);

            switch (t.command) {
            case "matrix":
                trans_rel.e = trans_rel.f = 0;
                break;

            case "translate":
                trans_rel.tx = trans_rel.ty = 0;
                trans_abs.ty = t.ty || 0;
                break;

            case "scale":
                trans_abs.sy = trans_rel.sy = t.sy != null ? t.sy : t.sx;
                break;

            case "rotate":
                trans_rel.cx = trans_rel.cy = 0;
                trans_abs.cx = t.cx || 0;
                trans_abs.cy = t.cy || 0;
                break;
            }

            this.normal_abs.push(trans_abs);
            this.normal_rel.push(trans_rel);
        }, this);
    }

    static coordinate_pair(group, pair) {
        const c = Object.assign({x: 0, y: 0}, pair);

        group.forEach(trans => {
            switch (trans.command) {
            case "matrix":
                c.x = trans.a * c.x + trans.c * c.y + trans.e;
                c.y = trans.b * c.x + trans.d * c.y + trans.f;
                break;

            case "translate":
                c.x += trans.tx;
                c.y += trans.ty;
                break;

            case "scale":
                c.x *= trans.sx;
                c.y *= trans.sy;
                break;

            case "rotate":
                c.x -= trans.cx;
                c.y -= trans.cy;

                const d = Math.sqrt(c.x*c.x + c.y*c.y);
                const a = Math.atan2(c.y, c.x) * 180 / Math.PI + trans.angle;

                c.x = d * Math.cos(a * Math.PI/180);
                c.y = d * Math.sin(a * Math.PI/180);

                c.x += trans.cx;
                c.y += trans.cy;
                break;

            case "skewX":
                c.x += Math.tan(trans.angle/180*Math.PI) * c.y;
                break;

            case "skewY":
                c.y += Math.tan(trans.angle/180*Math.PI) * c.x;
                break;
            }
        });

        return c;
    }

    static arc_matrix(transform, args) {
        const co = Math.cos(args.rotation/180*Math.PI);
        const si = Math.sin(args.rotation/180*Math.PI);

        const m = [
            args.rx * (transform.a * co + transform.c * si),
            args.rx * (transform.b * co + transform.d * si),
            args.ry * (transform.c * co - transform.a * si),
            args.ry * (transform.d * co - transform.b * si),
        ];

        const A = (m[0] * m[0]) + (m[2] * m[2]);
        const B = 2 * (m[0] * m[1] + m[2] * m[3]);
        const C = (m[1] * m[1]) + (m[3] * m[3]);
        const K = Math.sqrt((A - C) * (A - C) + B * B);

        return {
            rx:  Math.sqrt(0.5 * (A + C + K)),
            ry:  Math.sqrt(0.5 * Math.max(0, A + C - K)),
            rotation: Math.abs((A - C) / B) < 1e-6 ? 90 : Math.atan2(B, A - C) * 90 / Math.PI
        };
    }

    static elliptical_arc(group, args) {
        group.concat([]).reverse().forEach(transform => {
            let params;

            switch (transform.command) {
            case "scale":
                params = Transformer.coordinate_pair(transform, { x: args.rx, y: args.ry });

                args.rx = Math.abs(params.x);
                args.ry = Math.abs(params.y);

                if (transform.sx * transform.sy < 0) {
                    args.sweep = !args.sweep;
                }
                break;

            case "rotate":
                args.rotation = (args.rotation + transform.angle) % 180; // !%  für negative?
                break;

            case "skewX":
            case "skewY":
                transform = {
                    command: "matrix",
                    a: 1,
                    b: transform.command === "skewY" ? Math.tan(transform.angle / 180 * Math.PI) : 0,
                    c: transform.command === "skewX" ? Math.tan(transform.angle / 180 * Math.PI) : 0,
                    d: 1,
                    e: 0,
                    f: 0
                };
                /* falls through */
            case "matrix":
                params = Transformer.arc_matrix(transform, args);

                args.rx = params.rx;
                args.ry = params.ry;
                args.rotation = params.rotation;

                if ((transform.a * transform.d) - (transform.b * transform.c) < 0) {
                    args.sweep = !args.sweep;
                }
                break;
            }
        });

        args.coordinate_pair = Transformer.coordinate_pair(group, args.coordinate_pair);

        return args;
    }

    nest_transforms(struct, a, relative) {
        const args = Object.assign({}, a);

        const func = struct === "arc" ? Transformer.elliptical_arc : Transformer.coordinate_pair;
        const transformation = relative ? this.normal_rel : this.normal_abs;

        return func(transformation, args);
    }

    argument_obj(command, relative, args) {
        let trans_args = {};

        switch (command) {
        case "A":
            trans_args = this.nest_transforms("arc", args, relative);
            break;

        case "C":
            trans_args.control_2 = this.nest_transforms("pair", args.control_2, relative);
            /* falls through */
        case "S":
        case "Q":
            trans_args.control_1 = this.nest_transforms("pair", args.control_1, relative);
            /* falls through */
        default:
            trans_args.coordinate_pair = this.nest_transforms("pair", args.coordinate_pair, relative);
            break;
        }

        return trans_args;
    }

    transform(path) {
        return path.map((command, idx_c) => {
            let trans_command = command.command;

            if (trans_command === "Z") {
                return { command: trans_command };
            }

            let is_horizontal = true, is_vertical = true;

            let trans_sequence = command.sequence.map((args, idx_s) => {
                let args_command = trans_command, relative = command.relative;

                switch (trans_command) {
                case "H":
                    args = {
                        coordinate_pair: { x: args.coordinate, y: 0 }
                    };
                    args_command = "L";
                    break;

                case "V":
                    args = {
                        coordinate_pair: { x: 0, y: args.coordinate }
                    };
                    args_command = "L";
                    break;

                case "M":
                    if (idx_c === 0 && idx_s === 0) {
                        relative = false;
                    }
                    break;
                }

                const trans_args = this.argument_obj(args_command, relative, args);

                is_horizontal = is_horizontal && trans_args.coordinate_pair.y === 0;
                is_vertical = is_vertical && trans_args.coordinate_pair.x === 0;

                return trans_args;
            }, this);

            if (trans_command === "L") {
                if (is_horizontal) {
                    trans_command = "H";

                    trans_sequence = trans_sequence.map(args => {
                        return { coordinate: args.coordinate_pair.x };
                    });
                } else if (is_vertical) {
                    trans_command = "V";

                    trans_sequence = trans_sequence.map(args => {
                        return { coordinate: args.coordinate_pair.y };
                    });
                }
            }

            return {
                command: trans_command,
                relative: command.relative,
                sequence: trans_sequence
            };
        }, this);
    }
}

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
        if (value === 0 || (unit && unit !== 'px')) throw Scale.error;

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

            if (this.width === 0 || this.height === 0) throw Scale.error;
        } else if (width && height) {
            this.x = 0;
            this.y = 0;
            this.width = Scale.parse_length(width);
            this.height = Scale.parse_length(height);
        } else {
            throw Scale.error;
        }
    }

    set_preserveAspectRatio(preserveAspectRatio = '') {
        [
            this.align = 'xMidYMid',
            this.meetOrSlice = 'meet'
        ] = preserveAspectRatio.split(/\s/);
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

        let tx = -this.x * sx,
            ty = -this.y * sy;
    
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

class Formatter {
    constructor(opt) {
        this.options = Object.assign({
            precision: 6
        }, opt);
    }

    flag(f) {
        return f ? 1 : 0;
    }

    number(float) {
        if (-Math.log(Math.abs(float)) / Math.LN10 > this.options.precision + 3) {
            return 0;
        } else {
            return +float.toPrecision(this.options.precision);
        }
    }

    pair(args, first, second) {
        return this.number(args[first]) + Formatter.pair_wsp + this.number(args[second]);
    }

    argument(command, a) {
        const parts = [];

        switch (command) {
        case 'C':
            parts.unshift(this.pair(a.control_2, 'x', 'y'));
            /* falls through */
        case 'S':
        case 'Q':
            parts.unshift(this.pair(a.control_1, 'x', 'y'));
            /* falls through */
        case 'M':
        case 'L':
        case 'T':
            parts.push(this.pair(a.coordinate_pair, 'x', 'y'));
            break;

        case 'H':
        case 'V':
            parts.push(this.number(a.coordinate));
            break;

        case 'A':
            parts.push(
                this.pair(a, 'rx', 'ry'),
                this.number(a.rotation),
                this.flag(a.large_arc),
                this.flag(a.sweep),
                this.pair(a.coordinate_pair, 'x', 'y')
            );
            break;
        }

        return parts.join(Formatter.arg_wsp);
    }

    command(result, current) {
        result += result ? Formatter.wsp : '';

        if (current.command === 'Z') {
            result += 'z';
        } else {
            result += (current.relative ? current.command.toLowerCase() : current.command) + Formatter.wsp;
            result += current.sequence.map(this.argument.bind(this, current.command)).join(Formatter.arg_wsp);
        }

        return result;
    }

    format(path) {
        return path.reduce(this.command.bind(this), '');
    }
}
Formatter.wsp = '';
Formatter.pair_wsp = ' ';
Formatter.arg_wsp = ' ';

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
        const transformer = new Transformer(trans);

        return transformer.transform(this._ast);
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
