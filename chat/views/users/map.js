function(doc) {
  if (doc.type === 'USER' && doc.rooms) {
    for (room in doc.rooms) {
      emit(doc.rooms[room], {
	nick: doc._id,
	key: doc.key
      });
    }
  }
}