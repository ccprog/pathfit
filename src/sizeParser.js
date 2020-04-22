const ParseError = require('./parseError.js');

const regex = {
    number: /^(?:\d*\.\d+|\d+\.?)(?:[eE][\+\-]?\d+)*(.+)?/,
    par: /^(?:(none)|x(Min|Mid|Max)Y(Min|Mid|Max)\s+(meet|slice))$/
};

function length (len) {
    const unit = typeof len === 'number' ? null : len.match(regex.number)[1];

    const value = parseFloat(len);
    if (value <= 0 || (unit && unit !== 'px')) {
        throw new ParseError('invalid or unusable length', len);
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
            throw new ParseError('invalid viewBox', viewBox);
        }

    } else if (width && height) {
        port.x = 0;
        port.y = 0;
        port.width = length(width);
        port.height = length(height);

    } else {
        throw new ParseError('insufficiant data', null);
    }

    return port;
}

function aspect_ratio(preserveAspectRatio) {
    const word = regex.par.exec(preserveAspectRatio);
    if (!word) {
        throw new ParseError('invalid preserveAspectRatio', preserveAspectRatio);
    }

    par = { preserve: false }

    if (word[1] !== 'none') {
        par.preserve = true;
        par.x = word[2];
        par.y = word[3];
        par.slice = word[4] === 'slice';
    }

    return par;
}

module.exports = {
    length,
    viewport,
    aspect_ratio
}