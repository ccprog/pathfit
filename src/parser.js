const RawCommand = require('./rawCommand.js');

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

module.exports = Parser;
