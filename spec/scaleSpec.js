describe('Scale', function() {
    let Scale = require('../src/scale.js');

    it('delegates setting size and fit to methods', function () {
        spyOn(Scale.prototype, 'set_viewport');
        spyOn(Scale.prototype, 'set_preserveAspectRatio');
        const scale = new Scale('width', 'height', 'viewBox', 'preserveAspectRatio');
        expect(scale.set_viewport).toHaveBeenCalledWith('width', 'height', 'viewBox');
        expect(scale.set_preserveAspectRatio).toHaveBeenCalledWith('preserveAspectRatio');
    });

    const viewBox_data = [
        {str: '0 0 30 50', props: {x: 0, y: 0, width: 30, height: 50}},
        {str: '5 10 30 50', props: {x: 5, y: 10, width: 30, height: 50}},
        {str: '-5 -10 30 50', props: {x: -5, y: -10, width: 30, height: 50}},
        {str: '5,10,30,50', props: {x: 5, y: 10, width: 30, height: 50}},
        {str: '5,10, 30, 50', props: {x: 5, y: 10, width: 30, height: 50}},
        {str: '5 10 0 50', error: true},
        {str: '5 10 30 -50', error: true},
    ];

    it('sets dimensions from viewBox', function() {
        const scale = new Scale(1, 1);
        for (let item of viewBox_data) {
            const fn = () => scale.set_viewport(null, null, item.str);
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
                for (let [key, value] of Object.entries(item.props)) {
                    expect(scale[key]).toBe(value);
                }
            }
        }
    });

    const size_data = [
        {width: 30, height: 50, props: {x: 0, y: 0, width: 30, height: 50}},
        {width: '30', height: '50', props: {x: 0, y: 0, width: 30, height: 50}},
        {width: '30px', height: '50px', props: {x: 0, y: 0, width: 30, height: 50}},
        {width: '30%', height: '50px', error: true},
        {width: '30em', height: '50px', error: true},
        {width: 0, height: 50, error: true},
        {width: -30, height: 50, error: true},
        {width: '30', height: '0', error: true},
    ];

    it('sets dimensions for width and height', function() {
        const scale = new Scale(1, 1);
        for (let item of size_data) {
            const fn = () => scale.set_viewport(item.width, item.height);
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
                for (let [key, value] of Object.entries(item.props)) {
                    expect(scale[key]).toBe(value);
                }
            }
        }
    });

    const missing_data = [
        {},
        {width: 30},
        {height: 50}
    ];

    it('fails on incomple size data', function() {
        const scale = new Scale(1, 1);
        for (let item of missing_data) {
            const fn = () => scale.set_viewport(item.width, item.height, item.viewPort);
            expect(fn).toThrow();
        }
    });

    it('sets fit from preserveAspectRatio', function() {
        const scale = new Scale(1, 1);
        expect(scale.align).toBe('xMidYMid');
        expect(scale.meetOrSlice).toBe('meet');
        scale.set_preserveAspectRatio('xMinYMin slice');
        expect(scale.align).toBe('xMinYMin');
        expect(scale.meetOrSlice).toBe('slice');
        scale.set_preserveAspectRatio('none');
        expect(scale.align).toBe('none');
    });

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
                const scale = new Scale(100, 100, null, preserveAspectRatio);
                for (let [size_key, size_values] of Object.entries(size_data)) {
                    const result = scale.transform(...size_values);
                    expect(result).toEqual(expectations[size_key]);
                }
            });
        }
    });
});