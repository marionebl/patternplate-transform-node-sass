const mocks = require('./');

module.exports = {
  dependencies: {
    dependency: mocks.get('dependency-file.sass')
  }
};
