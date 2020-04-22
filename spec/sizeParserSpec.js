describe('sizeParser', function() {
    let sizeParser = require('../src/sizeParser.js');

    const viewBox_data = [
        {str: '0 0 30 50', props: {x: 0, y: 0, width: 30, height: 50}},
        {str: '5 10 30 50', props: {x: 5, y: 10, width: 30, height: 50}},
        {str: '-5 -10 30 50', props: {x: -5, y: -10, width: 30, height: 50}},
        {str: '5,10,30,50', props: {x: 5, y: 10, width: 30, height: 50}},
        {str: '5,10, 30, 50', props: {x: 5, y: 10, width: 30, height: 50}},
        {str: '5 10 0 50', error: true},
        {str: '5 10 30 -50', error: true},
    ];

    for (let item of viewBox_data) {
        it('sets dimensions from viewBox ' + item.str, function() {
            let port;
            const fn = () => {port = sizeParser.viewport(null, null, item.str)};
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
                for (let [key, value] of Object.entries(item.props)) {
                    expect(port[key]).toBe(value);
                }
            }
        });
    }

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

    for (let item of size_data) {
        it(`sets dimensions from width "${item.width}" and height "${item.height}"`, function() {
            let port;
            const fn = () => {port = sizeParser.viewport(item.width, item.height)};
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
                for (let [key, value] of Object.entries(item.props)) {
                    expect(port[key]).toBe(value);
                }
            }
        });
    }

    const missing_data = [
        {},
        {width: 30},
        {height: 50}
    ];

    it('fails on incomple size data', function() {
        for (let item of missing_data) {
            const fn = () => sizeParser.viewport(item.width, item.height, item.viewPort);
            expect(fn).toThrow();
        }
    });

    it('sets fit from preserveAspectRatio', function() {
        let par = sizeParser.aspect_ratio('xMinYMax slice');
        expect(par.preserve).toBeTrue();
        expect(par.x).toBe('Min');
        expect(par.y).toBe('Max');
        expect(par.slice).toBeTrue();
        par = sizeParser.aspect_ratio('xMidYMid meet');
        expect(par.preserve).toBeTrue();
        expect(par.x).toBe('Mid');
        expect(par.y).toBe('Mid');
        expect(par.slice).toBeFalse();
        par = sizeParser.aspect_ratio('none');
        expect(par.preserve).toBeFalse();
    });
});