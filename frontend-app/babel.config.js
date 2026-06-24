module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      function () {
        return {
          visitor: {
            MetaProperty(path) {
              if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
                const parent = path.parentPath;
                if (parent.isMemberExpression() && parent.node.property.name === 'env') {
                  const grandparent = parent.parentPath;
                  if (grandparent.isMemberExpression() && grandparent.node.property.name === 'MODE') {
                    // Replace `import.meta.env.MODE` with `"development"` or `"production"`
                    grandparent.replaceWith({
                      type: 'StringLiteral',
                      value: process.env.NODE_ENV || 'development'
                    });
                  } else {
                    parent.replaceWith({
                      type: 'ObjectExpression',
                      properties: [
                        {
                          type: 'ObjectProperty',
                          key: { type: 'Identifier', name: 'MODE' },
                          value: { type: 'StringLiteral', value: process.env.NODE_ENV || 'development' }
                        }
                      ]
                    });
                  }
                }
              }
            }
          }
        };
      }
    ]
  };
};
