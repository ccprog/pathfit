var Pathfit = (function () {
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

    var rawCommand = RawCommand;

    class ParseError extends Error {
        constructor(desc, string, position) {
            super();

            this.name = 'ParseError';
            this.message = desc + '\n';
            this.message += (string.string || string);
            if (position) {
                this.message += '\n' + Array(position).fill('_').join('') + '^';
            }
        }
    }

    var parseError = ParseError;

    class Parser {
        constructor() {
            this.current = [];
            this.source = '';
        }

        get_raw(command, str) {
            return new rawCommand(command, str);
        }

        throw_parse_error(desc, string, position) {
            throw new parseError(desc, string, position);
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

    var parser = Parser;

    const path_commands = /([mzlhvcsqta])/i;
    const movoto_command = /m/i;

    class PathParser extends parser {
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

    var pathParser = PathParser;

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

    class TransformParser extends parser {
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

    var transformParser = TransformParser;

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
                const trans_abs = {...t};
                const trans_rel = {...t};

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

        static round(n) {
            return Math.abs(Math.round(n) - n) < 1e-10 ? Math.round(n) + 0 : n;
        }

        static coordinate_pair(group, pair) {
            const c = Object.assign({x: 0, y: 0}, pair);

            group.concat([]).reverse().forEach(trans => {
                switch (trans.command) {
                case "matrix":
                    const cx = c.x, cy = c.y;
                    c.x = trans.a * cx + trans.c * cy + trans.e;
                    c.y = trans.b * cx + trans.d * cy + trans.f;
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

            c.x = Transformer.round(c.x);
            c.y = Transformer.round(c.y);
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
                rx:  Transformer.round(Math.sqrt(0.5 * (A + C + K))),
                ry:  Transformer.round(Math.sqrt(0.5 * Math.max(0, A + C - K))),
                rotation: Transformer.round(Math.atan2(B, A - C) * 90 / Math.PI)
            };
        }

        static elliptical_arc(group, args) {
            group.concat([]).reverse().forEach(transform => {
                let arc_trans;

                switch (transform.command) {
                case "translate":
                    arc_trans = [
                        {command: 'rotate', angle: args.rotation, cx: 0, cy: 0}
                    ];
                    break;

                case "rotate":
                    arc_trans = [
                        {command: 'rotate', angle: transform.angle + args.rotation, cx: 0, cy: 0}
                    ];
                    break;

                case "matrix":
                    arc_trans = [
                        {...transform, e: 0, f: 0},
                        {command: 'rotate', angle: args.rotation, cx: 0, cy: 0}
                    ];
                    break;

                default:
                    arc_trans = [
                        transform,
                        {command: 'rotate', angle: args.rotation, cx: 0, cy: 0}
                    ];
                    break;
                }

                const t1 = Transformer.coordinate_pair(arc_trans, {x: args.rx, y: 0});
                const t2 = Transformer.coordinate_pair(arc_trans, {x: 0, y: args.ry});
        
                const matrix = {
                    command: "matrix",
                    a: t1.x / args.rx,
                    b: t1.y / args.rx,
                    c: t2.x / args.ry,
                    d: t2.y / args.ry,
                    e: 0,
                    f: 0
                };
        
                args.rotation = 0;
                ({
                    rx: args.rx, 
                    ry: args.ry, 
                    rotation: args.rotation
                } = Transformer.arc_matrix(matrix, {...args}));
        
                if ((matrix.a * matrix.d) - (matrix.b * matrix.c) < 0) {
                    args.sweep = !args.sweep;
                }
            });

            args.coordinate_pair = Transformer.coordinate_pair(group, args.coordinate_pair);

            return args;
        }

        nest_transforms(struct, a, relative) {
            const args = {...a};

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
            let last_x, last_y;

            return path.map((command, idx_c) => {
                let trans_command = command.command;

                if (trans_command === "Z") {
                    return { command: trans_command };
                }

                let trans_sequence = command.sequence.map((args, idx_s) => {
                    let args_command = trans_command, relative = command.relative;

                    switch (trans_command) {
                    case "H":
                        args = {
                            coordinate_pair: { x: args.coordinate, y: relative ? 0 : last_y }
                        };
                        args_command = "L";
                        break;

                    case "V":
                        args = {
                            coordinate_pair: { x: relative ? 0 : last_x, y: args.coordinate }
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

                    if (relative) {
                        last_x += args.coordinate_pair.x;
                        last_y += args.coordinate_pair.y;
                    } else {
                        last_x = args.coordinate_pair.x;
                        last_y = args.coordinate_pair.y;
                    }

                    return trans_args;
                }, this);

                if (trans_command === 'H' || trans_command === 'V') {
                    trans_command = 'L';
                }

                return {
                    command: trans_command,
                    relative: command.relative,
                    sequence: trans_sequence
                };
            }, this);
        }
    }

    var transformer = Transformer;

    const regex = {
        number: /^(?:\d*\.\d+|\d+\.?)(?:[eE][\+\-]?\d+)*(.+)?/,
        par: /^(?:(none)|x(Min|Mid|Max)Y(Min|Mid|Max)\s+(meet|slice))$/,
        fit:  /^(fill|contain|cover|none|scale-down)$/,
        position: /^(?:(left|center|right|top|bottom)|((?:[\+\-]?\d*\.\d+|\d+\.?)(?:[eE][\+\-]?\d+)*)(px|%))$/
    };

    function position_keyword (key) {
        const position = {
            relative: true,
            value: 0,
            reverse: false
        };
        let type;

        switch (key) {
        case 'center':
            type = 0b100000;
            position.value = 50;
            break;

        case 'left':
            type = 0b010000;
            break;

        case 'right':
            type = 0b001000;
            position.reverse = true;
            break;

        case 'top':
            type = 0b000100;
            break;

        case 'bottom':
            type = 0b000010;
            position.reverse = true;
            break;
        }

        return {type, position};
    }

    function length (len) {
        const unit = typeof len === 'number' ? null : len.match(regex.number)[1];

        const value = parseFloat(len);
        if (value <= 0 || (unit && unit !== 'px')) {
            throw new parseError('invalid or unusable length', len);
        }

        return value;
    }

    function viewport(width, height, viewBox) {
        const port = {};

        if (viewBox) {
            [
                port.x, 
                port.y, 
                port.width, 
                port.height
            ] = viewBox.split(/[,\s]+/).map(str => parseFloat(str));

            if (port.width <= 0 || port.height <= 0) {
                throw new parseError('invalid viewBox', viewBox);
            }

        } else if (width && height) {
            port.x = 0;
            port.y = 0;
            port.width = length(width);
            port.height = length(height);

        } else {
            throw new parseError('insufficiant data', null);
        }

        return port;
    }

    function aspect_ratio(preserveAspectRatio) {
        const word = regex.par.exec(preserveAspectRatio);
        if (!word) {
            throw new parseError('invalid preserveAspectRatio', preserveAspectRatio);
        }

        par = { preserve: false };

        if (word[1] !== 'none') {
            par.preserve = true;
            par.x = word[2];
            par.y = word[3];
            par.slice = word[4] === 'slice';
        }

        return par;
    }

    function object_fit(fit) {
        const word = regex.fit.exec(fit);
        if (!word) {
            throw new parseError('invalid object-fit', fit);
        }

        return word[1];
    }

    function object_position(position) {
        const p = position.split(/\s+/).map(size =>  {
            const word = regex.position.exec(size);
            if (!word) {
                throw new parseError('invalid object-position', position);
            }

            if (word[1]) {
                return position_keyword(word[1]);

            } else {
                return {
                    type:0b000001, 
                    position: {
                        value: parseFloat(word[2]),
                        relative: word[3] === '%',
                        reverse: false
                    }
                };
            }
        });

        if (!p.length || p.length > 4) {
            throw new parseError('wrong number of object-position arguments', position);
        }

        const object = {
            x: { value: 50, relative: true, reverse: false },
            y: { value: 50, relative: true, reverse: false}
        };

        switch (p.length) {
        case 1:
            if (p[0].type & 0b000110) {
                object.y = p[0].position;

            } else {
                object.x = p[0].position;
            }
            break;

        case 2:
            if (p[0].type & 0b111000 && p[1].type & 0b100111 ||
                    (p[0].type & 0b000001 && p[1].type & 0b000001)) {
                object.x = p[0].position;
                object.y = p[1].position;

            } else if (p[0].type & 0b100110 && p[1].type & 0b111001 &&
                    ( p[0].type & 0b000110 || p[1].type & 0b011000)) {
                object.x = p[1].position;
                object.y = p[0].position;

            } else {
                throw new parseError('invalid object-position', position);
            }
            break;

        case 3:
            if (p[0].type & 0b011000 && p[1].type & 0b000001 && p[2].type & 0b100110) {
                object.x = {...p[1].position, reverse: p[0].position.reverse};
                object.y = p[2].position;

            } else if (p[0].type & 0b111000 && p[1].type & 0b000110 && p[2].type & 0b000001) {
                object.x = p[0].position;
                object.y = {...p[2].position, reverse: p[1].position.reverse};

            } else if (p[0].type & 0b100110 && p[1].type & 0b011000 && p[2].type & 0b000001) {
                object.x = {...p[2].position, reverse: p[1].position.reverse};
                object.y = p[0].position;

            } else if (p[0].type & 0b000110 && p[1].type & 0b000001 && p[2].type & 0b111000) {
                object.x = p[2].position;
                object.y = {...p[1].position, reverse: p[0].position.reverse};

            } else {
                throw new parseError('invalid object-position', position);
            }
            break;

            case 4:
            if (p[0].type & 0b011000 && p[1].type & 0b000001 &&
                    p[2].type & 0b000110 && p[3].type & 0b000001) {
                object.x = {...p[1].position, reverse: p[0].position.reverse};
                object.y = {...p[3].position, reverse: p[2].position.reverse};

            } else if (p[0].type & 0b000110 && p[1].type & 0b000001 &&
                    p[2].type & 0b011000 && p[3].type & 0b000001) {
                object.x = {...p[3].position, reverse: p[2].position.reverse};
                object.y = {...p[1].position, reverse: p[0].position.reverse};

            } else {
                throw new parseError('invalid object-position', position);
            }
            break;
        }

        return object;
    }

    var sizeParser = {
        length,
        viewport,
        aspect_ratio,
        object_fit,
         object_position
    };

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

    var scale = Scale;

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

    var formatter = Formatter;

    class Pathfit {
        constructor(base, style, path, pretransform, opt) {
            if (base) this.set_viewbox(base);

            if (style) this.set_object_style(base);

            if (path) this.set_path(path, pretransform);

            this.formatter = new formatter(Object.assign({ precision: 6 }, opt));
        }

        set_viewbox(base) {
            const {width, height, viewBox, preserveAspectRatio} = base;
            this.scale = new scale(width, height, viewBox, preserveAspectRatio);
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
            this._ast = new pathParser().parse(path);

            if (pretransform) {
                const trans = new transformParser().parse(pretransform);

                this._ast = this._transform_ast(trans);
            }

            return this.formatter.format(this._ast);
        }

        _transform_ast(trans) {
            if (!this._ast) {
                throw new Error('no path is set');
            }

            const transformer$1 = new transformer(trans);

            return transformer$1.transform(this._ast);
        }

        transform(str) {
            const trans = new transformParser().parse(str);

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
    }

    var main = Pathfit;

    return main;

}());
