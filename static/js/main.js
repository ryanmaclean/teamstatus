$(document).ready(function() {
  // var linkRegex = /(?:https?:\/\/)(?:[\da-z\.-]+)\.(?:[a-z\.]{2,6})(?:[\/\w\.-]*)*\/?(?:#[\w\d=\/\.-]+)?(?:\?[_\-\.=&%\w\d=;]+)?/g;
  // trying a simpler regexp
  var linkRegex = /(https?:\/\/[^ ]+)/g;

  var markupTable = {
    0x02: "b",
    0x11: "tt",
    0x1d: "i",
    0x1f: "ul"

  };

  function formatMessage(msg) {
    // entity encode
    msg = $("<div/>").text(msg).html();

    // make links clickable
    msg = msg.replace(linkRegex, function (match) {
      return '<a target="_new" href="' + match + '">' + match + "</a>";
    });

    // color highlight messages
    var openTags = [ ];
    var msgbuf = "";
    function closeTags(until) {
      while (openTags.length) {
        var t = openTags.pop();
        msgbuf += "</" + t + ">";
        if (until && until == t) break;
      }
    }
    function isOpen(t) {
      for (var i=0; i < openTags.length; i++) if (openTags[i] == t) return true;
      return false;
    }
    function openTag(t) {
      msgbuf += "<" + t + ">";
      openTags.push(t);
    }
    for (var i =0; i < msg.length; i++) {
      if (markupTable.hasOwnProperty(msg.charCodeAt(i))) {
        var t = markupTable[msg.charCodeAt(i)];
        if (isOpen(t)) closeTags(t);
        else openTag(t);
      } else if (msg.charCodeAt(i) == 0x0f) {
        closeTags();
      } else if (msg.charCodeAt(i) == 0x03) {
        if (isOpen('span')) closeTags('irc');

        // span coloring!
        var color = undefined;
        if (msg.charCodeAt(i+1) >= 0x30 &&  msg.charCodeAt(i+1) <= 0x39) {
          if (msg.charCodeAt(i+2) >= 0x30 &&  msg.charCodeAt(i+2) <= 0x39) {
            color = parseInt(msg.substr(i+1,2), 10);
            i += 2;
          } else {
            color = parseInt(msg.substr(i+1,1), 10);
            i += 1;
          }
        }
        if (color != undefined && color >= 0 && color <= 15) {
          msgbuf += "<span class=\"clr_" + color.toString() + "\">";
          openTags.push("span");
        }
      } else if (msg.charCodeAt(i) < 32 && msg.charCodeAt(i) != 1) {
        // uh oh, unknown control code!  add a question mark to output
        msgbuf += "?(" + msg.charCodeAt(i) + ")";
      } else {
        msgbuf += msg.charAt(i);
      }
    }
    closeTags();
    msg = msgbuf;

    return msg;
  }

  function setButtons(first_id, last_id, phrase) {
    var first = parseInt($("table.logdisplay tr:first-child").attr("mid"));
    var last = parseInt($("table.logdisplay tr:last-child").attr("mid"));

    if (last !== undefined && last !== 0) {
      var bottomButt = $("#templates .button.bottom").clone();
      bottomButt.find("b").text(first < last ? "newer" : "older");
      bottomButt.attr("mid", last+30);
      bottomButt.appendTo($("#logview .logdisplay"));
    }

    if (first !== undefined && first !== 0) {
      var bottomButt = $("#templates .button.top").clone();
      bottomButt.find("b").text(first < last ? "older" : "newer");
      bottomButt.attr("mid", first+1);
      bottomButt.prependTo($("#logview .logdisplay"));
    }

    $("#logview .button").click(function() {
      // if it's got a phrase, then it's a search, otherwise it's
      // a browse
      var mid = $(this).attr("mid");
      var hashBits = location.hash.split("/");
      location.hash = "#browse/" + hashBits[1] + "/" + hashBits[2] + "/" + mid;
    });
  }

  function showWaiting() {
    $("#logview .logdisplay").hide();
    $("#logview .waiting").show();
  }

  function showLogs() {
    $("#logview .waiting").fadeOut(300, function() {
      $("#logview .logdisplay").show();
    });
  }

  var colors = {};
  var colorsUsed = 2;

  function colorPerson(who) {
    if (colors[who]) return colors[who];
    // recycle
    if (colorsUsed >= 16) colorsUsed = 2;
    // skip yellow
    if (colorsUsed == 8) colorsUsed++;
    colors[who] = 'clr_' + colorsUsed++;
    return colors[who];
  }

  function renderOneUser(host, room, nick, updates, domNode, clickToUser) {
    var l = domNode;
    l.attr("nick", nick);
    l.find(".nick").text(nick);
    l.click(clickToUser);

    var recent_update = updates[0];
    if (recent_update) {
      l.find(".updatedAt").text($.timeago(new Date(recent_update.at)));
      l.find(".latest").append(formatMessage(recent_update.content));

      // other updates
      var ot = $("#templates .oneStatus");
      var other_container = l.find(".other");
      for (var i = 1; i < updates.length; i++) {
        var o = ot.clone();
        o.find(".updatedAt").text($.timeago(new Date(updates[i].at)));
        o.find(".content").append(formatMessage(updates[i].content));
        o.appendTo(other_container);
      }
    } else {
      l.find(".updatedAt").text('no recent update');
    }
  }

  function renderUsers(host, room, users) {
    function clickToUser() {
      var hashBits = location.hash.split("/");
      location.hash = "#show/" + hashBits[1] + "/" + hashBits[2] + "/" + $(this).attr("nick");
    }
    $(".userdisplay").empty();

    var lt = $("#templates .user");

    // switching to closure so cloned node doesn't get overwritten
    // asynchronously
    $(users).each(function(i, user) {
      // we clone and append the node here for predictable ordering
      var l = lt.clone();
      l.appendTo($(".userdisplay"));

      getUserUpdates(host, room, user.nick, 4, function(updates) {
        // render into the predefined DOM node
        renderOneUser(host, room, user.nick, updates, l, clickToUser);
      });
    });
  }

  function getUserUpdates(host, room, nick, last_n, cb) {
    console.log("getting updates");
    var path = "/api/updates/" +
      encodeURIComponent(host) + "/" +
      encodeURIComponent(room) + "/" +
      encodeURIComponent(nick);

    if (last_n)
      path+= "?last_n=" + last_n;

    $.ajax({
      url: path,
      dataType: "json",
      success: function(result) {
        cb(result.items);
      },
      error: function(jqXHR, textStatus, err) {
        showError("problem fetching logs for " + host + " #" + room + ": " + err);
      }
    });
  }

  function showError(str) {
    alert(str);
  }

  function browse(host, room, before) {
    $("body > div").hide();
    $("body > div#logview").show();
    $("#logview .header .currentHost").text(host);
    $("#logview .header .currentRoom").text("#" + room);
    if (typeof host !== 'string' || typeof room !== 'string') {
      location.hash = "";
      return;
    }
    var path = "/api/users/" +
      encodeURIComponent(host) + "/" +
      encodeURIComponent(room) +
      (typeof before === 'string' ? ("?before=" +  encodeURIComponent(before)) : "");

    showWaiting();
    $.ajax({
      url: path,
      dataType: "json",
      success: function(users) {
        renderUsers(host, room, users, true);
      },
      error: function(jqXHR, textStatus, err) {
        showError("problem fetching logs for " + host + " #" + room + ": " + err);
      }
    });
  }

  function show(host, room, nick) {
    $("body > div").hide();
    $("body > div#logview").show();
    $("#logview .header .currentHost").text(host);
    $("#logview .header .currentRoom").text("#" + room);
    if (typeof host !== 'string' || typeof room !== 'string') {
      location.hash = "";
      return;
    }

    $(".userdisplay").empty();
    getUserUpdates(host, room, nick, 20, function(updates) {
      var lt = $("#templates .user");
      var l = lt.clone();
      l.appendTo($(".userdisplay"));

      renderOneUser(host, room, nick, updates, l, null);
    });
  }

  function search(host, room, phrase, before) {
    $("body > div").hide();
    $("body > div#logview").show();
    $("#logview .header .currentHost").text(host);
    $("#logview .header .currentRoom").text("#" + room);
    if (typeof host !== 'string' || typeof room !== 'string') {
      location.hash = "";
      return;
    }
    var path = "/api/search/" +
      encodeURIComponent(host) + "/" +
      encodeURIComponent(room) + "/" +
      encodeURIComponent(phrase) +
      (typeof before === 'string' ? ("?before=" + before) : "");

    showWaiting();
    $.ajax({
      url: path,
      dataType: "json",
      success: function(data) {
        renderLogs(data, false);
        showLogs();
      },
      error: function(jqXHR, textStatus, err) {
        showError("problem fetching logs for " + host + " #" + room + ": " + err);
      }
    });
  }

  function mainPage() {
    $("body > div").hide();
    $("#homescreen").fadeIn(500);
    $.ajax({
      url: '/api/rooms',
      dataType: "json",
      success: function(data) {
        $(".roomlist").empty();

        // sort roomlist by latest comments
        data = data.sort(function(a,b) { return b.createdAt - a.createdAt; });

        for (var i = 0; i < data.length; i++) {
          console.log(data[i]);
          var rn = $("#templates tr.room").clone();
          var user_text;
          if (data[i].num_users == 0) {
            user_text = "no users";
          } else {
            if (data[i].num_users == 1)
              user_text = "1 user";
            else
              user_text = data[i].num_users + " users";
          }

          rn.find(".numUsers").text(user_text);
          rn.find(".host").text(data[i].host);
          rn.find(".room").text("#" + data[i].room);
          // rn.find(".activity").html('<a href="/dashboard#' + data[i].host + '/' + data[i].room + '">dashboard</a>');
          rn.click(function() {
            location.hash = "#browse/"
              + ($(this).find(".host").text()) + "/"
              + ($(this).find(".room").text().substr(1))
          });
          $(".roomlist").append(rn);
        }
      },
      error: function(jqXHR, textStatus, err) {
        showError("Error fetching room list: " + err);
      }
    });
  }

  function load() {
    var hash = $.trim(location.hash);
    var elems = hash.split('/');
    if (elems[0] === "" || elems[0] === "#home") {
      mainPage();
    } else {
      $("#github_ribbon").fadeOut(500);
      if (elems[0] === "#browse") {
        browse.apply(undefined, elems.slice(1));
      } else if (elems[0] === "#show") {
        show.apply(undefined, elems.slice(1));
      } else if (elems[0] === "#search") {
        search.apply(undefined, elems.slice(1));
      }
    }
  }
  $(window).hashchange(load);
  load();

  $("#logview .home").click(function() { location.hash = ""; });

  $("#logview .doSearch").click(function() {
    var hashBits = location.hash.split("/");
    var phrase = $.trim($("#logview .searchText").val());
    location.hash = "#search/" + hashBits[1] + "/" + hashBits[2] + "/" + phrase;
  });
  $('#logview .searchText').keypress(function(e){
    if(e.which == 13) {
      e.preventDefault();
      $('#logview .doSearch').click();
    }
  });
});
