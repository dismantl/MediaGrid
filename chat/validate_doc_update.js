function(newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf("_admin") !== -1) {
    if (newDoc._id === "motd") return;
  }
  //required("type");
  if (newDoc.type === 'USER' || (oldDoc && oldDoc.type === 'USER')) {
    if (oldDoc || newDoc._deleted) {
      if (userCtx.name !== oldDoc._id) {
	throw({unauthorized: "You can't modify or delete other people's user docs"});
      }
      if (newDoc._deleted) return;
    }
    required("_id");
    unchanged("_id"); // this might change if allow users to change nicknames
    
    // TODO: uncomment this when native clients are ready
//     if (oldDoc && oldDoc.key) {
//       unchanged("key"); // this is pretty important
//     }
    required("rooms");
    if (!RegExp(/^[a-zA-Z0-9]{1,12}$/).test(newDoc._id)) {
      throw({forbidden: "invalid username"});
    }
    /*if (newDoc.key && (newDoc.key !== 0) && !RegExp(/^[a-zA-Z0-9=_-]{42,43}$/).test(newDoc.key)) {
      throw({forbidden: "invalid public key...sketchball."});
    }*/
    if (Object.prototype.toString.call(newDoc.rooms) != '[object Array]') {
      throw({forbidden: "invalid rooms array"});
    }
  } else if (newDoc.type === 'MSG' || (oldDoc && oldDoc.type === 'MSG')) {
    if (oldDoc || newDoc._deleted) {
      throw({forbidden: "You can't modify or delete chat messages"});
    } else {
      required("nick");
      required("message");
      required("created_at");
      required("room");
      if ((userCtx.name !== newDoc.nick) && !user_is("_admin")) {
	throw({unauthorized: "Impersonating other users is not allowed"});
      }
      if (!RegExp(/^[a-zA-Z0-9]{1,12}$/).test(newDoc.nick)) {
	throw({forbidden: "invalid username"});
      }
      if (!RegExp(/^[0-9]{13}$/).test(newDoc.created_at)) {
	throw({forbidden: "invalid timestamp"});
      }
      /*if (Object.prototype.toString.call(newDoc.message) == '[object Object]') {
	for (i in newDoc.message) {
	  if (!RegExp(/^[a-zA-Z0-9\+=/]+$/).test(newDoc.message[i].msg) || !RegExp(/^[a-zA-Z0-9]{128}$/).test(newDoc.message[i].hmac)) {
	    throw({forbidden: "invalid message"});
	  }
	}
      }*/
    }
  } else if (newDoc.type === 'IM' || (oldDoc && oldDoc.type === 'IM')) {
    if (oldDoc || newDoc._deleted) {
      throw({forbidden: "You can't modify or delete chat messages"});
    } else {
      required("from");
      required("to");
      required("created_at");
      required("message");
      if ((userCtx.name !== newDoc.from) && !user_is("_admin")) {
	throw({unauthorized: "Impersonating other users is not allowed"});
      }
      if (!RegExp(/^[a-zA-Z0-9]{1,12}$/).test(newDoc.from) || !RegExp(/^[a-zA-Z0-9]{1,12}$/).test(newDoc.to)) {
	throw({forbidden: "invalid username"});
      }
      if (!RegExp(/^[0-9]{13}$/).test(newDoc.created_at)) {
	throw({forbidden: "invalid timestamp"});
      }
      /*if (Object.prototype.toString.call(newDoc.message) == '[object Object]') {
	for (i in newDoc.message) {
	  if (!RegExp(/^[a-zA-Z0-9\+=/]+$/).test(newDoc.message[i].msg) || !RegExp(/^[a-zA-Z0-9]{128}$/).test(newDoc.message[i].hmac)) {
	    throw({forbidden: "invalid message"});
	  }
	}
      } else {
	throw({forbidden: "invalid message"});
      }*/
    }
  } else {
    throw({forbidden: "What you tryin to do to my database?"});
  }
  
  function required(field, message /* optional */) {
    message = message || "Document must have a " + field;
    if (!newDoc[field]) throw({forbidden : message});
  }

  function unchanged(field) {
    if (oldDoc && toJSON(oldDoc[field]) != toJSON(newDoc[field]))
      throw({forbidden : "Field can't be changed: " + field});
  }

  function user_is(role) {
    return userCtx.roles.indexOf(role) >= 0;
  }
}
