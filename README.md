## Usage

For usage in a webpage, include the script:

```html
<script src="path/to/pathfit.js"></script>
<!-- or minified -->
<script src="path/to/pathfit.min.js"></script>
```

Your path source could be from a SVG, either a part of your DOM,
or a standalone file. To scrape the path and size information:

```js
// 
const svg = svgDocumentFragment.querySelector('svg');

const path = svg.querySelector(`path#${id}`).getAttribute('d');

// get the relevant attributes from the root <svg> element. Even if some
// of these attributes are missing, as long as the SVG has a valid intrinsic
// size, this will still work
const attr = {};
for (let key of ['width', 'height', 'viewBox', 'preserveAspectRatio']) {
    attr.key = svg.getAttribute(key);
}
```

In a node.js environment, require the module.

```js
const Pathfit = require('pathfit);
```

There, you have to provide path and size information directly

```js
const path = 'M10.362 18.996s-6.046 21.453 1.47 25.329c10.158 5.238 18.033-21.308 29.039-18.23 13.125 3.672 18.325 36.55 18.325 36.55l12.031-47.544';

const attr = { // width and height, as they are fallbacks, are not really needed
    viewBox: '0 0 79.375 79.37',
    preserveAspectRatio: 'xMidYMid meet' // is the default
};
```

For both variants:

```js
// options for output formatting, defaults:
const opt = {
    precision: 6    // number of fractional digits
};

// for initialization, only the attributes are needed, path and opt are optional
const pathfitter = new Pathfit(attr, path, opt); 

// set another path that is usable for the same source size
pathfitter.set_path(another_path); 

// set the preserveAspectRatio as needed, follow SVG syntax
pathfitter.set_fit('xMidYMin meet'); 

// scale to the container dimensions
const scaled_path = pathfitter.scale(container.offsetWidth, container.offsetHeight);

// set the style property on the appropriate target element
container.style.offsetPath = `path('${scaled_path}')`;
```

## Roadmap

* expose the full Transformer capabilities so that arbitrary transforms can be applied.
* transform command parser
* pre-transformation to allow for the resolution of all user space coordinate systems
* CSS transform command parser?
