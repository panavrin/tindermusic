// main code

  var performanceStarted = false;

  var arrayUniqueNicknames = new Array();
  var arrayTinderMusics = new Array();
  var arrayAvailables = new Array();
  var arrayUnavailables = new Array();

  var divUnavailables = null;
  var divAvailables = null;

  // load some variables after loading the page
  function load() {
    divAvailables = document.getElementById('availables');
    divUnavailables = document.getElementById('unavailables');

    // my_id is defined by pubnub
    var divUsername = document.getElementById('username');
    divUsername.appendChild(document.createTextNode("username: "+my_id));
  }

// PubNub code

  // get an unique pubnub id
  var my_id = PUBNUB.uuid();

  // initialize with Publish & Subscribe Keys
  var pubnub = PUBNUB.init({
    publish_key: 'demo',
    subscribe_key: 'demo',
    uuid: my_id
  });

  // subscribe to a channel
  pubnub.subscribe({
    channel: 'performer,audience',
    presence: performanceStatus,
    message: parseMessage,
    error: function (error) {
     // Handle error here
     console.log(JSON.stringify(error));
    }
  });

  // send the performance status
  function performanceStatus( message ) {
    var status = null;
    if (performanceStarted) {
      status = "started";
    } else {
      status = "stopped";
    }

    // if the method is called from presence callback
    if (typeof message.uuid !== 'undefined') {
      pubnub.publish({
            channel: message.uuid,
            message: {"type": "performance",
                      "status": status
            }
      });
    // if the method is called from other place
    } else {
      for (i = 0, i < arrayTinderMusics.length; i++) {
        pubnub.publish({
              channel: arrayTinderMusics[i].id,
              message: {"type": "performance",
                        "status": status
              }
        });
      }
    }

  }

  // parse messages received from PubNub platform
  function parseMessage( message ) {
    if (typeof message.type !== 'undefined') {

      switch(message.type) {
        case 'create':
          create(message.my_id, message.nickname);
          break;
        case 'update':
          update(message.index, message.tm);
          break;
        case 'next':
          next(message.index);
          break;
        case 'editing':
          editing(message.index);
          break;
        default:
          break;
      }
    } else {
      console.log(JSON.stringify(message))
    }
  }



