// Main Code

  var arrayUnselectedDivs = new Array();
  var arraySelectedDivs = new Array();

  var divUsername = null;
  var divUnselecteds = null;
  var divSelecteds = null;

  // load some variables after loading the page
  function loadGlobalVariables() {
    divUsername = document.getElementById('username');
    divUnselecteds = document.getElementById('unselecteds');
    divSelecteds = document.getElementById('selecteds');

    // my_id is defined by pubnub for now, but we need to improve
    divUsername.appendChild(document.createTextNode("username: "+my_id));
  }

  // remove a div from divSelecteds and add to divUnselecteds
  function setAsUnselected(divObject) {

    divSelecteds.removeChild(divObject);
    divUnselecteds.appendChild(divObject);

    divObject.className = 'unselected';
    divObject.onclick = function() {
      setAsSelected(this);
    };

    arraySelectedDivs.splice(divObject.id,1);
    for (i = divObject.id; i < arraySelectedDivs.length; i++) {
      arraySelectedDivs[i].id = i;
    }

    divObject.id = arrayUnselectedDivs.length;
    arrayUnselectedDivs.push(divObject);

  }

  // remove a div from divUnselecteds and add to divSelecteds
  function setAsSelected(divObject) {

    divUnselecteds.removeChild(divObject);
    divSelecteds.insertBefore(divObject, divSelecteds.firstChild);

    divObject.className = 'selected';
    divObject.onclick = function() {
      setAsUnselected(this);
    };

    arrayUnselectedDivs.splice(divObject.id,1);
    for (i = divObject.id; i < arrayUnselectedDivs.length; i++) {
      arrayUnselectedDivs[i].id = i;
    }

    divObject.id = 0;
    arraySelectedDivs.unshift(divObject);
    for (i = 1; i < arraySelectedDivs.length; i++) {
      arraySelectedDivs[i].id = i;
    }
  }

  // add a new object to divUnselecteds
  // a random number is used as name when no argument is provided.
  function addNewUnselected(name) {
    if (!name) {
      name = Math.random();
    }

    var newDiv = document.createElement('div');
    newDiv.name = name;
    newDiv.className = 'unselected';
    newDiv.appendChild(document.createTextNode(name));
    newDiv.onclick = function() {
      setAsSelected(this);
    }
    newDiv.id = arrayUnselectedDivs.length;
    arrayUnselectedDivs.push(newDiv);
    divUnselecteds.appendChild(newDiv);
  }

// PubNub Code

  // Get an unique pubnub id
  var my_id = PUBNUB.uuid();

  // Initialize with Publish & Subscribe Keys
  var pubnub = PUBNUB.init({
      publish_key: 'demo',
      subscribe_key: 'demo',
      uuid: my_id
  });

  // Subscribe to a channel
  pubnub.subscribe({
      channel: 'performer',
      presence: function(m){console.log(m)},
      message: parseMessage,
      error: function (error) {
       // Handle error here
       console.log(JSON.stringify(error));
      }
  });

  // Parse messages received from PubNub platform
  function parseMessage( message ) {
      if (typeof message.nextToDivName !== 'undefined') {
        getNextDivName(message.user, message.nextToDivName);
      } else {
        console.log(JSON.stringify(message))
      }
  }

  // Return the name of the next div
  function getNextDivName(user, oldDivName) {
      var nextDivName = null;

      for (i = 0; i < arraySelectedDivs.length; i++) {
        if ( arraySelectedDivs[i].name == oldDivName) {
          if ( i == arraySelectedDivs.length-1) {
            nextDivName = arraySelectedDivs[0].name;
          } else {
            nextDivName = arraySelectedDivs[i+1].name;
          }
          break;
        }
      }

      if (!nextDivName) {
        if (arraySelectedDivs.length > 0) {
          nextDivName = arraySelectedDivs[0].name;
        } else {
          nextDivName = "NoNaMe";
        }
      }
      pubnub.publish({
            channel: user,
            message: {"nextDivName": nextDivName}
      });
  }
