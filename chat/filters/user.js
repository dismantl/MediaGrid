function(doc, req) {
  if (doc.type && doc.type === "USER" && (doc.rooms.indexOf(req.query.room) !== -1 || doc.left.indexOf(req.query.room) !== -1)) {
    return true;
  }
  return false;
}