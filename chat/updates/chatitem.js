function(doc, req) {
  if (req.body) {
    req.body = unescape(req.body);
    //log(req.body);
    //log(JSON.parse(req.body));
    doc = JSON.parse(req.body);
    doc.created_at = new Date().getTime();
    doc._id = req.uuid;
    doc.test = "hey";
    return [doc,'success'];
  }
}