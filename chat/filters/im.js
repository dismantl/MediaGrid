function(doc, req) {
  if ((doc.to && doc.to === req.userCtx.name) || (doc.from && doc.from === req.userCtx.name)) {
    return true;
  }
  return false;
}