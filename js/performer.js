// main code

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
    channel: 'performer',
    presence: function(m){console.log(m)},
    message: parseMessage,
    error: function (error) {
     // Handle error here
     console.log(JSON.stringify(error));
    }
  });

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
        default:
          break;
      }
    } else {
      console.log(JSON.stringify(message))
    }
  }

  // create a user if possible
  function create(user_id, user_nickname) {
    if ( arrayUniqueNicknames.indexOf(user_nickname) == -1 ) {
      var index = arrayUniqueNicknames.push(user_nickname) - 1;
      var tm = {
        'id' : user_id,
        'nickname' : user_nickname,
        'index' : index,
        'tm' : "",
        'mode' : "editing",
        'status' : "unavailable",
        'follow' : "",
        'followers' : []
      };
      arrayTinderMusics.push(tm);
      setAsUnavailable(index);

      pubnub.publish({
            channel: user_id,
            message: {"type": "create-response",
                      "res": "s",
                      "index": index
            }
      });
    } else {
      pubnub.publish({
            channel: user_id,
            message: {"type": "create-response",
                      "res": "f"}
      });
    }
  }

  function update(user_index, user_tm) {
    var user = arrayTinderMusics[user_index];
    user.tm = user_tm;
    user.mode = "following";

    var suggested_index =  -1;
    if ( arrayAvailables.length > 0) {
      if ( user.follow == "" ) {
            suggested_index = 0;
      } else {
        var ex_followed = user.follow;

        // unfollow
        follower_id = arrayTinderMusics[ex_followed].followers.indexOf[user.id];
        if (follower_id > -1) {
          arrayTinderMusics[ex_followed].followers.splice(user.id,1);
        }
        // TODO: show the number of followers

        if ( arrayTinderMusics[ex_followed].status == 'available') {
          if (arrayAvailables.indexOf(ex_followed) < (arrayAvailables.length-1)) {
            suggested_index = ex_followed + 1;
          } else {
            suggested_index = 0;
          }
        } else {
          suggested_index = 0;
        }
      }

      // follow
      user.follow = suggested_index;
      arrayTinderMusics[suggested_index].followers.push(user.id);
      // TODO: show the number of followers

      // response
      var suggested = arrayTinderMusics[arrayAvailables[suggested_index]];
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

  // View

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
    newDiv.className = 'unavailable';
    newDiv.appendChild(document.createTextNode(arrayTinderMusics[index].nickname));
    newDiv.onclick = function() {
      divUnavailables.removeChild(this);
      setAsAvailable(index);
    }

    arrayUnavailables.push(index);
    divUnavailables.appendChild(newDiv);
  }

  function setAsAvailable(index) {

  }
