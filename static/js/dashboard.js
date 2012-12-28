
// TEMPLATES

var updateTemplateFirst = '<div class="row"><div class="two columns"><tt class="label right">{{nick}}:</tt></div><div class="ten columns">{{content}}</div></div>';

var updateTemplateNext = '{{#items}}<div class="row"><div class="ten columns offset-by-two">{{content}}</div></div>{{/items}}<div class="row">&nbsp;</div>';

var fiveStarDetailTemplate = '{{#issues}}<p>[<a target="_new" href="{{html_url}}">{{number}}</a>] {{title}}</p>{{/issues}}'

var issueCountTemplate = '{{#issueCounts}}<h6><a target="_new" href="{{html_url}}">{{count}}</a> {{#numStars}}<i class="foundicon-star"></i>{{/numStars}}</h6>{{/issueCounts}}';

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
  var renderedFirst = Mustache.render(updateTemplateFirst, updates[0]);
  var renderedNext = Mustache.render(updateTemplateNext, updates.slice(1));
  $(renderedFirst).appendTo('#updates');
  $(renderedNext).appendTo('#updates');
}

function addBlockers(issues) {
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
  var processedIssues = [
    {numStars: new Array(4), count: issues[FOUR_STAR].count, html_url: issues[FOUR_STAR].html_url},
    {numStars: new Array(3), count: issues[THREE_STAR].count, html_url: issues[THREE_STAR].html_url},
    {numStars: new Array(2), count: issues[TWO_STAR].count, html_url: issues[TWO_STAR].html_url},
    {numStars: new Array(1), count: issues[ONE_STAR].count, html_url: issues[ONE_STAR].html_url}
  ];

  var rendered = Mustache.render(issueCountTemplate, {issueCounts: processedIssues});
  $(rendered).appendTo('#issueCounts');
}

$(document).ready(function() {
  $.get('/api/summary/' + HOST + '/' + ROOM, function(result) {
    // blockers
    addBlockers(result.issues[FIVE_STAR]);

    // bug counts
    addIssueCounts(result.issues);

    // status updates
    _.pairs(result.updates).forEach(function(userAndUpdates) {
      addUpdatesFromUser(userAndUpdates[0], userAndUpdates[1]);
    });
  });
});