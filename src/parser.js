import RawCommand from './rawCommand.js';

class ParseError extends Error {
    constructor(desc, string, position) {
        super();

        this.name = 'ParseError';
        this.message = desc + '\n';
        this.message += (string.string || string) + '\n';
        this.message += Array(position).fill('_').join('') + '^';
    }
}

export default class Parser {
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
        const splited = str.split(Parser.command_names);
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

        if (splited.length && !splited[0].match(Parser.movoto_command)) {
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
Parser.command_names = /([mzlhvcsqta])/i;
Parser.movoto_command = /m/i;