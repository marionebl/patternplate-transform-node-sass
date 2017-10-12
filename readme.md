# patternplate-transform-node-sass [![stability][0]][1]

[![npm version][2]][3] [![Travis branch][4]][5] [![Appveyor branch][6]][7]


Process SASS and SCSS to CSS with patternplate.

## Transformation

**Input**

```scss
// patterns/sass-example.scss
@import 'normalize.scss';

@include normalize();

body {
  color: red;
  background: green;
  &.special {
    color: green;
    background: red;
  }
}
```

**Output**

```css
/*! normalize-scss | MIT/GPLv2 License | bit.ly/normalize-scss */
/* normalizing styles here */

body {
  color: red;
  background: green;
}
body.special {
  color: green;
  background: red;
}
```

## Installation

```
npm install --save patternplate-transform-node-sass
```

## Configuration

```js
// configuration/patternplate-server/patterns.js
module.exports = {
  formats: {
    scss: {
      transforms: ['node-sass']
    }
  }
}

// configuration/patternplate-server/transforms.js
module.exports = {
  'node-sass': {
    inFormat: 'scss',
    outFormat: 'css',
    // https://github.com/sass/node-sass#options
    opts: {}
  }
}
```

## See also

* [patternplate](https://github.com/sinnerschrader/patternplate) - Create, show and deliver component libraries
* [transform-less](https://github.com/sinnerschrader/patternplate-transform-less) - Process LESS to CSS
* [transform-postcss](https://github.com/sinnerschrader/patternplate-transform-postcss) - Process CSS via PostCSS

---
Copyright by Mario Nebl. Released under the MIT license.

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/npm/v/patternplate-transform-node-sass.svg?style=flat-square
[3]: https://npmjs.org/package/patternplate-transform-node-sass
[4]: https://img.shields.io/travis/marionebl/patternplate-transform-node-sass/master.svg?style=flat-square
[5]: https://travis-ci.org/marionebl/patternplate-transform-node-sass
[6]: https://img.shields.io/appveyor/ci/marionebl/patternplate-transform-node-sass/master.svg?style=flat-square
[7]: https://ci.appveyor.com/project/marionebl/patternplate-transform-node-sass
