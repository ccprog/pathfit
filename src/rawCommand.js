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
        const sequence = (result || [''])[0];

        this._pos += sequence.length;

        return assert ? result !== null : sequence;
    }
}
RawCommand.regex = {
    wsp: /^[\x09\x20\x0D\x0A]*/,
    comma: /^,/,
    brace_open: /^\(/,
    brace_close: /^\)/,
    flag: /^[01]/,
    number: /^[+-]?(\d*\.\d+|\d+\.?)([eE][+-]?\d+)*/,
    nonnegative: /^(\d*\.\d+|\d+\.?)([eE][+-]?\d+)*/
};

module.exports = RawCommand;
