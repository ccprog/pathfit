const ParseError = require('./parseError.js');

const regex = {
    number: /^(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)*(.+)?/,
    par: /^(?:(none)|x(Min|Mid|Max)Y(Min|Mid|Max)\s+(meet|slice))$/,
    fit:  /^(fill|contain|cover|none|scale-down)$/,
    position: /^(?:(left|center|right|top|bottom)|((?:[+-]?\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)*)(px|%))$/
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

    const par = { preserve: false };

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
        throw new ParseError('invalid object-fit', fit);
    }

    return word[1];
}

function object_position(position) {
    const p = position.split(/\s+/).map(size =>  {
        const word = regex.position.exec(size);
        if (!word) {
            throw new ParseError('invalid object-position', position);
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
        throw new ParseError('wrong number of object-position arguments', position);
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
            throw new ParseError('invalid object-position', position);
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
            throw new ParseError('invalid object-position', position);
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
            throw new ParseError('invalid object-position', position);
        }
        break;
    }

    return object;
}

module.exports = {
    length,
    viewport,
    aspect_ratio,
    object_fit,
    object_position
};