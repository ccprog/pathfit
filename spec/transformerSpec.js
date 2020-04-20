function imprecise(a, b) {
    return Math.round(a * 1000) === Math.round(b * 1000);
}

function quartered(a, b) {
    const quarter = imprecise((a - b) % 90, 0) || imprecise((a - b - 180) % 90, 0);
    const switched = quarter && !(imprecise((a - b) % 180, 0) || imprecise((a - b - 360) % 180, 0));

    return [quarter, switched];
}

function almost(number) {
    return {
        asymmetricMatch: function(compareTo) {
            return imprecise(compareTo, number);
        },

        jasmineToString: function() {
            return '<almost: ' + number + '>';
        }
    };
}

function equivArc(command) {
    return {
        asymmetricMatch: function(compareTo) {
            if (command.coordinate_pair.x !== compareTo.coordinate_pair.x ||
                command.large_arc !== compareTo.large_arc ||
                command.sweep !== compareTo.sweep ||
                command.coordinate_pair.y !== compareTo.coordinate_pair.y) return false;

            const [quarter, switched] = quartered(command.rotation, compareTo.rotation);
            if (!quarter) return false;

            return switched ? imprecise(command.rx, compareTo.ry) && imprecise(command.ry, compareTo.rx) :
                imprecise(command.rx, compareTo.rx) && imprecise(command.ry, compareTo.ry);
        },
  
        jasmineToString: function() {
          return '<equivArc: ' + JSON.stringify(command) + '>';
        }
    };
}

