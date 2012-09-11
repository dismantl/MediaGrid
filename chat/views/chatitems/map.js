function(doc) {
  if (doc.type === 'MSG') {
    emit ([doc.room,doc.created_at],{
      room: doc.room,
      created_at: doc.created_at,
      nick: doc.nick,
      message: doc.message
    });
  }
}