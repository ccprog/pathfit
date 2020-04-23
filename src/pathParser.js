const Parser = require('./parser.js');

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
}

module.exports = PathParser;
