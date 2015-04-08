//alert("test");

// PubNub code
// Get an unique pubnub id
var state = "NAME"; // it is either NAME, EDIT, PLAY
var soundEnabled = true;
var context;
var compressor;
var reverb;

function BufferLoader(context, urlList, callback) {
  this.context = context;
  this.urlList = urlList;
  this.onload = callback;
  this.bufferList = new Array();
  this.loadCount = 0;
}
BufferLoader.prototype.loadBuffer = function(url, index) {
  // Load buffer asynchronously
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;

  request.onload = function() {
    // Asynchronously decode the audio file data in request.response
    loader.context.decodeAudioData(
      request.response,
      function(buffer) {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }
        loader.bufferList[index] = buffer;
        if (++loader.loadCount == loader.urlList.length)
          loader.onload(loader.bufferList);
      },
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }

  request.onerror = function() {
    alert('BufferLoader: XHR error');
  }

  request.send();
};

BufferLoader.prototype.load = function() {
  for (var i = 0; i < this.urlList.length; ++i)
  this.loadBuffer(this.urlList[i], i);
};



function loadSounds(obj, soundMap, callback) {
  // Array-ify
  var names = [];
  var paths = [];
  for (var name in soundMap) {
    var path = soundMap[name];
    names.push(name);
    paths.push(path);
  }
  var bufferLoader = new BufferLoader(context, paths, function(bufferList) {
    for (var i = 0; i < bufferList.length; i++) {
      var buffer = bufferList[i];
      var name = names[i];
      obj[name] = buffer;
    }
    if (callback) {
      callback();
    }
  });
  bufferLoader.load();
}

var buffers = {};
var soundmap = { 'ir1' : './sound/ir1.wav', 'sus1' : './sound/sus_note.wav'};
//, 'piano1': 'piano_note1_f_sharp.wav', 'indo1' : 'indonesian_gong.wav', 'june_o' : 'june_o.wav', 'reversegate' :'H3000-ReverseGate.mp3'};
    

function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function noteNum2Freq(num){
    return Math.pow(2,(num-57)/12) * 440 
}

if(soundEnabled){
  try {
    // still needed for Safari
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    // create an AudioContext
    //context = WX._ctx
    context = new window.AudioContext();
   // alert('Web Audio API supported.');
    compressor = context.createDynamicsCompressor()
    reverb = context.createConvolver();
  } catch(e) {
    // API not supported
    alert('Web Audio API not supported, please use most recent Chrome (41+), FireFox(31+) or Safari (iOS 7.1+).');
  }

}

loadSounds(buffers, soundmap, function(){
  reverb.buffer = buffers['ir1'];
});


function ADSR(){
    this.node = context.createGain();
    this.node.gain.value = 0.0;
}

ADSR.prototype.noteOn= function(delay, A,D, peakLevel, sustainlevel){
    peakLevel = peakLevel || 1;
    sustainlevel = sustainlevel || 0.3;
    
    this.node.gain.linearRampToValueAtTime(0.0,delay + context.currentTime);
    this.node.gain.linearRampToValueAtTime(peakLevel,delay + context.currentTime + A); // Attack
    this.node.gain.linearRampToValueAtTime(sustainlevel,delay + context.currentTime + A + D);// Decay
}

ADSR.prototype.noteOff= function(delay, R, sustainlevel){
    sustainlevel = sustainlevel || 0.1;

    this.node.gain.linearRampToValueAtTime(sustainlevel,delay + context.currentTime );// Release   
    this.node.gain.linearRampToValueAtTime(0.0,delay + context.currentTime + R);// Release   
    
}

ADSR.prototype.play= function(delay, A,D,S,R, peakLevel, sustainlevel){
  this.node.gain.linearRampToValueAtTime(0.0,delay + context.currentTime);
  this.node.gain.linearRampToValueAtTime(peakLevel,delay + context.currentTime + A); // Attack
  this.node.gain.linearRampToValueAtTime(sustainlevel,delay + context.currentTime + A + D);// Decay
  this.node.gain.linearRampToValueAtTime(sustainlevel,delay + context.currentTime + A + D + S);// sustain.
  this.node.gain.linearRampToValueAtTime(0.0,delay + context.currentTime + A + D + S + R);// Release   
}
var index = 0;

function ScissorVoice(noteNum, numOsc, oscType, detune){
  this.output  = new ADSR();
  this.maxGain = 1 / numOsc;
  this.noteNum = noteNum;
  this.frequency = noteNum2Freq(noteNum);
  this.oscs = [];
  this.index = index++;
  this.time = context.currentTime;
  for (var i=0; i< numOsc; i++){
    var osc = context.createOscillator();
    osc.type = oscType;
    osc.frequency.value = this.frequency;
    osc.detune.value = -detune + i * 2 * detune / (numOsc - 1);
    osc.start(context.currentTime);
    osc.connect(this.output.node);
    this.oscs.push(osc);
  }
  //console.log("played(" + index +") " + noteNum + " at " + context.currentTime);
   //   console.log("started : " +this.noteNum);

}

ScissorVoice.prototype.stop = function(time){
  //time =  time | context.currentTime;
  var it = this;
  setTimeout(function(){
 //   console.log("stopped(" + index +") " +it.noteNum + " at " +context.currentTime);
    for (var i=0; i<it.oscs.length; i++){
        it.oscs[i].disconnect();
    }
  }, Math.floor((time-context.currentTime)*1000));
}

