describe('TransformParser', function() {
    const TransformParser = require('../src/transformParser.js');
    let parser;

    beforeEach(function() {
        parser = new TransformParser();
    });

    transform_data = [
        {
            str: 'matrix(1, 2, 3, 4.5, 5, 6)',
            ast: [{command: 'matrix', a: 1, b: 2, c: 3, d: 4.5, e: 5, f: 6}]
        },
        {
            str: 'matrix(1, 2, 3, 4, 5)',
            error: true
        },
        {
            str: 'matrix(1, 2, a, 4, 5, 6)',
            error: true
        },
        {
            str: 'translate(1, 2.7)',
            ast: [{command: 'translate', tx: 1, ty: 2.7}]
        },
        {
            str: 'translate(0, 2)',
            ast: [{command: 'translate', tx: 0, ty: 2}]
        },
        {
            str: 'translate(1, 0)',
            ast: [{command: 'translate', tx: 1, ty: 0}]
        },
        {
            str: 'translate(1)',
            ast: [{command: 'translate', tx: 1}]
        },
        {
            str: 'translate()',
            error: true
        },
        {
            str: 'translate(4px)',
            error: true
        },
        {
            str: 'scale(5, 2.7)',
            ast: [{command: 'scale', sx: 5, sy: 2.7}]
        },
        {
            str: 'scale(1, 2)',
            ast: [{command: 'scale', sx: 1, sy: 2}]
        },
        {
            str: 'scale(5, 1)',
            ast: [{command: 'scale', sx: 5, sy: 1}]
        },
        {
            str: 'scale(5)',
            ast: [{command: 'scale', sx: 5}]
        },
        {
            str: 'scale()',
            error: true
        },
        {
            str: 'scale(f)',
            error: true
        },
        {
            str: 'rotate(10, 1, 2.7)',
            ast: [{command: 'rotate', angle: 10, cx: 1, cy: 2.7}]
        },
        {
            str: 'rotate(15.44, 1, 2)',
            ast: [{command: 'rotate', angle: 15.44, cx: 1, cy: 2}]
        },
        {
            str: 'rotate(10)',
            ast: [{command: 'rotate', angle: 10}]
        },
        {
            str: 'rotate(10, 1)',
            error: true
        },
        {
            str: 'scale()',
            error: true
        },
        {
            str: 'scale(10deg)',
            error: true
        },
        {
            str: 'scale(10, 1px, 2px)',
            error: true
        },
        {
            str: 'skewX(10)',
            ast: [{command: 'skewX', angle: 10}]
        },
        {
            str: 'skewX()',
            error: true
        },
        {
            str: 'skewX(10deg)',
            error: true
        },
        {
            str: 'skewY(10)',
            ast: [{command: 'skewY', angle: 10}]
        },
        {
            str: 'skewY()',
            error: true
        },
        {
            str: 'skewY(10deg)',
            error: true
        },
        {
            str: 'bla(10)',
            error: true
        },
        {
            str: 'translate(1, 2) scale(4, 6)',
            ast: [{command: 'translate', tx: 1, ty: 2}, {command: 'scale', sx: 4, sy: 6}]
        },
        {
            str: ['translate(1, 2)', 'scale(4, 6)'],
            ast: [{command: 'translate', tx: 1, ty: 2}, {command: 'scale', sx: 4, sy: 6}]
        },
        {
            str: ['translate(1, 2)', 'scale(4, 6) rotate(20)'],
            ast: [{command: 'translate', tx: 1, ty: 2}, {command: 'scale', sx: 4, sy: 6}, {command: 'rotate', angle: 20}]
        },
    ];

    for (let item of transform_data) {
        it('evaluates ' + item.str, function() {
            const fn = () => {
                let result = parser.parse(item.str);
                expect(result).toEqual(item.ast);
            }
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
            }
        })
    }
});