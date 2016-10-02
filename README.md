# patternplate-transform-node-sass

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
    sass: {
      transforms: ['sass']
    }
  }
}

// configuration/patternplate-server/transforms.js
module.exports = {
  sass: {
    inFormat: 'sass',
    outFormat: 'css',
    transforms: ['sass'],
    // https://github.com/sass/node-sass#options
    opts: {
      indentedSyntax: false
    }
  },
  scss: {
    inFormat: 'scss',
    outFormat: 'css',
    transforms: ['scss'],
    // https://github.com/sass/node-sass#options
    opts: {
      indentedSyntax: true
    }
  }
}
```

## See also

* [patternplate](https://github.com/sinnerschrader/patternplate) - Create, show and deliver component libraries
*  [transform-less](https://github.com/sinnerschrader/patternplate-transform-less) - Process LESS to CSS
* [transform-postcss](https://github.com/sinnerschrader/patternplate-transform-postcss) - Process CSS via PostCSS

---
Copyright by Mario Nebl. Released under the MIT license.
