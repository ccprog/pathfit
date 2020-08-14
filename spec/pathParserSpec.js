describe('PathParser', function() {
    const PathParser = require('../src/pathParser.js');
    let parser;

    beforeEach(function() {
        parser = new PathParser();
    });

    const transform_data = [        
        {
            str: '',
            ast: []
        },
        { 
            str: 'M0\r 0\n\tl2-3\nz',
            ast: [ { command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: 0 } } ] }, { command: 'L', relative: true, sequence: [ { coordinate_pair: { x: 2, y: -3 } } ] }, { command: 'Z' } ]
        },
        { 
            str: 'M0, 0,1 0',
            ast: [ { command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: 0 } }, { coordinate_pair: { x: 1, y: 0 } } ] } ]
        },
        {
            str: 'M 0.0 0.0',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: 0 } } ] } ]
        },
        {
            str: 'M 1e2 0',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 100, y: 0 } } ] } ]
        },
        {
            str: 'M 1e+2 0',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 100, y: 0 } } ] } ]
        },
        {
            str: 'M +1e+2 0',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 100, y: 0 } } ] } ]
        },
        {
            str: 'M 1e-2 0',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0.01, y: 0 } } ] } ]
        },
        {
            str: 'M 0.1e-2 0',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0.001, y: 0 } } ] } ]
        },
        {
            str: 'M .1e-2 0',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0.001, y: 0 } } ] } ]
        },
        {
            str: 'm 0 0',
            ast: [{ command: 'M', relative: true, sequence: [ { coordinate_pair: { x: 0, y: 0 } } ] } ]
        },
        {
            str: 'M+0-1',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: -1 } } ] } ]
        },
        {
            str: 'M 0.1.2',
            ast: [{ command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0.1, y: 0.2 } } ] } ]
        },
        {
            str: 'M 0-1+.2.3',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: -1 } }, 
                    { coordinate_pair: { x: 0.2, y: 0.3 } } 
                ] }
            ]
        },
        {
            str: 'M 0 0 1 1 L 2 2',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } }, 
                    { coordinate_pair: { x: 1, y: 1 } } 
                ] },
                { command: 'L', relative: false, sequence: [ 
                    { coordinate_pair: { x: 2, y: 2 } } 
                ] }
            ]
        },
        {
            str: 'M 0 0 L 1 1 2 2',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'L', relative: false, sequence: [
                    { coordinate_pair: { x: 1, y: 1 } },
                    { coordinate_pair: { x: 2, y: 2 } } 
                ] }
            ]
        },
        {
            str: 'M 0 0 L 1 1 L 2 2',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'L', relative: false, sequence: [
                    { coordinate_pair: { x: 1, y: 1 } }
                ] },
                { command: 'L', relative: false, sequence: [
                    { coordinate_pair: { x: 2, y: 2 } } 
                ] },
            ]
        },
        {
            str: 'M 0 0 H 3',
            ast: [
                { command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: 0 } } ] },
                { command: 'H', relative: false, sequence: [ { coordinate: 3 } ] }
            ]
        },
        {
            str: 'M 0 0 h 3 4',
            ast: [
                { command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: 0 } } ] },
                { command: 'H', relative: true, sequence: [ { coordinate: 3 }, { coordinate: 4 } ] }
            ]
        },
        {
            str: 'M 0 0 V 3',
            ast: [
                { command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: 0 } } ] },
                { command: 'V', relative: false, sequence: [ { coordinate: 3 } ] }
            ]
        },
        {
            str: 'M 0 0 v 3 4',
            ast: [
                { command: 'M', relative: false, sequence: [ { coordinate_pair: { x: 0, y: 0 } } ] },
                { command: 'V', relative: true, sequence: [ { coordinate: 3 }, { coordinate: 4 } ] }
            ]
        },
        {
            str: 'M 0 0 T 1 1',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'T', relative: false, sequence: [
                    { coordinate_pair: { x: 1, y: 1 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 t 1 1 2 2',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'T', relative: true, sequence: [
                    { coordinate_pair: { x: 1, y: 1 } },
                    { coordinate_pair: { x: 2, y: 2 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 Q 1 1 2 2',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'Q', relative: false, sequence: [
                    { control_1: { x: 1, y: 1 }, coordinate_pair: { x: 2, y: 2 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 q 1 1 2 2 3 3 4 4',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'Q', relative: true, sequence: [
                    { control_1: { x: 1, y: 1 }, coordinate_pair: { x: 2, y: 2 } },
                    { control_1: { x: 3, y: 3 }, coordinate_pair: { x: 4, y: 4 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 S 1 1 2 2',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'S', relative: false, sequence: [
                    { control_1: { x: 1, y: 1 }, coordinate_pair: { x: 2, y: 2 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 s 1 1 2 2 3 3 4 4',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'S', relative: true, sequence: [
                    { control_1: { x: 1, y: 1 }, coordinate_pair: { x: 2, y: 2 } },
                    { control_1: { x: 3, y: 3 }, coordinate_pair: { x: 4, y: 4 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 C 1 1 2 2 3 3',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'C', relative: false, sequence: [
                    { control_1: { x: 1, y: 1 }, control_2: { x: 2, y: 2 }, coordinate_pair: { x: 3, y: 3 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 c 1 1 2 2 3 3 4 4 5 5 6 6',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'C', relative: true, sequence: [
                    { control_1: { x: 1, y: 1 }, control_2: { x: 2, y: 2 }, coordinate_pair: { x: 3, y: 3 } },
                    { control_1: { x: 4, y: 4 }, control_2: { x: 5, y: 5 }, coordinate_pair: { x: 6, y: 6 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 A 10 15 20 0 1 2 3',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'A', relative: false, sequence: [
                    { rx: 10, ry: 15, rotation: 20, large_arc: false, sweep: true, coordinate_pair: { x: 2, y: 3 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 A 10 15 20 012-3',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'A', relative: false, sequence: [
                    { rx: 10, ry: 15, rotation: 20, large_arc: false, sweep: true, coordinate_pair: { x: 2, y: -3 } }
                ] }
            ]
        },
        {
            str: 'M 0 0 a 10 15 20 1 0 2 3 5 10 45 1 0 4 5',
            ast: [
                { command: 'M', relative: false, sequence: [ 
                    { coordinate_pair: { x: 0, y: 0 } } 
                ] },
                { command: 'A', relative: true, sequence: [
                    { rx: 10, ry: 15, rotation: 20, large_arc: true, sweep: false, coordinate_pair: { x: 2, y: 3 } },
                    { rx: 5, ry: 10, rotation: 45, large_arc: true, sweep: false, coordinate_pair: { x: 4, y: 5 } }
                ] }
            ]
        },
        { str: '0', error: true },
        { str: 'U', error: true },
        { str: 'M0 0G 1', error: true },
        { str: 'z', error: true },
        { str: 'M+', error: true },
        { str: 'M00', error: true },
        { str: 'M0e', error: true },
        { str: 'M0', error: true },
        { str: 'M0,0,', error: true },
        { str: 'M0 .e3', error: true },
        { str: 'M0 0a2 2 2 2 2 2 2', error: true },
        { str: 'M0 0 A-10 15 20 0 1 2 3', error: true }
    ];

    for (let item of transform_data) {
        it('evaluates ' + item.str, function() {
            const fn = () => {
                let result = parser.parse(item.str);
                expect(result).toEqual(item.ast);
            };
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
            }
        });
    }
});
