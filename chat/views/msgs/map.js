function(doc) {
  if (doc.type === 'MSG' && doc.room !== 'default') {
    for (recipient in doc.message) {
      var val = {
	room: doc.room,
	created_at: doc.created_at,
	nick: doc.nick,
	//message: {String(recipient) : doc.message[recipient]}
      };
      val.message = {};
      val.message[recipient] = doc.message[recipient];
      emit ([recipient,doc.room,doc._id],val);
    }
  }
}
/*
 * queried by:
 * startkey=["my_username","<_id of first row in _changes>"]
 * endkey=["my_username","<_id of last row in _changes>"]
 */