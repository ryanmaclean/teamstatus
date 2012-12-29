
// TEMPLATES

var updateTemplateFirst = '<div class="row"><div class="two columns"><span class="label right">{{nick}}:</span></div><div class="ten columns">{{content}} <span style="font-size:0.7em;">[{{nice_at}}]</span></div></div>';

var updateTemplateNext = '{{#items}}<div class="row"><div class="ten columns offset-by-two">{{content}} <span style="font-size:0.7em;">[{{nice_at}}]</span></div></div>{{/items}}<div class="row">&nbsp;</div>';

var fiveStarDetailTemplate = '{{#issues}}<p>[<a target="_new" href="{{html_url}}">{{number}}</a>] {{title}}</p>{{/issues}}';

var issueCountTemplate = '{{#issueCounts}}<h6><a target="_new" href="{{html_url}}">{{count}}</a> {{#numStars}}<i class="foundicon-star"></i>{{/numStars}}</h6>{{/issueCounts}}';

var tagsTemplate = '<dd class="active"><a href="#" class="tag" id="tag_all">all</a></dd>{{#tags}}<dd><a href="#" class="tag" id="tag_{{tag}}">#{{tag}}</a></dd>{{/tags}}';

// STARS
function repeatString(str, num) {
  return new Array(num + 1).join(str);
}

var ONE_STAR = "\u2605";
var TWO_STAR = repeatString(ONE_STAR, 2);
var THREE_STAR = repeatString(ONE_STAR, 3);
var FOUR_STAR = repeatString(ONE_STAR, 4);
var FIVE_STAR = repeatString(ONE_STAR, 5);


function addUpdatesFromUser(nick, updates) {
  // make dates nice
  updates.forEach(function(update) {
    update.nice_at = moment(update.at).fromNow();
  });

  var renderedFirst = Mustache.render(updateTemplateFirst, updates[0]);
  var renderedNext = Mustache.render(updateTemplateNext, {items: updates.slice(1)});
  $(renderedFirst).appendTo('#updates');
  $(renderedNext).appendTo('#updates');
}

function addUpdatesFromAllUsers(updates) {
  $('#updates').html('');
  _.pairs(updates).forEach(function(userAndUpdates) {
    addUpdatesFromUser(userAndUpdates[0], userAndUpdates[1]);
  });
}

function addBlockers(issues) {
  $('#fiveStarModalContent').html('');
  $('#blockers').hide();

  if (issues && (issues.length > 0)) {
    // add the count
    $('#fiveStarCount').html(issues.length.toString());

    // add the content
    var rendered = Mustache.render(fiveStarDetailTemplate, {issues: issues});
    $(rendered).appendTo('#fiveStarModalContent');

    // show it
    $('#blockers').show();
  }
}

function addIssueCounts(issues) {
  $('#issueCounts').html('');

  if (!issues[FOUR_STAR]) {
    processedIssues = [];
  } else {
    var processedIssues = [
      {numStars: new Array(4), count: issues[FOUR_STAR].count, html_url: issues[FOUR_STAR].html_url},
      {numStars: new Array(3), count: issues[THREE_STAR].count, html_url: issues[THREE_STAR].html_url},
      {numStars: new Array(2), count: issues[TWO_STAR].count, html_url: issues[TWO_STAR].html_url},
      {numStars: new Array(1), count: issues[ONE_STAR].count, html_url: issues[ONE_STAR].html_url}
    ];
  }

  var rendered = Mustache.render(issueCountTemplate, {issueCounts: processedIssues});
  $(rendered).appendTo('#issueCounts');
}

var tagsAdded=false;
function addTags(tags) {
  // let's do this one only if we haven't done it before
  if (tagsAdded)
    return;
  tagsAdded = true;

  if (!tags || !tags.length)
    return;

  var rendered = Mustache.render(tagsTemplate, {tags: _.map(tags, function(t) {return {tag:t};})});
  $(rendered).appendTo('#tags');
}

function updateAll(host, room, tag, cb) {
  var url = '/api/summary/' + host + '/' + room;
  if (tag)
    url += '?tag=' + encodeURIComponent(tag);

  $.get(url, function(result) {
    // tags
    addTags(result.tags);

    // blockers
    addBlockers(result.issues[FIVE_STAR]);

    // bug counts
    addIssueCounts(result.issues);

    // status updates
    addUpdatesFromAllUsers(result.updates);

    if (cb)
      cb();
  });
}

$(document).ready(function() {
  updateAll(HOST, ROOM, null, function() {
    $('.tag').click(function(evt) {
      var tag = evt.target.id.match('tag_(.+)')[1];

      if (tag == 'all')
        updateAll(HOST, ROOM, null);
      else
        updateAll(HOST, ROOM, tag);
    });
  });
});


