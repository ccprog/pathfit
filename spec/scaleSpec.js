describe('Scale', function() {
    let Scale = require('../src/scale.js');

    describe('returns correct transforms', function() {
        const size_data = {
            fit: [100, 100],
            scale: [300, 300],
            wide: [300, 100],
            high: [100, 400]
        };

        const aspect_data = {
            'none': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'scale', sx: 3, sy: 1}],
                high: [{command: 'scale', sx: 1, sy: 4}]
            },

            'xMinYMin meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [],
                high: [],
            },
            'xMinYMid meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [],
                high: [{command: 'translate', tx: 0, ty: 150}]
            },
            'xMinYMax meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [],
                high: [{command: 'translate', tx: 0, ty: 300}]
            },
            'xMidYMin meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 100, ty: 0}],
                high: []
            },
            'xMidYMid meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 100, ty: 0}],
                high: [{command: 'translate', tx: 0, ty: 150}]
            },
            'xMidYMax meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 100, ty: 0}],
                high: [{command: 'translate', tx: 0, ty: 300}]
            },
            'xMaxYMin meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 200, ty: 0}],
                high: []
            },
            'xMaxYMid meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide:  [{command: 'translate', tx: 200, ty: 0}],
                high: [{command: 'translate', tx: 0, ty: 150}]
            },
            'xMaxYMax meet': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide:  [{command: 'translate', tx: 200, ty: 0}],
                high: [{command: 'translate', tx: 0, ty: 300}]
            },

            'xMinYMin slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'scale', sx: 4, sy: 4}],
            },
            'xMinYMid slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 0, ty: -100}, {command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'scale', sx: 4, sy: 4}]
            },
            'xMinYMax slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 0, ty: -200}, {command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'scale', sx: 4, sy: 4}]
            },
            'xMidYMin slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'translate', tx: -150, ty: 0}, {command: 'scale', sx: 4, sy: 4}]
            },
            'xMidYMid slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 0, ty: -100}, {command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'translate', tx: -150, ty: 0}, {command: 'scale', sx: 4, sy: 4}]
            },
            'xMidYMax slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'translate', tx: 0, ty: -200}, {command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'translate', tx: -150, ty: 0}, {command: 'scale', sx: 4, sy: 4}]
            },
            'xMaxYMin slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide: [{command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'translate', tx: -300, ty: 0}, {command: 'scale', sx: 4, sy: 4}]
            },
            'xMaxYMid slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide:  [{command: 'translate', tx: 0, ty: -100}, {command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'translate', tx: -300, ty: 0}, {command: 'scale', sx: 4, sy: 4}]
            },
            'xMaxYMax slice': {
                fit: [],
                scale: [{command: 'scale', sx: 3, sy: 3}],
                wide:  [{command: 'translate', tx: 0, ty: -200}, {command: 'scale', sx: 3, sy: 3}],
                high: [{command: 'translate', tx: -300, ty: 0}, {command: 'scale', sx: 4, sy: 4}]
            },
        }

        for (let [preserveAspectRatio, expectations] of Object.entries(aspect_data)) {
            it(`for "${preserveAspectRatio}"`, function() {
                const scale = new Scale(100, 100, null, { preserveAspectRatio });
                for (let [size_key, size_values] of Object.entries(size_data)) {
                    const result = scale.transform_from_aspect_ratio(...size_values);
                    expect(result).toEqual(expectations[size_key]);
                }
            });
        }
    });
});