describe('PathParser', function() {
    const PathParser = require('../src/pathParser.js');
    const parser = new PathParser();
    const Transformer = require('../src/transformer.js');

    transform_data = [
        {
            cmd: [{ command: 'translate', tx: 10, ty: -20 }],
            path: [
                {
                    str: 'M 100 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [
                            {coordinate_pair: {x: 110, y: -20}},
                            {coordinate_pair: {x: 10, y: 80}}
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 m 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'M', relative: true, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 L 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 10, y: 80}}]}
                    ]
                },
                {
                    str: 'M 100 0 l 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 V 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 110, y: 80}}]}
                    ]
                },
                {
                    str: 'M 100 0 v 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 50 H -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: 30}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: -90, y: 30}}]}
                    ]
                },
                {
                    str: 'M 100 50 h -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: 30}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: -100, y: 0}}]}
                    ]
                },
                {
                    str: 'M 100,0 Q 60,10 50,50 40,100 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'Q', relative: false, sequence: [
                            { control_1: {x: 70, y: -10}, coordinate_pair: {x: 60, y: 30} },
                            { control_1: {x: 50, y: 80}, coordinate_pair: {x: 10, y: 80} }
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 C 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'C', relative: false, sequence: [{
                            control_1: {x: 80, y: -10}, control_2: {x: 40, y: 60}, coordinate_pair: {x: 10, y: 80}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 c 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'C', relative: true, sequence: [{
                            control_1: {x: 70, y: 10}, control_2: {x: 30, y: 80}, coordinate_pair: {x: 0, y: 100}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 A 100 80 30 0 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'A', relative: false, sequence: [equivArc({
                            rx: 100, ry: 80, rotation: 30, large_arc: false, sweep: false, coordinate_pair: {x: 10, y: 80}
                        })]}
                    ]
                },
                {
                    str: 'M 100 0 a 100 80 30 1 1 -100 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'A', relative: true, sequence: [equivArc({
                            rx: 100, ry: 80, rotation: 30, large_arc: true, sweep: true, coordinate_pair: {x: -100, y: 100}
                        })]}
                    ]
                },
                {
                    str: 'M 100,0 A 50,40 30 0 1 50,50 100,40 45 1 0 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 110, y: -20}}]},
                        { command: 'A', relative: false, sequence: [
                            equivArc( { rx: 50, ry: 40, rotation:30, large_arc: false, sweep: true, coordinate_pair: {x: 60, y: 30} }),
                            equivArc({ rx:100, ry: 40, rotation: 45, large_arc: true, sweep: false, coordinate_pair: {x: 10, y: 80} })
                        ]}
                    ]
                },
            ]
        },

        {
            cmd: [{ command: 'scale', sx: 2, sy: 3 }],
            path: [
                {
                    str: 'M 100 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [
                            {coordinate_pair: {x: 200, y: 0}},
                            {coordinate_pair: {x: 0, y: 300}}
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 m 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'M', relative: true, sequence: [{coordinate_pair: {x: 0, y: 300}}]}
                    ]
                },
                {
                    str: 'M 100 0 L 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 0, y: 300}}]}
                    ]
                },
                {
                    str: 'M 100 0 l 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 0, y: 300}}]}
                    ]
                },
                {
                    str: 'M 100 0 V 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 200, y: 300}}]}
                    ]
                },
                {
                    str: 'M 100 0 v 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 0, y: 300}}]}
                    ]
                },
                {
                    str: 'M 100 50 H -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 150}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: -200, y: 150}}]}
                    ]
                },
                {
                    str: 'M 100 50 h -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 150}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: -200, y: 0}}]}
                    ]
                },
                {
                    str: 'M 100,0 Q 60,10 50,50 40,100 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'Q', relative: false, sequence: [
                            { control_1: {x: 120, y: 30}, coordinate_pair: {x: 100, y: 150} },
                            { control_1: {x: 80, y: 300}, coordinate_pair: {x: 0, y: 300} }
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 C 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'C', relative: false, sequence: [{
                            control_1: {x: 140, y: 30}, control_2: {x: 60, y: 240}, coordinate_pair: {x: 0, y: 300}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 c 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'C', relative: true, sequence: [{
                            control_1: {x: 140, y: 30}, control_2: {x: 60, y: 240}, coordinate_pair: {x: 0, y: 300}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 A 100 80 30 0 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'A', relative: false, sequence: [equivArc({
                            rx: 261.593, ry: 183.491, rotation: 73.7222, large_arc: false, sweep: false, coordinate_pair: {x: 0, y: 300}
                        })]}
                    ]
                },
                {
                    str: 'M 100 0 a 100 80 30 1 1 -100 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'A', relative: true, sequence: [equivArc({
                            rx: 261.593, ry: 183.491, rotation: 73.7222, large_arc: true, sweep: true, coordinate_pair: {x: -200, y: 300}
                        })]}
                    ]
                },
                {
                    str: 'M 100,0 A 50,40 30 0 1 50,50 100,40 45 1 0 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 200, y: 0}}]},
                        { command: 'A', relative: false, sequence: [
                            equivArc({ rx: 130.797, ry: 91.7454, rotation: 73.7222, large_arc: false, sweep: true, coordinate_pair: {x: 100, y: 150} }),
                            equivArc({ rx: 258.406, ry: 92.877, rotation: 59.958, large_arc: true, sweep: false, coordinate_pair: {x: 0, y: 300} })
                        ]}
                    ]
                },
            ]
        },

        {
            cmd: [{ command: 'rotate', angle: -90, cx: 50, cy: 50 }],
            path: [
                {
                    str: 'M 100 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [
                            {coordinate_pair: {x: 0, y: 0}},
                            {coordinate_pair: {x: 100, y: 100}}
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 m 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'M', relative: true, sequence: [{coordinate_pair: {x: 100, y: 0}}]}
                    ]
                },
                {
                    str: 'M 100 0 L 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 l 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 100, y: 0}}]}
                    ]
                },
                {
                    str: 'M 100 0 V 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]}
                    ]
                },
                {
                    str: 'M 100 0 v 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 100, y: 0}}]}
                    ]
                },
                {
                    str: 'M 100 50 H -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 50, y: 0}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 50, y: 200}}]}
                    ]
                },
                {
                    str: 'M 100 50 h -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 50, y: 0}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100,0 Q 60,10 50,50 40,100 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'Q', relative: false, sequence: [
                            { control_1: {x: 10, y: 40}, coordinate_pair: {x: 50, y: 50} },
                            { control_1: {x: 100, y: 60}, coordinate_pair: {x: 100, y: 100} }
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 C 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'C', relative: false, sequence: [{
                            control_1: {x: 10, y: 30}, control_2: {x: 80, y: 70}, coordinate_pair: {x: 100, y: 100}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 c 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'C', relative: true, sequence: [{
                            control_1: {x: 10, y: -70}, control_2: {x: 80, y: -30}, coordinate_pair: {x: 100, y: 0}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 A 100 80 30 0 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'A', relative: false, sequence: [equivArc({
                            rx: 100, ry: 80, rotation: -60, large_arc: false, sweep: false, coordinate_pair: {x: 100, y: 100}
                        })]}
                    ]
                },
                {
                    str: 'M 100 0 a 100 80 30 1 1 -100 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'A', relative: true, sequence: [equivArc({
                            rx: 100, ry: 80, rotation: -60, large_arc: true, sweep: true, coordinate_pair: {x: 100, y: 100}
                        })]}
                    ]
                },
                {
                    str: 'M 100,0 A 50,40 30 0 1 50,50 100,40 45 1 0 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 0}}]},
                        { command: 'A', relative: false, sequence: [
                            equivArc({ rx: 50, ry: 40, rotation: -60, large_arc: false, sweep: true, coordinate_pair: {x: 50, y: 50} }),
                            equivArc({ rx: 100, ry: 40, rotation: -45, large_arc: true, sweep: false, coordinate_pair: {x: 100, y: 100} })
                        ]}
                    ]
                },
            ]
        },

        {
            cmd: [{ command: 'skewX', angle: 45 }],
            path: [
                {
                    str: 'M 100 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [
                            {coordinate_pair: {x: 100, y: 0}},
                            {coordinate_pair: {x: 100, y: 100}}
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 m 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'M', relative: true, sequence: [{coordinate_pair: {x: 100, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 L 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 l 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 100, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 V 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 200, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 v 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 100, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 50 H -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 150, y: 50}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: -50, y: 50}}]}
                    ]
                },
                {
                    str: 'M 100 50 h -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 150, y: 50}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: -100, y: 0}}]}
                    ]
                },
                {
                    str: 'M 100,0 Q 60,10 50,50 40,100 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'Q', relative: false, sequence: [
                            { control_1: {x: 70, y: 10}, coordinate_pair: {x: 100, y: 50} },
                            { control_1: {x: 140, y: 100}, coordinate_pair: {x: 100, y: 100} }
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 C 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'C', relative: false, sequence: [{
                            control_1: {x: 80, y: 10}, control_2: {x: 110, y: 80}, coordinate_pair: {x: 100, y: 100}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 c 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x:100, y: 0}}]},
                        { command: 'C', relative: true, sequence: [{
                            control_1: {x: 80, y: 10}, control_2: {x: 110, y: 80}, coordinate_pair: {x: 100, y: 100}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 A 100 80 30 0 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'A', relative: false, sequence: [equivArc({
                            rx: 155.466, ry: 51.4581, rotation: 27.7054, large_arc: false, sweep: false, coordinate_pair: {x: 100, y: 100}
                        })]}
                    ]
                },
                {
                    str: 'M 100 0 a 100 80 30 1 1 -100 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'A', relative: true, sequence: [equivArc({
                            rx: 155.466, ry: 51.4581, rotation: 27.7054, large_arc: true, sweep: true, coordinate_pair: {x: 0, y: 100}
                        })]}
                    ]
                },
                {
                    str: 'M 100,0 A 50,40 30 0 1 50,50 100,40 45 1 0 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 0}}]},
                        { command: 'A', relative: false, sequence: [
                            equivArc({ rx: 77.7331, ry: 25.7291, rotation: 27.7054, large_arc: false, sweep: true, coordinate_pair: {x: 100, y: 50} }),
                            equivArc({ rx: 158.632, ry: 25.2156, rotation: 27.3126, large_arc: true, sweep: false, coordinate_pair: {x: 100, y: 100} })
                        ]}
                    ]
                },
            ]
        },

        {
            cmd: [{ command: 'skewY', angle: 45 }],
            path: [
                {
                    str: 'M 100 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [
                            {coordinate_pair: {x: 100, y: 100}},
                            {coordinate_pair: {x: 0, y: 100}}
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 m 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'M', relative: true, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 L 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 l 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 0 V 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 100, y: 200}}]}
                    ]
                },
                {
                    str: 'M 100 0 v 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 0, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100 50 H -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 150}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: -100, y: -50}}]}
                    ]
                },
                {
                    str: 'M 100 50 h -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 150}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: -100, y: -100}}]}
                    ]
                },
                {
                    str: 'M 100,0 Q 60,10 50,50 40,100 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'Q', relative: false, sequence: [
                            { control_1: {x: 60, y: 70}, coordinate_pair: {x: 50, y: 100} },
                            { control_1: {x: 40, y: 140}, coordinate_pair: {x: 0, y: 100} }
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 C 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'C', relative: false, sequence: [{
                            control_1: {x: 70, y: 80}, control_2: {x: 30, y: 110}, coordinate_pair: {x: 0, y: 100}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 c 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x:100, y: 100}}]},
                        { command: 'C', relative: true, sequence: [{
                            control_1: {x: 70, y: 80}, control_2: {x: 30, y: 110}, coordinate_pair: {x: 0, y: 100}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 A 100 80 30 0 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'A', relative: false, sequence: [equivArc({
                            rx: 161.779, ry: 49.4503, rotation: 58.0221, large_arc: false, sweep: false, coordinate_pair: {x: 0, y: 100}
                        })]}
                    ]
                },
                {
                    str: 'M 100 0 a 100 80 30 1 1 -100 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'A', relative: true, sequence: [equivArc({
                            rx: 161.779, ry: 49.4503, rotation: 58.0221, large_arc: true, sweep: true, coordinate_pair: {x: -100, y: 0}
                        })]}
                    ]
                },
                {
                    str: 'M 100,0 A 50,40 30 0 1 50,50 100,40 45 1 0 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 100, y: 100}}]},
                        { command: 'A', relative: false, sequence: [
                            equivArc({ rx: 80.8894, ry: 24.7251, rotation: 58.0221, large_arc: false, sweep: true, coordinate_pair: {x: 50, y: 100} }),
                            equivArc({ rx: 158.632, ry: 25.2156, rotation: 62.6874, large_arc: true, sweep: false, coordinate_pair: {x: 0, y: 100} })
                        ]}
                    ]
                },
            ]
        },

        {
            cmd: [{ command: 'matrix', a: 0.6, b: -1, c: 1, d: 0.3, e: 75, f: 115, }],
            path: [
                {
                    str: 'M 100 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [
                            {coordinate_pair: {x: 135, y: 15}},
                            {coordinate_pair: {x: 175, y: 145}}
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 m 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'M', relative: true, sequence: [{coordinate_pair: {x: 100, y: 30}}]}
                    ]
                },
                {
                    str: 'M 100 0 L 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 175, y: 145}}]}
                    ]
                },
                {
                    str: 'M 100 0 l 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 100, y: 30}}]}
                    ]
                },
                {
                    str: 'M 100 0 V 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 235, y: 45}}]}
                    ]
                },
                {
                    str: 'M 100 0 v 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: 100, y: 30}}]}
                    ]
                },
                {
                    str: 'M 100 50 H -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 185, y: 30}}]},
                        { command: 'L', relative: false, sequence: [{coordinate_pair: {x: 65, y: 230}}]}
                    ]
                },
                {
                    str: 'M 100 50 h -100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 185, y: 30}}]},
                        { command: 'L', relative: true, sequence: [{coordinate_pair: {x: -60, y: 100}}]}
                    ]
                },
                {
                    str: 'M 100,0 Q 60,10 50,50 40,100 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'Q', relative: false, sequence: [
                            { control_1: {x: 121, y: 58}, coordinate_pair: {x: 155, y: 80} },
                            { control_1: {x: 199, y: 105}, coordinate_pair: {x: 175, y: 145} }
                        ]}
                    ]
                },
                {
                    str: 'M 100 0 C 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'C', relative: false, sequence: [{
                            control_1: {x: 127, y: 48}, control_2: {x: 173, y: 109}, coordinate_pair: {x: 175, y: 145}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 c 70 10 30 80 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x:135, y: 15}}]},
                        { command: 'C', relative: true, sequence: [{
                            control_1: {x: 52, y: -67}, control_2: {x: 98, y: -6}, coordinate_pair: {x: 100, y: 30}
                        }]}
                    ]
                },
                {
                    str: 'M 100 0 A 100 80 30 0 0 0 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'A', relative: false, sequence: [equivArc({
                            rx: 124.62, ry: 75.7501, rotation: -34.1365, large_arc: false, sweep: false, coordinate_pair: {x: 175, y: 145}
                        })]}
                    ]
                },
                {
                    str: 'M 100 0 a 100 80 30 1 1 -100 100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'A', relative: true, sequence: [equivArc({
                            rx: 124.62, ry: 75.7501, rotation: -34.1365, large_arc: true, sweep: true, coordinate_pair: {x: 40, y: 130}
                        })]}
                    ]
                },
                {
                    str: 'M 100,0 A 50,40 30 0 1 50,50 100,40 45 1 0 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 135, y: 15}}]},
                        { command: 'A', relative: false, sequence: [
                            equivArc({ rx: 37.875, ry: 62.3102, rotation: 55.8635, large_arc: false, sweep: true, coordinate_pair: {x: 155, y: 80} }),
                            equivArc({ rx: 123.576, ry: 38.195, rotation: -24.3227, large_arc: true, sweep: false, coordinate_pair: {x: 175, y: 145} })
                        ]}
                    ]
                },
            ]
        },

        {
            cmd: [
                { command: 'rotate', angle: 90, cx: 0, cy: 0 },
                { command: 'scale', sx: 2, sy: -1 }
            ],
            path: [
                {
                    str: 'M 100 50 H 90 70 40',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 50, y: 200}}]},
                        { command: 'L', relative: false, sequence: [
                            {coordinate_pair: {x: 50, y: 180}},
                            {coordinate_pair: {x: 50, y: 140}},
                            {coordinate_pair: {x: 50, y: 80}}
                        ]}
                    ]
                },
                {
                    str: 'M 100 50 h -10 -20 -30',
                    ast: [ //m 50,200 v -20 -40 -60
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 50, y: 200}}]},
                        { command: 'L', relative: true, sequence: [
                            {coordinate_pair: {x: 0, y: -20}},
                            {coordinate_pair: {x: 0, y: -40}},
                            {coordinate_pair: {x: 0, y: -60}}
                        ]}
                    ]
                },
                {
                    str: 'M 100,0 Q 60,10 50,50 40,100 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 200}}]},
                        { command: 'Q', relative: false, sequence: [
                            { control_1: {x: 10, y: 120}, coordinate_pair: {x: 50, y: 100} },
                            { control_1: {x: 100, y: 80}, coordinate_pair: {x: 100, y: 0} }
                        ]}
                    ]
                },
                {
                    str: 'M 100,0 A 50,40 30 0 1 50,50 100,40 45 1 0 0,100',
                    ast: [
                        { command: 'M', relative: false, sequence: [{coordinate_pair: {x: 0, y: 200}}]},
                        { command: 'A', relative: false, sequence: [
                            equivArc({ rx: 95.8257, ry: 41.7424, rotation: 83.9529, large_arc: false, sweep: false, coordinate_pair: {x: 50, y: 100} }),
                            equivArc({ rx: 163.075, ry: 49.0572, rotation: 68.0025, large_arc: true, sweep: true, coordinate_pair: {x: 100, y: 0} })
                        ]}
                    ]
                },
            ]
        },
    ];

    for (let trans of transform_data) {
        describe('with transformation ' + JSON.stringify(trans.cmd), function() {
            const transformer = new Transformer(trans.cmd);
            for (let path of trans.path) {
                it('transforms path ' + path.str, function() {
                    const ast = parser.parse(path.str);
                    expect(transformer.transform(ast)).toEqual(path.ast);
                });
            }
        })
    }
});