function(doc) {
  if (doc.type === 'IM') {
    var val = {
      created_at: doc.created_at,
      to: doc.to,
      from: doc.from
    };
    var val2 = {
      created_at: doc.created_at,
      to: doc.to,
      from: doc.from
    };
    val.message = {};
    val.message[doc.to] = doc.message[doc.to];
    emit([doc.to,doc.from,doc.created_at],val);
    val2.message = {};
    val2.message[doc.from] = doc.message[doc.from];
    emit([doc.from,doc.to,doc.created_at],val2);
  }
}