// Controller

  // create a user if possible
  function create(user_id, user_nickname) {
    // if the nickname doesn't exist
    if ( arrayUniqueNicknames.indexOf(user_nickname) == -1 ) {
      var index = arrayUniqueNicknames.push(user_nickname) - 1; // push returns the length
      var tm = {
        'id' : user_id,
        'nickname' : user_nickname,
        'index' : index, // index at arrayUniqueNicknames will be the same in arrayTinderMusics (I hope!)
        'tm' : "", // tinder music
        'mode' : "editing", // modes: editing, following
        'status' : "unavailable", // status: unavailable, available
        'follow' : "",
        'followers' : []
      };
      arrayTinderMusics.push(tm);
      // add to view
      setAsUnavailable(index);

      pubnub.publish({
            channel: user_id,
            message: {"type": "create-response",
                      "res": "s",
                      "index": index
            }
      });
    // if the nickname already exists
    } else {
      pubnub.publish({
            channel: user_id,
            message: {"type": "create-response",
                      "res": "f"}
      });
    }
  }

  // update the tinder music and get the next user to follow (get the next?! always?!)
  function update(user_index, user_tm) {
    var user = arrayTinderMusics[user_index];

    // update the tinder music
    user.tm = user_tm;

    // set the user mode
    user.mode = "following";

    if (user.status == 'unavailable') {
      document.getElementById(user.index).className = 'unavailable';
    } else {
      document.getElementById(user.index).className = 'available';
    }

    suggested_index = get_next_user_to_follow(user_index);

    if ( typeof(user.follow) == 'number' ) {
      var ex_followed = user.follow;
      // unfollow the older
      var follower_id = arrayTinderMusics[ex_followed].followers.indexOf[user.index];
      if (follower_id != -1) {
        arrayTinderMusics[ex_followed].followers.splice(follower_id,1);
      }
      // TODO: update the number of followers on the screen
    }

    if ( suggested_index != -1 ) {
      var suggested = arrayTinderMusics[suggested_index];

      // follow
      user.follow = suggested_index;
      suggested.followers.push(user.index);
      // TODO: show the number of followers

      // response
      pubnub.publish({
            channel: user.id,
            message: {"type": "update-response",
                      "suggested_tm": {
                        "nickname" : suggested.nickname,
                        "index" : suggested.index,
                        "tm" : suggested.tm
                      }
            }
      });

    } else {
      // there is no user to follow
      user.follow = "";
      pubnub.publish({
            channel: user.id,
            message: {"type": "update-response",
                      "suggested_tm": ""
            }
      });
    }

  }

  // update the next user to follow
  function next(user_index) {
    var user = arrayTinderMusics[user_index];

    suggested_index = get_next_user_to_follow(user_index);

    if ( typeof(user.follow) == 'number' ) {
      var ex_followed = user.follow;
      // unfollow the older
      var follower_id = arrayTinderMusics[ex_followed].followers.indexOf[user.index];
      if (follower_id != -1) {
        arrayTinderMusics[ex_followed].followers.splice(follower_id,1);
      }
      // TODO: update the number of followers on the screen
    }

    if ( suggested_index != -1 ) {
      var suggested = arrayTinderMusics[suggested_index];

      // follow
      user.follow = suggested_index;
      suggested.followers.push(user.index);
      // TODO: update the number of followers on the screen

      // response
      pubnub.publish({
            channel: user.id,
            message: {"type": "next-response",
                      "suggested_tm": {
                        "nickname" : suggested.nickname,
                        "index" : suggested.index,
                        "tm" : suggested.tm
                      }
            }
      });

    } else {
      // there is no user to follow
      user.follow = "";
      pubnub.publish({
            channel: user.id,
            message: {"type": "next-response",
                      "suggested_tm": ""
            }
      });
    }
  }


  // return the index of the next user to follow
  // based on the index of the follower (not the index of the followed)
  function get_next_user_to_follow(user_index) {
    var user = arrayTinderMusics[user_index];

    var suggested_index = -1;

    if ( arrayAvailables.length > 0 ) {
      suggested_index = arrayTinderMusics[ arrayAvailables[0] ].index;

      if ( typeof(user.follow) == 'number' ) {
        var ex_followed = user.follow;
        // search the next one
        if ( arrayTinderMusics[ex_followed].status == 'available') {
          var possibleAvailable = arrayAvailables.indexOf(ex_followed) + 1;

          for ( i = possibleAvailable; i < arrayAvailables.length; i++ ) {
            if ( arrayTinderMusics[ arrayAvailables[i] ].mode != 'editing' ) {
              suggested_index = arrayTinderMusics[ arrayAvailables[i] ].index;
              break; // found!
            } // else try next one
          }
        } // else there is no one available, follow the first
      } // else the user is not following anybody, follow the first
    } // else there is no one to follow, return -1

    return suggested_index;
  }


  // when the user goes to edit mode
  // the performer change the mode and color
  // and inform to everybody
  function editing(user_index) {
    var user = arrayTinderMusics[user_index];

    // change mode
    user.mode = 'editing'

    // chande the color
    if (user.status == 'unavailable') {
      document.getElementById(user.index).className = 'unavailable-editing';
    } else {
      document.getElementById(user.index).className = 'available-editing';
    }

    // reponse with the latest tinder music
    pubnub.publish({
          channel: user.id,
          message: {"type": "editing-response",
                    "tm" : user.tm
          }
    });

    // inform the followers
    for ( i = 0; i < user.followers.length; i++) {
      pubnub.publish({
            channel: arrayTinderMusics[ user.followers[i] ].id,
            message: {"type": "user-editing"}
      });
    }
  }


  // View

  // set the tinder music as unavailable
  function setAsUnavailable(index) {
    var user = arrayTinderMusics[index];

    if ( user.status == 'available' ) {
      user.status = 'unavailable';
      for ( i = 0; i < user.followers.length; i++) {
        pubnub.publish({
              channel: arrayTinderMusics[ user.followers[i] ].id,
              message: {"type": "user-unavailable"}
        });
      }
    } else if ( user.status == 'unavailable') {
      // run something if the user is new?!
    }

    var newDiv = document.createElement('div');
    newDiv.id = index;
    if ( user.mode != 'editing') {
      newDiv.className = 'unavailable';
    } else {
      newDiv.className = 'unavailable-editing';
    }
    newDiv.appendChild(document.createTextNode(user.nickname));
    // onclick set as available
    newDiv.onclick = function() {
      // the user can go to available mode only when it is playing, yeah?!
      if (arrayTinderMusics[index].mode != 'editing') {
        var actualIndex = arrayUnavailables.indexOf(index);
        if (actualIndex != -1) {
          arrayUnavailables.splice(actualIndex,1);
        }
        divUnavailables.removeChild(this);
        setAsAvailable(index);
      }
    }

    arrayUnavailables.push(index);
    divUnavailables.appendChild(newDiv);
  }

  // set the tinder music as available
  function setAsAvailable(index) {
    var user = arrayTinderMusics[index];

    user.status = 'available';

    var newDiv = document.createElement('div');
    newDiv.id = index;
    if (user.mode != 'editing') {
      newDiv.className = 'available';
    } else {
      newDiv.className = 'available-editing';
    }
    newDiv.appendChild(document.createTextNode(user.nickname));
    // onclick, set as Unavailable
    newDiv.onclick = function() {
      var actualIndex = arrayAvailables.indexOf(index);
      if (actualIndex != -1) {
        arrayAvailables.splice(actualIndex,1);
      }
      divAvailables.removeChild(this);
      setAsUnavailable(index);
    }

    arrayAvailables.push(index);
    divAvailables.appendChild(newDiv);
  }
