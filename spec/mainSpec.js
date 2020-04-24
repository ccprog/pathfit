describe('Pathfit', function() {
    const Pathfit = require('../src/main.js');

    it('fullfills API', function() {
        const pathfitter = new Pathfit();
        expect(pathfitter.scale).toBeUndefined();

        const set_par = () => {
            pathfitter.set_aspect_ratio('xMinYMax slice');
            expect(pathfitter.scale.fit.par).toEqual({
                x: 'Min',
                y: 'Max',
                preserve: true,
                slice: true
            });
        };
        expect(set_par).toThrow();

        const set_style = () => {
            pathfitter.set_object_style({objectFit: 'contain', objectPosition: 'right top'});
            expect(pathfitter.scale.fit.object).toEqual({
                fit: 'contain',
                x: {relative: true, value: 0, reverse: true},
                y: {relative: true, value: 0, reverse: false}
            });
        };
        expect(set_style).toThrow();

        pathfitter.set_viewbox({viewBox: '0 0 80 80'});
        expect(pathfitter.scale.x).toBe(0);
        expect(pathfitter.scale.y).toBe(0);
        expect(pathfitter.scale.width).toBe(80);
        expect(pathfitter.scale.height).toBe(80);

        expect(pathfitter.scale.fit.par).toEqual({
            x: 'Mid',
            y: 'Mid',
            preserve: true,
            slice: false
        });

        expect(pathfitter.scale.fit.object).toEqual({
            fit: 'fill',
            x: {relative: true, value: 50, reverse: false},
            y: {relative: true, value: 50, reverse: false}
        });

        expect(set_par).not.toThrow();
        expect(set_style).not.toThrow();

        pathfitter.set_object_style({objectPosition: '10px'});
        expect(pathfitter.scale.fit.object).toEqual({
            fit: 'contain',
            x: {relative: false, value: 10, reverse: false},
            y: {relative: true, value: 50, reverse: false}
        });

        let result = pathfitter.set_path('M0 0 80 80');
        expect(result).toBe('M0 0 80 80');

        result = pathfitter.set_path('M0 0 80 80', 'rotate(90 40,40)');
        expect(result).toBe('M80 0 0 80');

        result = pathfitter.transform('rotate(-90 40,40)');
        expect(result).toBe('M0 0 80 80');

        result = pathfitter.scale_with_aspect_ratio(160, 160);
        expect(result).toBe('M160 0 0 160');

        result = pathfitter.scale_with_object_fit(160, 160);
        expect(result).toBe('M170 0 10 160');
    });
});
