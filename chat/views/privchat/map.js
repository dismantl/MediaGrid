function(doc) {
  if (doc.type === 'MSG' && doc.room !== 'default') {
    for (itm in doc.message) {
      var val = {
	room: doc.room,
	created_at: doc.created_at,
	nick: doc.nick,
	//message: {String(itm) : doc.message[itm]}
      };
      val.message = {};
      val.message[itm] = doc.message[itm];
      emit ([doc.room,itm,doc.created_at],val);
    }
  }
}