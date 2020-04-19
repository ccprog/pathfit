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

module.exports = Formatter;
