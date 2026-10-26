// validate(schema, 'body' | 'query' | 'params') -> replaces req[source] with the parsed value
module.exports = (schema, source = 'body') => (req, res, next) => {
  req[source] = schema.parse(req[source]);
  next();
};
