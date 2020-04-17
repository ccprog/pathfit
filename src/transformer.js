export default class Transformer {
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