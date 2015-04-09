// main code

  var arrayUniqueNicknames = new Array();
  var arrayPaths = new Array();
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
        var path = {
          'id' : user_id,
          'nickname' : user_nickname,
          'path' : ""
        };
        arrayPaths.push(path);

        pubnub.publish({
              channel: user_id,
              message: {"type": "create-response", "res": "s", "index": index}
        });
      } else {
        pubnub.publish({
              channel: user_id,
              message: {"type": "create-response", "res": "f"}
        });
      }
  }
