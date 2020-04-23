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
            const fn = () => {
                const port = sizeParser.viewport(null, null, item.str);
                for (let [key, value] of Object.entries(item.props)) {
                    expect(port[key]).toBe(value);
                }
            };
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
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
            const fn = () => {
                const port = sizeParser.viewport(item.width, item.height)
                for (let [key, value] of Object.entries(item.props)) {
                    expect(port[key]).toBe(value);
                }
            };
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
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

    const position_data = [
        {
            str: 'center',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'left',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'right',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: '200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: '20%',
            x: { relative: true, value: 20, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'top',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'bottom',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'center center',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'center top',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'center bottom',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'center 300px',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'left center',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'left top',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'left bottom',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'left 300px',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'right center',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'right top',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'right bottom',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'right 300px',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: '200px 30%',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 30, reverse: false }
        },
        {
            str: 'center left',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'center right',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'top center',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'top left',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'top right',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'top 200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'bottom center',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'bottom left',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'bottom right',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'bottom 200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'top left 200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'top right 200px',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'bottom left 200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'bottom right 200px',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'top 300px center',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'top 300px left',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'top 300px right',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'bottom 300px center',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'bottom 300px left',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'bottom 300px right',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'center left 200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'center right 200px',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'center top 300px',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'center bottom 300px',
            x: { relative: true, value: 50, reverse: false },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'left top 300px',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'left bottom 300px',
            x: { relative: true, value: 0, reverse: false },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'right top 300px',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'right bottom 300px',
            x: { relative: true, value: 0, reverse: true },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'left 200px center',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'left 200px top',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'left 200px bottom',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'right 200px center',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: true, value: 50, reverse: false }
        },
        {
            str: 'right 200px top',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: true, value: 0, reverse: false }
        },
        {
            str: 'right 200px bottom',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: true, value: 0, reverse: true }
        },
        {
            str: 'left 20% top 300px',
            x: { relative: true, value: 20, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'left 20% bottom 300px',
            x: { relative: true, value: 20, reverse: false },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'right 200px top 300px',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'right 200px bottom 300px',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'top 300px left 200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'top 300px right 200px',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: false, value: 300, reverse: false }
        },
        {
            str: 'bottom 300px left 200px',
            x: { relative: false, value: 200, reverse: false },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'bottom 300px right 200px',
            x: { relative: false, value: 200, reverse: true },
            y: { relative: false, value: 300, reverse: true }
        },
        {
            str: 'middle',
            error: true
        },
        {
            str: '3em',
            error: true
        },
        {
            str: 'left right',
            error: true
        },
        {
            str: '300px right',
            error: true
        },
        {
            str: '300px top',
            error: true
        },
        {
            str: '20px top 10px',
            error: true
        },
        {
            str: 'left 20px 10px',
            error: true
        },
        {
            str: 'top 20px bottom 10px',
            error: true
        },
    ];

    for (let item of position_data) {
        it(`sets object position from "${item.str}"`, function() {
            const fn = () => {
                const position = sizeParser.object_position(item.str);
                expect(position.x).toEqual(item.x);
                expect(position.y).toEqual(item.y);
            };
            if (item.error) {
                expect(fn).toThrow();
            } else {
                expect(fn).not.toThrow();
            }
        });
    }

});