ScissorVoice.prototype.detune = function(detune){
    for (var i=0; i<this.oscs.length; i++){
        //this.oscs[i].frequency.value = noteNum2Freq(noteNum);
        this.oscs[i].detune.value -= detune;
    }
}

ScissorVoice.prototype.connect = function(target){
  this.output.node.connect(target);
}   



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

  // this is moved here to support iOS : http://stackoverflow.com/questions/12517000/no-sound-on-ios-6-web-audio-api
  


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

    //publishMessage("performer", {"type":"create", "my_id":my_id, "nickname": strScreenName});

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

    if (soundEnabled){
      var masterGain = context.createGain();
      masterGain.gain.value = 0.7;
      masterGain.connect(context.destination);
      compressor.connect(masterGain);
      reverb.connect(compressor);
    }

    var testOsc = context.createOscillator();
    testOsc.connect(compressor);
    testOsc.start(0);
    testOsc.stop(context.currentTime + 0.3);
  });
  
  var playBarNote = -1;
  var intervalBetweenPattern = 1000;
  var interval = intervalBetweenPattern;
  var progress = 0;
  var lastPingTime = Date.now();
  var speed = 0.3; // 300 pixel per second (1000 ms); 
  var canvasHeight;


  function init() {
    // Initialise our object
   // obj = {x:50, y:50, w:70, h:70};
    canvas = $("#patternCanvas")[0];
 
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasHeight = window.innerHeight;
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

    var currentTime = Date.now();
    var intervalInSec = interval/1000;

    if (playBarNote < 0 && lastPingTime  + interval > currentTime)
      return;
    else if (playBarNote < 0 && lastPingTime + interval <= currentTime){
      playBarNote++;
      lastPingTime = currentTime;
      interval = pattern[playBarNote].distance / speed;
      intervalInSec = interval/1000;
    //  synth.noteon(60, 127, context.currentTime);
    //  synth.noteoff(60,0,context.currentTime + 1);
      if (soundEnabled){

        var pitch = 12 - pattern[playBarNote].y/canvasHeight *12.0

        var voice  =  new ScissorVoice(60 + pitch,3,"triangle", 12);
           //drone = new ScissorVoice(pitchListforDrone[pitchIndex],getRandomInt(3,10),"triangle", [3,5,7,12][getRandomInt(0,3)]);
        voice.stop(context.currentTime + intervalInSec * 0.7);
        voice.connect(reverb);
        //function(delay, A,D, peakLevel, sustainlevel)
        //function(time, A,D,S,R, peakLevel, sustainlevel){
        voice.output.play(0,intervalInSec*0.1,intervalInSec*0.1,intervalInSec*0.4,intervalInSec*0.1,voice.maxGain*2.0,voice.maxGain );

        //voice.output.noteOn(0,intervalInSec*0.1,intervalInSec*0.5,voice.maxGain*2.0,voice.maxGain);
        // ADSR.prototype.noteOff= function(delay, R, sustainlevel){
        // voice.output.noteOff(intervalInSec*0.5, intervalInSec*0.5,voice.maxGain);    
        
    //    console.log("begin! (" + pattern[playBarNote].distance + "," + interval);
      }
    }
    progress = (currentTime - lastPingTime ) / interval;
    if (progress >=1){
      playBarNote++;
      var pitch = 12 - pattern[playBarNote].y/canvasHeight *12.0
      progress = 0;

      lastPingTime = currentTime;
      //      synth.noteon(60 + pentatonicScale[playBarNote], 127, context.currentTime);
  //    synth.noteoff(60 + pentatonicScale[playBarNote],0,context.currentTime + 1);
      
      if (playBarNote == patternSize-1)
      {
        interval = intervalBetweenPattern;
        playBarNote = -1;
    //    console.log("end! (" + playBarNote + "," + interval);
      }else{
        interval = pattern[playBarNote].distance / speed;
  //      console.log("next! (" + pattern[playBarNote].distance + "," + interval);
      }
      intervalInSec = interval/1000;
      if ( soundEnabled){
        //synth.onData('noteon', {"pitch":60+ pentatonicScale[playBarNote], "time":context.currentTime});
        //synth.onData('noteoff', {"pitch":60+ pentatonicScale[playBarNote], "time":context.currentTime+1});
        var voice  =  new ScissorVoice(pitch + 60,3,"triangle", 3);
           //drone = new ScissorVoice(pitchListforDrone[pitchIndex],getRandomInt(3,10),"triangle", [3,5,7,12][getRandomInt(0,3)]);
        //console.log("currentTime:" + context.currentTime);
        //voice.stopAt = context.currentTime + intervalInSec * 0.4;
        
        voice.stop( context.currentTime + intervalInSec * 0.7);
        
        voice.connect(reverb);
        voice.output.play(0,intervalInSec*0.1,intervalInSec*0.1,intervalInSec*0.4,intervalInSec*0.1,voice.maxGain*2.0,voice.maxGain );
        //function(delay, A,D, peakLevel, sustainlevel)
       // voice.output.noteOn(0,intervalInSec*0.1,intervalInSec*0.5,voice.maxGain*2.0,voice.maxGain);
        // ADSR.prototype.noteOff= function(delay, R, sustainlevel){
       // voice.output.noteOff(intervalInSec*0.5, intervalInSec*0.5,voice.maxGain);    
        
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