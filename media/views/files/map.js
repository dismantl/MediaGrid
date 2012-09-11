function(doc) {
  if (doc._attachments && doc.type === 'FILE') {
      //var p = doc.profile || {};
      for (var key in doc._attachments) {
      	emit(doc.dir, {
          type: doc.type,
          fileurl: doc._id + '/' + key,
          filename: key,
          size: doc._attachments[key].length,
          time: doc.created_at,
          epoch: doc.created_at
      	});
      }
  } else if (doc.type === 'DIR') {
      emit(doc.dir, {
	type: doc.type,
	fileurl: doc.name,
	filename: doc.name,
	size: '-',
	time: doc.created_at,
	epoch: doc.created_at
      });
  }
};
