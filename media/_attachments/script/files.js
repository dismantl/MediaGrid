// Apache 2.0 J Chris Anderson 2011
$(function() {   

    var path = unescape(document.location.pathname).split('/'),
	design = path[3],
	db = $.couch.db(path[1]),
	dir = getParameterByName("dir");

    function drawItems() {
	db.view(design + "/files", {
	    keys : [dir],
	    descending : "true",
	    update_seq : true,
	    success : function(data) {
		setupChanges(data.update_seq);
		var them = $.mustache($("#files").html(), {
		    items : data.rows.map(function(r) {
		      if (r.value.type === 'FILE') {
			r.value.fileurl = '/' + path[1] + '/' + r.value.fileurl;
		      } else if (r.value.type === 'DIR') {
			r.value.fileurl = document.location.pathname + "?dir=" + ((dir) ? (dir + '/') : '') + r.value.fileurl;
		      }
		      return r.value;
		    })
		});
		$("#content").html(them);
	    },
	    error: function() {
	      alert('poo');
	    }
	});
    };
    drawItems();
    var changesRunning = false;
    function setupChanges(since) {
	if (!changesRunning) {
	    var changeHandler = db.changes(since);
	    changesRunning = true;
	    changeHandler.onChange(drawItems);
	}
    }
    
    //draw breadcrumbs:
    if (dir) {
      var paths = getParameterByName("dir").split('/');
      var last = paths.pop();
      var links = [];
      var running = "";
      for (key in paths) {
	links.push({
	  backurl: document.location.pathname + "?dir=" + running + paths[key],
	  backtext: paths[key]
	});
	running = running + paths[key] + "/";
      }
      links.unshift({
	backurl: document.location.pathname,
	backtext: "Home"
      });
      var stuff = $.mustache($("#breadcrumbs").html(), {
	links: links,
	current: last
      });
      $("#path").html(stuff);
    }
    
    $("#upload").submit(function(e) {
	e.preventDefault();
	var form = this, doc = {
	  type: 'FILE',
	  dir: dir,
	  created_at: new Date()
	};
	db.saveDoc(doc, {
		success: function() {
			$("[name='_rev']", form).val(doc._rev);
			var attachments = $("[name='_attachments']", form).val();
			if (attachments) {
				$(form).ajaxSubmit({
					url: db.uri + $.couch.encodeDocId(doc._id),
					success: function() { 
						$("[name='_attachments']", form).val(''); 
					}
				});
			}
		}
	});
	return false;
    });
    
    $("#createdir").submit(function(e) {
	e.preventDefault();
	var form = this, doc = {
	  type: 'DIR',
	  dir: dir,
	  created_at: new Date(),
	  name: $("[name='name']", form).val()
	};
	db.saveDoc(doc, {
	  success: function() {
	    $("[name='name']", form).val('');
	  }
	});
	return false;
    });



function encodeOptions(options) {
    var buf = [];
    if (typeof(options) === "object" && options !== null) {
      for (var name in options) {
	if ($.inArray(name,
		      ["error", "success", "beforeSuccess", "ajaxStart"]) >= 0)
	  continue;
	var value = options[name];
	if ($.inArray(name, ["key", "startkey", "endkey"]) >= 0) {
	  value = toJSON(value);
	}
	buf.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
      }
    }
    return buf.length ? "?" + buf.join("&") : "";
  }

function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)')
		    .exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

});