'use strict'

$(document).ready(function() {
  console.log('starting validation');
  var links = $('a');
  var badLinks = [];
  var emptyLinks = [];

  for (var i = 0; i < links.length; i++) {
    console.log('validating ' + links[i])
    var target = $(links[i]).prop('href');
    target = target.substr(target.indexOf('#'), target.length);

    if(target.length == 0 || target == '#')
      emptyLinks.push(target);
    else if(target.length > 1 && $(target).length != 1)
      badLinks.push(target);
  }

  var message = 'Validated ' + links.length + ' links and found ' + badLinks.length + ' bad links and ' + emptyLinks.length + ' empty links.';

  if(badLinks.length > 0) {
    message += '\nbad Links are:';

    for(var i = 0; i < badLinks.length; i++) {
        message += '\n' + badLinks[i];
    }
  }

  if(emptyLinks.length > 0) {
    message += '\nempty Links are:';

    for(var i = 0; i < emptyLinks.length; i++) {
        message += '\n' + emptyLinks[i];
    }
  }

  alert(message);
});
