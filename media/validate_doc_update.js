function(newDoc, oldDoc, userCtx) {
  if (oldDoc) {
    if ((oldDoc._rev.charAt(0) > 1) || (oldDoc._rev.charAt(0) == 1 && oldDoc.type === 'DIR')) throw({forbidden: "No modification or deletion of uploaded files allowed!"});
  }
}