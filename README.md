The CSS `path()` function does not accept units in its path string, because it is following
the SVG path syntax. This makes it impossible to make it responsive with CSS alone. This
scipt module helps by providing on-the-fly capabilities to re-compute the path data applying
arbitrary SVG transformations.

As an additional mechanism, the path data can be defined in relation to a view box. If a
target size is provided, the transformed path data will fit into it the same way as if
the path was part of an SVG with `viewBox` ans `preserveAspectRatio` attributes defined
on its root element.

## Usage

### In a webpage

Include the script:

```html
<script src="path/to/pathfit.js"></script>
<!-- or minified -->
<script src="path/to/pathfit.min.js"></script>
```

Suppose your path source data are from a SVG, which either is a part of your DOM,
or a standalone file. Read the path and size information you need:

```js
// 
const svg = svgDocumentFragment.querySelector('svg');

const pathElement = svg.querySelector(`path#${id}`)
const path = pathElement.getAttribute('d');

```

Just get all the relevant attributes from the root `<svg>` element. The module
will figure out itself which of these it should use to define a base view box.

```js
const attr = {};
for (let key of ['width', 'height', 'viewBox', 'preserveAspectRatio']) {
    attr.key = svg.getAttribute(key);
}
```

### In a node.js environment

Require the module.

```js
const Pathfit = require('pathfit);
```

You have to provide path and size information directly

```js
const path = 'M10.362 18.996s-6.046 21.453 1.47 25.329c10.158 5.238 18.033-21.308 29.039-18.23 13.125 3.672 18.325 36.55 18.325 36.55l12.031-47.544';

const attr = {
    viewBox: '0 0 80 80',
    preserveAspectRatio: 'xMidYMid meet' // the default
};
```

### Basic scaling

Scale to fit a container and then set the style property on the appropriate target element.

```js
const pathfitter = new Pathfit(attr, path); 

const scaled_path = pathfitter.scale_to(container.offsetWidth, container.offsetHeight);

container.style.offsetPath = `path('${scaled_path}')`;
```

## API

### `new Pathfit(attr, path, pretransform, opt)`

* _optional object_ `attr` see `.set_viewbox(attr)`

* _optional string_ `path` see `.set_path(path, pretransform)`

* _optional string | Array&lt;strings&gt;_ `pretransform` see `.set_path(path, pretransform)`.
  `pretransform` is ignored if `path` is not set.

* _optional object_ `opt = { precision = 6 }` sets the number of significant digits in the
  returned path data

All constructor arguments are optional.

### `.set_viewbox(attr)`

* _object_ `attr = {width, height, viewBox, preserveAspectRatio = 'xMidYMid meet'}`

  * _optional number | string_ `width`, `height` Strings can be followed by `'px'`. Every other unit
    will raise an error.

  * _optional string_ `viewBox` following the
    [syntax](https://www.w3.org/TR/SVG2/coords.html#ViewBoxAttribute) of the SVG attribute

  * _optional string_ `preserveAspectRatio` following the
    [syntax](https://www.w3.org/TR/SVG2/coords.html#PreserveAspectRatioAttribute) of the SVG attribute
  
Sets or computes a view box used for a later transformation with  `.scale_to()`. If `viewBox`
is not provided, `width` and `height` will be used instead. `preserveAspectRatio`
is completely optional. An error will be raised if no size can be figured out.

### `.set_fit(preserveAspectRatio)`

* _string_ `preserveAspectRatio` following the
  [syntax](https://www.w3.org/TR/SVG2/coords.html#PreserveAspectRatioAttribute) of the SVG attribute

Sets the method of fit for a later transformation with `.scale_to()`. This will raise an error
if `attr` was not previously set (although `attr.preserveAspectRatio` could have been ommitted).

### `.set_path(path, pretransform)`

* _string_ `path` following the syntax for path data in the SVG path `d` attribute or in the CSS
  `path()` function

* _optional string | Array&lt;strings&gt;_ `pretransform` containing one or more transform functions.
  Only the [SVG syntax](https://www.w3.org/TR/css-transforms-1/#svg-syntax) for transforms
  is supported. **CSS syntax (i. e. with units and relying on a `transform-origin`) will fail.**

Sets the path for later use with `.scale_to()` or `.transform()`. An optional pretransformation
can be applied to the path data. This might be espescially useful if the path data were provided
from a SVG where the path userspace coordinates were not identical to the root viewBox viewport.

Collect all `transform` attributes in descending tree order down to and including the
`<path>` element and pass that array:

```js
const transforms = [];

let ancestor = pathElement;
while (svg.contains(ancestor)) {
    const attr = ancestor.getAttribute('transform');

    if (attr && attr.length) transforms.unshift(attr);
}

pathfitter.set_path(path, transforms);
```

### `.transform(trans)`

* _string | Array&lt;string&gt;_ `trans` containing one or more transform functions.
  Only the [SVG syntax](https://www.w3.org/TR/css-transforms-1/#svg-syntax) for transforms
  is supported. **CSS syntax (i. e. with units and relying on a `transform-origin`) will fail.**

Transforms the presupplied path with any combination of affine transforms as supplied.

### `.scale_to(width, height)`

* _number | string_ `width`, `height` Strings can be followed by `'px'`. Every other unit
  will raise an error.

Transforms the presupplied path such that its computed view box will fit the given dimensions
and the `preserveAspectRatio` rule is fullfilled. This will raise an error
if `attr` was not previously set (although `attr.preserveAspectRatio` could have been ommitted).

## Roadmap

* CSS object-fit syntax
* CSS transform command parser?
