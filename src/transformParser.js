import Parser from './parser.js';

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

export default class TransformParser extends Parser {
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
}