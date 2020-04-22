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

module.exports = ParseError;