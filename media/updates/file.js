function(doc, req) {
  if (req.form) {
    doc = req.form;
    doc.created_at = new Date();
    doc._id = req.uuid;
    return [doc,doc._id];
  }
}