//alert("test");

// PubNub code
// Get an unique pubnub id
var state = "NAME"; // it is either NAME, EDIT, PLAY

function Note(size){
  this.size = size;
  this.x = 0;
  this.y = 0;
}

function dist(x1,y1,x2,y2){
  return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2));
}

function drawCircle(ctx, x,y,r) {
    ctx.beginPath();
    ctx.arc(x,y,r, 0, Math.PI * 2);
    ctx.fill();
}

function drawLine(ctx, x1,y1,x2,y2) {
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
}

Note.prototype.setPosition = function(x,y){
  this.x = x;
  this.y = y;
}

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
  var pattern = [];
  var patternSize = 4;

 


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
    osc.stop(context.currentTime+1);
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
 
    for (var i=0; i< patternSize; i++){
    //  ctx.fillRect(pattern[i].x, pattern[i].y, pattern[i].size, pattern[i].size);
      drawLine(ctx,pattern[i].x, pattern[i].y, pattern[(i+1)%4].x, pattern[(i+1)%4].y)
      drawCircle(ctx,pattern[i].x, pattern[i].y, pattern[i].size );
   //   ctx.fill
    }


    // Draw our object in its new position
  }

  function touchHandler(){
    //Assume only one touch/only process one touch even if there's more
/*    var e = event.targetTouches[0];
    //var touch = event
    // Is touch close enough to our object?
    selectedNote=-1;
    var minDistance = 100000;
    var tempNoteID = -1;
    for (var i=0; i< patternSize; i++){
      var distance = dist(e.pageX, e.pageY, pattern[i].x, pattern[i].y);
      if ( minDistance >= distance){
        minDistance = distance;
        tempNoteID = i;
      }
    }

    if(tempNoteID > -1 && minDistance < pattern[tempNoteID].size) {
      selectedNote = tempNoteID;
    }
*/
    //var touch = event
    if ( selectedNote <0 )
      return;
    // Is touch close enough to our object?
  
    // Assign new coordinates to our object
    pattern[selectedNote].x = e.pageX -  pattern[selectedNote].size/2;
    pattern[selectedNote].y = e.pageY -  pattern[selectedNote].size/2;

    // Redraw the canvas
    draw();
    event.preventDefault();
  } 

  function mouseHandler(e){
    //Assume only one touch/only process one touch even if there's more
    //var touch = event
    if ( selectedNote <0 )
      return;
    // Is touch close enough to our object?
  
    // Assign new coordinates to our object
    pattern[selectedNote].x = e.pageX -  pattern[selectedNote].size/2;
    pattern[selectedNote].y = e.pageY -  pattern[selectedNote].size/2;

    // Redraw the canvas
    draw();
  
    event.preventDefault();
  } 

  var leftButtonDown = false;
  var selectedNote = -1
  $(document).mousedown(function(e){
    // Left mouse button was pressed, set flag
    var minDistance = 100000;
    var tempNoteID = -1;
    for (var i=0; i< patternSize; i++){
      var distance = dist(e.pageX, e.pageY, pattern[i].x, pattern[i].y);
      if ( minDistance >= distance){
        minDistance = distance;
        tempNoteID = i;
      }
    }
    if(tempNoteID > -1 && minDistance < pattern[tempNoteID].size) {
      selectedNote = tempNoteID;
    }
  });

  $(document).bind('touchstart',function(event){
    // Left mouse button was pressed, set flag
    var minDistance = 100000;
    var tempNoteID = -1;
    var e = event.originalEvent.changedTouches[0];

    for (var i=0; i< patternSize; i++){
      var distance = dist(e.pageX, e.pageY, pattern[i].x, pattern[i].y);
      if ( minDistance >= distance){
        minDistance = distance;
        tempNoteID = i;
      }
    }
    
    if(tempNoteID > -1 && minDistance < pattern[tempNoteID].size) {
      selectedNote = tempNoteID;
    }
  });

  $(document).bind('touchend',function(event){
      selectedNote = -1;
  });

  $(document).mouseup(function(e){
    // Left mouse button was released, clear flag
    selectedNote = -1;
  });
 
  function init() {

    // Initialise our object
   // obj = {x:50, y:50, w:70, h:70};
    canvas = $("#patternCanvas")[0];
 
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (var i=0; i< patternSize; i++){
      var note = new Note(window.innerWidth / 24);
      note.setPosition(window.innerWidth * Math.random(), window.innerHeight * Math.random())
      pattern[i] = note;
    }
 
    // Add eventlistener to canvas
    canvas.addEventListener('touchmove',touchHandler, false);
    canvas.addEventListener('mousemove', mouseHandler, false);
   
    draw();
  }
  init();
});