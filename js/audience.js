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
  
/* $('#initial-message').bPopup({
    modalClose: false,
    opacity: 0.7,
    positionStyle: 'absolute',
  //  position: [50%, 20], 
    escClose :false
  });
*/

  var context;
  // this is moved here to support iOS : http://stackoverflow.com/questions/12517000/no-sound-on-ios-6-web-audio-api

  try {
    // still needed for Safari
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    // create an AudioContext
    context = new AudioContext();

    alert('Web Audio API supported.');
  } catch(e) {
    // API not supported
    alert('Web Audio API not supported.');
  }

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

    $('#initial-message').bPopup().close();

    var osc = context.createOscillator();
    osc.connect(context.destination);
    
    osc.start(0);
  });
  
  function detectHit(x1,y1,x2,y2,w,h) {
    //Very simple detection here
    if(x2-x1>w) return false;
    if(y2-y1>h) return false;
    return true;
  }

  function draw() {
    canvas = $("#patternCanvas")[0];
    var ctx = canvas.getContext('2d');
 
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
 
    ctx.fillStyle = 'blue';
 
    // Draw our object in its new position
    ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  }

  function touchHandler(){
    //Assume only one touch/only process one touch even if there's more
    var touch = event.targetTouches[0];
    //var touch = event

    // Is touch close enough to our object?
    if(detectHit(obj.x, obj.y, touch.pageX, touch.pageY, obj.w, obj.h)) {
      // Assign new coordinates to our object
      obj.x = touch.pageX;
      obj.y = touch.pageY;

      // Redraw the canvas
      draw();
    }
    event.preventDefault();
  } 

  function init() {
 
    // Initialise our object
    obj = {x:50, y:50, w:70, h:70};
    canvas = $("#patternCanvas")[0];
 
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
 
    // Add eventlistener to canvas
    canvas.addEventListener('touchmove',touchHandler, false);
    draw();
  }
  init();
});