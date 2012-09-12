function(newDoc, oldDoc, userCtx) {
  if (oldDoc) {
    if (oldDoc._rev.charAt(0) > 1) throw({forbidden: "No modification or deletion of uploaded files allowed!"});
  }
}