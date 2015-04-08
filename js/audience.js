//alert("test");

// PubNub code
// Get an unique pubnub id
var state = "NAME"; // it is either NAME, EDIT, PLAY

window.requestAnimFrame = (function(){
return  window.requestAnimationFrame       || 
  window.webkitRequestAnimationFrame || 
  window.mozRequestAnimationFrame    || 
  window.oRequestAnimationFrame      || 
  window.msRequestAnimationFrame     || 
  function( callback ){
  window.setTimeout(callback, 1000 / 60);
};
})();

var pentatonicScale = [0,2,4,7,9];

function Note(size){
  this.size = size;
  this.x = 0;
  this.y = 0;
  this.distance = 0;
}

Note.prototype.setPosition = function(x,y){
  this.x = x;
  this.y = y;
    
}

function dist(x1,y1,x2,y2){
  return Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2));
}

function drawCircle(ctx, x,y,r, color) {
    ctx.beginPath();
    ctx.fillStyle = color || '#000000';
    ctx.arc(x,y,r, 0, Math.PI * 2);
    ctx.fill();
}

function drawLine(ctx, x1,y1,x2,y2, color) {
    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.lineWidth = 10;
    ctx.strokeStyle = color || '#00FF00';
    ctx.stroke();
}

function detectHit(x1,y1,x2,y2,w,h) {
  //Very simple detection here
  if(x2-x1>w) return false;
  if(y2-y1>h) return false;
  return true;
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

window.onbeforeunload = function(){
  return "";
};


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
  var patternSize = 5;

  var context;
  // this is moved here to support iOS : http://stackoverflow.com/questions/12517000/no-sound-on-ios-6-web-audio-api

  try {
    // still needed for Safari
    //window.AudioContext = window.AudioContext || window.webkitAudioContext;
    // create an AudioContext
    context = WX._ctx
   // alert('Web Audio API supported.');

  } catch(e) {
    // API not supported
    alert('Web Audio API not supported, please use most recent Chrome (41+), FireFox(31+) or Safari (iOS 7.1+).');
  }

  var fmk = WX.FMK1();


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

    /*var delay = WX.StereoDelay({
    mix: 1.0,
    delayTimeLeft: 0.5,
    delayTimeRight: 0.75,
    feedbackLeft: 0.2,
    feedbackRight: 0.4,
    crosstalk: 0.25
    }),*/
    var converb = WX.ConVerb({
    mix: 1.0,
    output: 0.5
    }), 
    compressor = context.createDynamicsCompressor()
    , masterGain = context.createGain();

    masterGain.gain.value = 1.0;

    converb.loadClip({
      name: 'BigEmptyChurch',
      url: './sound/960-BigEmptyChurch.mp3'
    });

    //fmk.to(compressor);
    fmk.to(converb).to(compressor);

    masterGain.connect(context.destination);
    compressor.connect(masterGain);
    
  });
  
  var playBarNote = -1;
  var intervalBetweenPattern = 1;
  var interval = intervalBetweenPattern;
  var progress = 0;
  var lastPingTime = context.currentTime;
  var speed = 300; // 300 pixel per second; 

  function init() {
    // Initialise our object
   // obj = {x:50, y:50, w:70, h:70};
    canvas = $("#patternCanvas")[0];
 
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (var i=0; i< patternSize; i++){
      var note = new Note(Math.min(window.innerWidth, window.innerHeight) / 12);
      note.setPosition(window.innerWidth * Math.random(), window.innerHeight * Math.random())
      pattern[i] = note;
    }

    for (var i=0; i< patternSize-1; i++){
      pattern[i].distance = dist(pattern[i].x,pattern[i].y,pattern[i+1].x,pattern[i+1].y);
    }
    // Add eventlistener to canvas
    canvas.addEventListener('touchmove',touchHandler, false);
    canvas.addEventListener('mousemove', mouseHandler, false);
   
    draw();
  }

  init();


  function draw() {
    canvas = $("#patternCanvas")[0];
    var ctx = canvas.getContext('2d');
 
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
 
    for (var i=0; i< patternSize; i++){
    //  ctx.fillRect(pattern[i].x, pattern[i].y, pattern[i].size, pattern[i].size);
      drawCircle(ctx,pattern[i].x, pattern[i].y, pattern[i].size, '#CB59FF' );
      if ( i < patternSize-1)
        drawLine(ctx,pattern[i].x, pattern[i].y, pattern[i+1].x, pattern[i+1].y, '#7C339E');
      drawCircle(ctx,pattern[i].x, pattern[i].y, pattern[i].size/3, '#7C339E' );
    }

    if (playBarNote >= 0){
      var playBarCircleX = pattern[playBarNote].x * (1-progress) + pattern[playBarNote+1].x * (progress);
      var playBarCircleY = pattern[playBarNote].y * (1-progress) + pattern[playBarNote+1].y * (progress);
      drawCircle(ctx,playBarCircleX, playBarCircleY, pattern[playBarNote].size/2 , '#CBFF59' );
   }
    // Draw our object in its new position
  }

  var animate = function() {
    window.requestAnimFrame(animate);
    var currentTime = context.currentTime;

    if (playBarNote < 0 && lastPingTime  + interval > currentTime)
      return;
    else if (playBarNote < 0 && lastPingTime + interval <= currentTime){
      playBarNote++;
      lastPingTime = currentTime;
      interval = pattern[playBarNote].distance / speed;
      fmk.noteOn(60, 127, context.currentTime);
      fmk.noteOff(60,0,context.currentTime + 1);
      
  //    console.log("begin! (" + pattern[playBarNote].distance + "," + interval);
    }

    progress = (currentTime - lastPingTime ) / interval;
    if (progress >=1){
      playBarNote++;
      progress = 0;
      lastPingTime = currentTime;
      fmk.noteOn(60 + pentatonicScale[playBarNote], 127, context.currentTime);
      fmk.noteOff(60 + pentatonicScale[playBarNote],0,context.currentTime + 1);
      
      if (playBarNote == patternSize-1)
      {
        interval = intervalBetweenPattern;
        playBarNote = -1;
    //    console.log("end! (" + playBarNote + "," + interval);
      }else{
        interval = pattern[playBarNote].distance / speed;
  //      console.log("next! (" + pattern[playBarNote].distance + "," + interval);
      }
    }

    draw(); 

//    requestAnimationFrame(animate, renderer.domElement);
  };

  animate();

  function touchHandler(){
    //Assume only one touch/only process one touch even if there's more
    var e = event.targetTouches[0];
    //var touch = event
    if ( selectedNote <0 )
      return;
    // Is touch close enough to our object?
  
    // Assign new coordinates to our object
    pattern[selectedNote].setPosition(e.pageX -  pattern[selectedNote].size/2
        ,e.pageY -  pattern[selectedNote].size/2);
    pattern[selectedNote].distance = dist(pattern[selectedNote].x, pattern[selectedNote].y,
      pattern[(1+selectedNote)%patternSize].x, pattern[(1+selectedNote)%patternSize].y);
    if ( selectedNote > 0)
      pattern[selectedNote-1].distance = dist(pattern[selectedNote].x, pattern[selectedNote].y,
      pattern[selectedNote-1].x, pattern[selectedNote-1].y);

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
    pattern[selectedNote].setPosition(e.pageX -  pattern[selectedNote].size/2
        ,e.pageY -  pattern[selectedNote].size/2);
    pattern[selectedNote].distance = dist(pattern[selectedNote].x, pattern[selectedNote].y,
      pattern[(1+selectedNote)%patternSize].x, pattern[(1+selectedNote)%patternSize].y);
    if ( selectedNote > 0)
      pattern[selectedNote-1].distance = dist(pattern[selectedNote].x, pattern[selectedNote].y,
      pattern[selectedNote-1].x, pattern[selectedNote-1].y);

    // Redraw the canvas
    draw();
  
    event.preventDefault();
  } 

  var leftButtonDown = false;
  var selectedNote = -1;

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

});