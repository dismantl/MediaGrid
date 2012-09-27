function(doc, req) {
  if (doc.room && doc.room === req.query.room) {
    return true;
  }
  return false;
}