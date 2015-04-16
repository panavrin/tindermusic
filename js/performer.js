// main code
window.onbeforeunload = function(){
  return "";
};

var DEBUG = false;
  var performanceStarted = false;

  var indexMostLiked = -1;
  var likesMostLiked = 0;
  var indexMostFollowed = -1;
  var followersMostFollowed = 0;
  var borderMostLiked = 50;
  var borderMostFollowed = 40;

  var arrayUniqueNicknames = new Array();
  var arrayTinderMusics = new Array();
  var arrayAvailables = new Array();
  var arrayUnavailables = new Array();
  var arrayWaitingPeople = new Array();;
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
    publish_key: 'pub-c-412a79a5-d513-484f-82be-84a8994a8725',
    subscribe_key: 'sub-c-544dbc6e-df22-11e4-8fb9-0619f8945a4f',
    uuid: my_id
  });

  // subscribe to a channel
  pubnub.subscribe({

    channel: 'snaglee_performer,audience',
    presence: performanceStatus,
    message: parseMessage,
    error: function (error) {
     // Handle error here
     console.log("error:" + JSON.stringify(error));
    },
    heartbeat: 15

  });


  function publishMessage(channel, options){
    pubnub.publish({
      channel: channel,
      message: options
    });

    if(DEBUG)console.log("sent a message to channel ("+channel+") : " + JSON.stringify(options));
  }

  // send the performance status
  function performanceStatus( message ) {

    // if the method is called from presence callback
    if (typeof message.uuid !== 'undefined') {
        publishMessage(message.uuid,{"type": "performance",
                      "status": performanceStarted
            } );
    // if the method is called from other place
    } else {
      performanceStarted = !performanceStarted;
      for (i = 0; i < arrayTinderMusics.length; i++) {
        publishMessage(arrayTinderMusics[i].id,
          {"type": "performance",
                        "status": performanceStarted
          });
      }
    }

  }

  // parse messages received from PubNub platform
  function parseMessage( message ) {
    if(DEBUG)console.log("message - received:" + JSON.stringify(message));
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
        case 'whereami':
          inform(message.index);
          break;
        case 'liked':
          liked(message.index, message.likedindex); // keep track of likes for each individual.
          break;
        default:
          break;
      }
    } else {
      console.log("unknown type of message received : " + JSON.stringify(message))
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
        'followers' : [],
        'likes': new Array(),
        'likedby': new Array()
      };
      arrayTinderMusics.push(tm);
      // add to view
      setAsUnavailable(index);
      publishMessage(user_id, {"type": "create-response",
                      "res": "s",
                      "index": index
            });
    // if the nickname already exists
    } else {
      publishMessage(user_id, {"type": "create-response",
                      "res": "f"});
    }
  }

  function liked(user_index, liked_index){

    // A likes B's tune
    var user = arrayTinderMusics[liked_index]; // this is B
    var user2 = arrayTinderMusics[user_index]; // this is A

    if ( user.likedby.indexOf(user_index) == -1){ //  if B was not liked by A so far
      user.likedby.push(user_index);
      // notify B that A likes you
      publishMessage(user.id, {"type" : "liked-response", "nickname": user2.nickname, "index":user2.index})
    }

    if ( user2.likes.indexOf(liked_index) == -1){ // if  A did not liked B in the past
      user2.likes.push(liked_index);
      if (user.likes.indexOf(user_index) != -1 && user_index != liked_index) // B has liked A, too!!
      {
        // notify A
        publishMessage(user2.id, {"type" : "liked-response", "nickname": user.nickname, "index":user.index})
      }
    }

    // update screen with the most liked
    if (user.likedby.length > likesMostLiked ) {
      /*
      var oldDivMostLiked = document.getElementById(indexMostLiked);
      if (indexMostLiked == indexMostFollowed && indexMostLiked >=0) { // the old most liked can be the most followed
        oldDivMostLiked.style.border = borderMostFollowed+"px pink double";
      } else {
        if ( indexMostLiked >=0)
          oldDivMostLiked.style.border = arrayTinderMusics[indexMostLiked].followers.length+"px grey solid";
      }
      */

      indexMostLiked = user.index;
      likesMostLiked = user.likedby.length;
      console.log("most liekd one: " + user.nickname);
      // this is the most liked now. 
      //var divMostLiked = document.getElementById(indexMostLiked);
      //divMostLiked.style.border = borderMostLiked+"% pink groove";
    }

  }

  // update the tinder music and get the next user to follow (get the next?! always?!)
  function inform(user_index){
    var user = arrayTinderMusics[user_index];
    if ( typeof(user.follow) == 'number' ) { // I was in a pattern
      var followed = user.follow;

      if (arrayAvailables.indexOf(followed) == -1) {
          next(user.index)
      }
      else {
        var suggested = arrayTinderMusics[followed];
        publishMessage(user.id,
          {"type": "next-response",
            "suggested_tm": {
                        "nickname" : suggested.nickname,
                        "index" : suggested.index,
                        "tm" : suggested.tm
                      }
                    });
      }
      // TODO: update the number of followers on the screen
    }
    else{
      next(user.index);
    }
  }

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


    if ( typeof(user.follow) == 'number' ) { // I was in a pattern
      var followed = user.follow;

      if (arrayAvailables.indexOf(followed) == -1) {
          next(user.index)
      }
      else {
        var suggested = arrayTinderMusics[followed];
        publishMessage(user.id,
          {"type": "next-response",
            "suggested_tm": {
                        "nickname" : suggested.nickname,
                         "index" : suggested.index,

                        "tm" : suggested.tm
                      }
                    });
      }
      // TODO: update the number of followers on the screen
    }
    else{
      next(user.index);
    }
  }

  // update the next user to follow
  function next(user_index) {
    var user = arrayTinderMusics[user_index];

    suggested_index = get_next_user_to_follow(user_index);

    if ( typeof(user.follow) == 'number' ) {
      var ex_followed = arrayTinderMusics[user.follow];
      // unfollow the older
      var follower_index = ex_followed.followers.indexOf[user.index];
      if (follower_index != -1) {
        ex_followed.followers.splice(follower_index,1);
      }
      // TODO: update the number of followers on the screen

      if (ex_followed.index == indexMostFollowed) {
        followersMostFollowed = followersMostFollowed - 1;
      } /*else if (ex_followed.index != indexMostLiked) { 
      // we cant change the most liked style here
        var divExFollowed = document.getElementById(ex_followed.index);
        divExFollowed.style.border = ex_followed.followers.length+"px grey solid";
      }*/
    }

    if ( suggested_index != -1 ) {
      var suggested = arrayTinderMusics[suggested_index];

      // follow
      user.follow = suggested_index;
      suggested.followers.push(user.index);
      // TODO: update the number of followers on the screen
      // if it is the most followed now
      if (suggested.followers.length > followersMostFollowed) {
        // updating the old most followed
       /* if (indexMostFollowed != indexMostLiked && indexMostFollowed >=0) { 
        // we cant change the style of the most liked here
          var divOldMostFollowed = document.getElementById(indexMostFollowed);
          divOldMostFollowed.style.border = suggested.followers.length+"px grey solid";
        }
        */

        indexMostFollowed = suggested.index;
        followersMostFollowed = suggested.followers.length;
        console.log("Most Followed one : " + suggested.nickname);
        // updating the new one
       /* if (indexMostFollowed != indexMostLiked && indexMostFollowed >=0) { 
        // we cant change the style of the most liked here
          var divMostFollowed = document.getElementById(indexMostFollowed);
          divMostFollowed.style.border = borderMostFollowed+"px pink double";
        }*/
      } /*else if (suggested.index != indexMostLiked) {
          var divFollowed = document.getElementById(suggested.index);
          divFollowed.style.border = suggested.followers.length+"px grey solid";
      }*/

      // response
      publishMessage(user.id, {"type": "next-response",
                      "suggested_tm": {
                        "nickname" : suggested.nickname,
                        "index" : suggested.index,
                        "tm" : suggested.tm
                      }
                    });

    } else {
      // there is no user to follow
   /*   user.follow = "";
      publishMessage(user.id, {"type": "next-response",
                      "suggested_tm": ""
            });
     */
      // keep track of waiting people
      arrayWaitingPeople.push(user.index);


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
          var possible = arrayAvailables.indexOf(ex_followed) + 1;
          if (possible < arrayAvailables.length) {
            suggested_index = arrayTinderMusics[ arrayAvailables[possible] ].index;
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
    publishMessage(user.id, {"type": "editing-response",
                    "tm" : user.tm
          });


    // inform the followers
    for ( i = 0; i < user.followers.length; i++) {
      publishMessage(arrayTinderMusics[ user.followers[i] ].id,
        {"type": "user-editing"});

    }
  }


  // View

  // set the tinder music as unavailable
  function setAsUnavailable(index) {
    var user = arrayTinderMusics[index];

    if ( user.status == 'available' ) {
      user.status = 'unavailable';
      for ( i = 0; i < user.followers.length; i++) {
        publishMessage(arrayTinderMusics[ user.followers[i] ].id,
        {"type": "user-unavailable"});
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

    if ( arrayWaitingPeople.length > 0){
      for(var i=0; i< arrayWaitingPeople.length; i++){
        next(arrayWaitingPeople[i]);
      }
      arrayWaitingPeople = new Array();
    }
  }
