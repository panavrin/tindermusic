//alert("test");

// PubNub code
// Get an unique pubnub id
var state = "NAME"; // it is either NAME, EDIT, PLAY

//This segment displays the validation rule for address field.
function textAlphanumeric(inputtext){
  var alphaExp = /^[0-9a-zA-Z._]+$/;
  if(inputtext.match(alphaExp)){
    return true;
  }else{
    return false;
  }
}

var my_id = PUBNUB.uuid();

// Initialize with Publish & Subscribe Keys
var pubnub = PUBNUB.init({
    publish_key: 'demo',
    subscribe_key: 'demo',
    uuid: my_id
});

// Subscribe to a channel
pubnub.subscribe({
    channel: my_id,
    message: parseMessage,
    error: function (error) {
     // Handle error here
     console.log(JSON.stringify(error));
    }
});


function parseMessage( message ) {
    console.log("message - received:" + JSON.stringify(message));
    if (typeof message.nextDivName !== 'undefined') {
      setNextDivName(message.nextDivName);
    } 
    else if (typeof message.type !== 'undefined'){
      if ( message.type == "create-respond"){
        if (message.result == "s"){ 
          state = "EDIT"; 
          $('#initial-message').bPopup().close();  
        }
        else
        {
          $('#name_error_msg').text($('#screenname').val() + " is already taken.");
        }
      }
    }
    else {
      console.log(JSON.stringify(message));
    }
}

  // Request the next div
  function getNextDivName() {
      var actualTindered =  document.getElementById('tindered');
      var actualDivName = actualTindered.textContent;
      pubnub.publish({
        channel: "performer",
        message: {"nextToDivName": actualDivName, "user": my_id}
      });
  }

  function publishMessage(channel, options){
    pubnub.publish({
            channel: channel,
            message: options
    });
  }

  // Set the name of the next div
  function setNextDivName(divName) {
      var actualTindered =  document.getElementById('tindered');
      actualTindered.innerHTML = "";
      actualTindered.appendChild(document.createTextNode(divName));
  }


$(document).ready(function () {

  // Parse messages received from PubNub platform
  
  $('#initial-message').bPopup({
    modalClose: false,
    opacity: 0.7,
  //  positionStyle: 'fixed',
  //  position: [50%, 20], 
    escClose :false
  });

  $("#start").button().css({ margin:'5px'}).click(function(){
      $("#name_error_msg").text("");

    var strScreenName = $("#screenname").val();
    if ( strScreenName.length > 12) {
      $("#name_error_msg").text("screen name is too long");
      return;
    }

    if ( textAlphanumeric(strScreenName) == false ) {
      $("#name_error_msg").text("Please, use combination of alphabets and numbers for the screen name. ");
      return;
    }

    publishMessage("performer", {"type":"create", "my_id":my_id, "nickname": strScreenName});

    $("#name_error_msg").text("Waiting for response...");

    // $('#initial-message').bPopup().close();
  });


});