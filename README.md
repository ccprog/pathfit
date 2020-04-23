![Jasmine test spec](https://github.com/ccprog/pathfit/workflows/Jasmine%20test%20spec/badge.svg)

The CSS `path()` function does not accept units in its path string, because it is following
the SVG path syntax. This makes it impossible to make it responsive with CSS alone. This
script module helps by providing on-the-fly capabilities to re-compute the path data applying
arbitrary SVG transformations.

The path data can be defined in relation to a view box. Then, if a target size is
provided, the transformed path data will fit into that viewport the same way as if
the path was part of an SVG with a `viewBox` defined on its root element. Either a SVG-style
`preserveAspectRatio` attribute or CSS-style `object-fit` and `object-position` style
properties can be used to position the view box in relation to the target viewport.

## Usage

### In a webpage

Include the script:

```html
<script src="path/to/pathfit.js"></script>
<!-- or minified -->
<script src="path/to/pathfit.min.js"></script>
```

#### SVG-style sizing

Suppose your path source data are from a SVG, which either is a part of your DOM,
or a standalone file. Read the path and size information you need:

```js
// 
const svg = svgDocumentFragment.querySelector('svg');

const pathElement = svg.querySelector(`path#${id}`);
const path = pathElement.getAttribute('d');
```

Get all the relevant attributes from the root `<svg>` element. The module
will figure out itself which of these it should use to define a base view box.

```js
const base = {};
for (let key of ['width', 'height', 'viewBox', 'preserveAspectRatio']) {
    base.key = svg.getAttribute(key);
}
```

#### CSS-style sizing

Suppose you want to size your path data in relation to an `<img>` element. While you
still need to give a base view box (i. e. at least `base.width` and `base.height`),
the sizing algorithm might be governed by the `object-fit` and `object-position`
CSS properties of the `<img>`. Read the properties from the element, and just pass
the complete `CSSStyleDeclaration`, the module will pick out the values for the
two properties:

```js
const style = getComputedStyle(document.querySelector('img#img-id'));
```

### In a node.js environment

Require the module.

```js
const Pathfit = require('pathfit');
```

You have to provide path and size information directly

```js
const path = 'M10.362 18.996s-6.046 21.453 1.47 25.329c10.158 5.238 18.033-21.308 29.039-18.23 13.125 3.672 18.325 36.55 18.325 36.55l12.031-47.544';

const base = {
    viewBox: '0 0 80 80',
    preserveAspectRatio: 'xMidYMid meet' // the default
};
// or for CSS sizing, note the camelCase for style properties
const style = {
    objectFit: 'fill', // the defaults
    objectPosition: '50% 50%'
}
```

### Basic scaling

Scale the path to fit a container and then set the style property on the appropriate
target element.

#### SVG-style sizing

```js
const pathfitter = new Pathfit(base, undefined, path);

const scaled_path = pathfitter.scale_with_aspect_ratio(container.offsetWidth, container.offsetHeight);

container.style.offsetPath = `path('${scaled_path}')`;
```

#### CSS-style sizing

```js
const pathfitter = new Pathfit(base, style, path);

const scaled_path = pathfitter.scale_with_object_fit(container.offsetWidth, container.offsetHeight);

container.style.clipPath = `path('${scaled_path}')`;
```

## API

### `new Pathfit(base, style, path, pretransform, opt)`

* _optional object_ `base` see `.set_viewbox(base)`

* _optional object_ `{objectFit = 'fill', objectPosition = '50% 50%'}` following
  the syntax of the CSS properties
  [`object-fit`](https://www.w3.org/TR/css-images-3/#the-object-fit) and
  [`object-position`](https://www.w3.org/TR/css-images-3/#the-object-position).

  In contrast to the method `.set_object_style(style)`, if one of the properties or
  the parameter as a whole is missing, its value is set to the default.

* _optional string_ `path` see `.set_path(path, pretransform)`

* _optional string | Array&lt;strings&gt;_ `pretransform` see `.set_path(path, pretransform)`.
  `pretransform` is ignored if `path` is not set.

* _optional object_ `opt = { precision = 6 }` sets the number of significant digits in the
  returned path data

All constructor arguments are optional.

### `.set_viewbox(base)`

* _object_ `base = {width, height, viewBox, preserveAspectRatio = 'xMidYMid meet'}`

  * _optional number | string_ `width`, `height` Strings can be followed by `'px'`. Every other unit
    will raise an error.

  * _optional string_ `viewBox` following the
    [syntax](https://www.w3.org/TR/SVG2/coords.html#ViewBoxAttribute) of the SVG attribute

  * _optional string_ `preserveAspectRatio` following the
    [syntax](https://www.w3.org/TR/SVG2/coords.html#PreserveAspectRatioAttribute) of the SVG attribute
  
Sets or computes a view box used for a later transformation with
`.scale_with_aspect_ratio(width, height)` or `.scale_with_object_fit(width, height)`. If `viewBox`
is not provided, `width` and `height` will be used instead. `preserveAspectRatio`
is completely optional. An error will be raised if no size can be figured out.

### `.set_aspect_ratio(preserveAspectRatio)`

* _string_ `preserveAspectRatio` following the
  [syntax](https://www.w3.org/TR/SVG2/coords.html#PreserveAspectRatioAttribute) of the SVG attribute

Sets the method of fit for a later transformation with `.scale_with_aspect_ratio()`. This
will raise an error if `base` was not previously set (although `base.preserveAspectRatio`
could have been ommitted).

### `.set_object_style(style)`

* _object_ `{objectFit, objectPosition}` following the syntax of the CSS properties
  [`object-fit`](https://www.w3.org/TR/css-images-3/#the-object-fit) and
  [`object-position`](https://www.w3.org/TR/css-images-3/#the-object-position).

  In contrast to the constructor, if one of the properties is missing, its value
  remains unchanged.

Sets the method of fit for a later transformation with `.scale_with_object_fit()`. This
will raise an error if `base` was not previously set (although `style`
could have been ommitted).

### `.set_path(path, pretransform)`

* _string_ `path` following the syntax for path data in the SVG path `d` attribute or in the CSS
  `path()` function

* _optional string | Array&lt;strings&gt;_ `pretransform` containing one or more transform functions.
  Only the [SVG syntax](https://www.w3.org/TR/css-transforms-1/#svg-syntax) for transforms
  is supported. **CSS syntax (i. e. with units and relying on a `transform-origin`) will fail.**

* **returns** _string_ the path, optionally pretransformed, in the form that will be used as
  source for later transformations.

Sets the path for later use with `.scale_to()` or `.transform()`. An optional pretransformation
can be applied to the path data. This might be especially useful if the path data were provided
from a SVG where the path userspace coordinates were not identical to the root viewBox viewport.

Collect all `transform` attributes in descending tree order down to and including the
`<path>` element and pass that array:

```js
const transforms = [];

let ancestor = pathElement;
while (svg.contains(ancestor)) {
    const attr = ancestor.getAttribute('transform');

    if (attr && attr.length) transforms.unshift(attr);

    ancestor = ancestor.parentElement;
}

pathfitter.set_path(path, transforms);
```

### `.transform(trans)`

* _string | Array&lt;string&gt;_ `trans` containing one or more transform functions.
  Only the [SVG syntax](https://www.w3.org/TR/css-transforms-1/#svg-syntax) for transforms
  is supported. **CSS syntax (i. e. with units and relying on a `transform-origin`) will fail.**

* **returns** _string_ the transformed path.

Transforms the presupplied path with any combination of affine transforms as supplied.

### `.scale_with_aspect_ratio(width, height)`

* _number | string_ `width`, `height` Strings can be followed by `'px'`. Every other unit
  will raise an error.

* **returns** _string_ the transformed path.

Transforms the presupplied path such that its computed view box will fit the given dimensions
and the `preserveAspectRatio` rule is fullfilled. This will raise an error
if `base` was not previously set (although `base.preserveAspectRatio` could have been ommitted).

### `.scale_with_object_fit(width, height)`

* _number | string_ `width`, `height` Strings can be followed by `'px'`. Every other unit
  will raise an error.

* **returns** _string_ the transformed path.

Transforms the presupplied path such that its computed view box will fit the dimensions
of the `objectFit` rule and it is positioned according to the `objectPosition` rule.
This will raise an error if `base` was not previously set (although `style` could
have been ommitted).

