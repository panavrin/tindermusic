//alert("test");

// PubNub code
// Get an unique pubnub id
var state = "NAME"; // it is either NAME, EDIT, WAIT, CHECK, MINGLE
var DEBUG = false;
var performerState = "STANDBY";
/*

State Diagram

NAME -> EDIT : create-response msg received
EDIT -> WAIT : update msg sent
WAIT -> CHECK : next-response msg received in "WAIT" state
CHECK -> DATE : user press HEART button
DATE -> CHECK : user press exit button
CHECK -> EDIT : user press "update" button

*/

var NORESPONSE1 = true;
var NORESPONSE2 = true;
var NORESPONSE3 = 0;



var soundEnabled = true;
var context;
var compressor;
var reverb;
var myIndex;
var strScreenName;
var currentIndex;
var w;
var h;
var noteSize;

var pattern = [];
var originalPattern = [];
var patternElse = [];
var patternSize = 5;
var currentNickname = ""

var liked = new Array();

var myMessages = ['info','warning','error','success', 'like'];

function hideAllMessages() {
  var messagesHeights = new Array(); // this array will store height for each

  for (i=0; i<myMessages.length; i++) {
  messagesHeights[i] = $('.' + myMessages[i]).outerHeight(); // fill array
  //$('.' + myMessages[i]).css('top', -messagesHeights[i]); //move element outside viewport
    $('.'+myMessages[i]).animate({top:-messagesHeights[i]}, 500);
  }
}

function showMessage(type, message, autoHide, hideTime) {
  //  $('.'+ type +'-trigger').click(function(){
  hideAllMessages();
  $("."+type+" .msg_header").text(message);
  //$("."+type+" .msg_body").text(message2);
  $('.'+type).animate({top:"0"}, 500);
   // });
  if (autoHide){
    hideTime = hideTime | 3000;
    setTimeout(hideAllMessages, hideTime);
  }

}

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

  request.onerror = function(error) {
    console.log('BufferLoader: XHR error', error);
    debugger;
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
var soundmap = {
    'ir1' : './sound/ir1.wav'
  , 'sus1' : './sound/sus_note.wav'
  , 'yes':'./sound/yes.mp3'
  , 'no': './sound/no.mp3'
  , 'liked': './sound/liked.wav'
  , 'matched': './sound/matched.mp3'
};
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


var playSample = function(sampleName, randomSpeed){
  if(buffers[sampleName]){
    var source = context.createBufferSource();
    source.buffer = buffers[sampleName];
    if(randomSpeed)
      source.playbackRate.value = (Math.random() - 0.5) * 0.2 + 1
    source.connect(compressor);
    source.start(0);
  }
}

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
    if ( oscType.length === "undefined")
      osc.type = oscType;
    else
      osc.type = oscType[i%oscType.length];
    osc.frequency.value = this.frequency;
    osc.detune.value = -detune + i * 2 * detune / numOsc ;
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
var majorScale = [0,2,4,5,7,9,11,12];
var scaleWeight = [2,1,2,1,2,1,1,2];
var minorScale = [0,2,3,5,7,8,10,12];
var selectedScale = majorScale;
var selectedScaleWeight = scaleWeight;
var baseNote = 60;

function getPicthIndex(num){

    var weightSum = 0;
    for (var i=0; i< selectedScale.length; i++){
      weightSum += selectedScaleWeight[i];
    }
    var count;
    var accWeight=0;
    for (count=0; count< selectedScale.length; count++){
      if (num <= accWeight / weightSum)
        break;
      accWeight += selectedScaleWeight[count];
    }
    return count-1;
}
function Note(){
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

// var my_id = PUBNUB.uuid(); // old method

// get/create/store UUID
var my_id = PUBNUB.db.get('session') || (function(){
    var uuid = PUBNUB.uuid();
    PUBNUB.db.set('session', uuid);
    return uuid;
})();

// Initialize with Publish & Subscribe Keys
var pubnub = PUBNUB.init({
    publish_key: publishKey,
    subscribe_key: subscribeKey,
    uuid: my_id,
    ssl : (('https:' == document.location.protocol) ? true : false)

});

// Subscribe to a channel
pubnub.subscribe({
    channel: my_id + ",audience",
    message: parseMessage,
    error: function (error) {
     // Handle error here
     console.log(JSON.stringify(error));
     refresh();
    },
    heartbeat: 15
});

function parseMessage( message ) {
  if(DEBUG)console.log("message - received:" + JSON.stringify(message));
  if (typeof message.nextDivName !== 'undefined') {
    setNextDivName(message.nextDivName);
  }
  else if (typeof message.type !== 'undefined'){
    if ( message.type == "create-response"){
      NORESPONSE1 = false;
      if (message.res == "s"){
        state = "EDIT";
        $('#initial-message').bPopup().close();
        strScreenName = $("#screenname").val();
        $('#screenname_display').text(strScreenName);
        myIndex = message.index;
        lastPingTime = Date.now();
        $("#submit_pane").css("visibility", "visible");
      }
      else
      {
        $('#name_error_msg').text($('#screenname').val() + " is already taken.");
      }
    }
    else if ( message.type == "next-response")
    {
      NORESPONSE3--;
      patternElse = message.suggested_tm.tm;
      currentNickname = message.suggested_tm.nickname;
      currentIndex = message.suggested_tm.index;
      $('#screenname_display').text(currentNickname);

      for (var i=0; i< patternElse.length-1; i++){
        patternElse[i].distance = dist(patternElse[i].x * w,patternElse[i].y* h,patternElse[i+1].x* w,patternElse[i+1].y* h);
      }

      if ( state == "WAIT"){
        $("#bottom_banner").css("visibility", "visible");
        $("#top_banner").css("visibility", "visible");
        lastPingTimeElse = Date.now();
        state = "CHECK";
        $("#waiting-message").css("visibility", "hidden");
      }
    }
    else if ( message.type == "liked-response")
    {
      if ( message.index == myIndex)
      {
        showMessage('error',  "I know! You like your tune.", true, 1000);
      }
      else if ( liked.indexOf(message.index) == -1 ){
        showMessage('error',  message.nickname + ' likes your tune!', true, 1000);
        playSample("liked", true);
      }
      else{
        showMessage('error', "It's a match! " + message.nickname + ' likes your tune, too!', true, 1000);
        playSample("matched", true);
      }
    }
    else if ( message.type == "question")
    {
      if(message.text.length>0){
        $("#question_content").text(message.text);
        $("#question-message").css("visibility", "visible");
      }
    }
    else if ( message.type == "scale"){
      if ( message.probability >=0 )
      {
        if ( message.probability > Math.random()){
          baseNote = message.baseNote;
          selectedScale = message.scale;
          //showMessage("info", "The performer changed the scale.", true);
        }
      }
      else{
        baseNote = message.baseNote;
        selectedScale = message.scale;
        showMessage("info", "The performer changed the scale.", true);
      }
    }
    else if ( message.type == "sound-toggle"){
      if ( message.probability >=0 )
      {
        if ( message.probability > Math.random()){
          soundEnabled = message.on;
        }
      }
      else{
        soundEnabled = message.on;
      }
    }
    else if ( message.type == "script"){
      if (message.script){
        if ( message.probability >=0 )
        {
          if ( message.probability > Math.random()){
            try {
              eval(message.script);
            } catch (e) {
              console.log(e);
            }
          }
        }
        else{
          try {
            eval(message.script);
          } catch (e) {
            console.log(e);
          }
        }
      }


    }
    else if (message.type == "state-response"){
      NORESPONSE2 = false;
      soundEnabled = message.sound;
      performerState = message.state;
      if ( performerState == "STANDBY"){
  showMessage("warning", "STANDBY, Crowd in C is about to start.");
        $("#STANDBY").css("visibility", "visible");
      }
      else if (performerState == "GOLIVE"){
        hideAllMessages();
        showMessage("success", "Let's go live!", true);
        $("#STANDBY").css("visibility", "hidden");
      }
       else if (performerState == "END"){
        hideAllMessages();
        showMessage("success", "This is the end. (Applause)", true);
        $("#STANDBY").css("visibility", "hidden");
      }
    }
    else{
      console.log("unhandled type:" + message.type);
    }
  }
  else {
    console.log(JSON.stringify(message));
  }
}

function publishMessage(channel, options){
  if(channel=="audience")
  {
    console.error("please not hack this application. :) ")
    return;
  }
  pubnub.publish({
    channel: channel,
    message: options,
    error : function(m) {
      console.log("Message send failed - ["
          + JSON.stringify(m) + "] - Retrying in 3 seconds!");
      setTimeout(publishMessage(channel, options), 2000);
    }
  });

  if(DEBUG)console.log("sent a message to channel ("+channel+") : " + JSON.stringify(options));

}


function getNextPattern(){
  state = "WAIT";
  NORESPONSE3++;

  publishMessage("performer", {type:"next", index: myIndex});

  $("#bottom_banner").css("visibility", "hidden");
  $("#top_banner").css("visibility", "hidden");
  $("#waiting-message").css("visibility", "visible");
}

// Request the next div
function getNextDivName() {
  var actualTindered =  document.getElementById('tindered');
  var actualDivName = actualTindered.textContent;
 /* pubnub.publish({
    channel: "performer",
    message: {"nextToDivName": actualDivName, "user": my_id}
  });*/
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


function randomizeNote(){

  for (var i=0; i< patternSize; i++){
    var note = new Note();
    note.setPosition(Math.random(), Math.random())
    pattern[i] = note;
  }

  for (var i=0; i< patternSize-1; i++){
    pattern[i].distance = dist(pattern[i].x * w,pattern[i].y* h,pattern[i+1].x* w,pattern[i+1].y* h);
  }
}

function refresh(){
  window.onbeforeunload = null;
  showMessage("info", "This page will be refreshed in 3 seconds...", true, 2500);
  setTimeout(function(){
    window.location.reload();
  },3000);
}

function update(){
 // alert("update!")
  state = "WAIT";
  publishMessage("performer", {type :"update", index: myIndex, tm : pattern});
  $("#waiting-message").css("visibility", "visible");
  $("#submit_pane").css("visibility", "hidden");
}

function like(){
  publishMessage("performer", {type :"liked", index:myIndex, likedindex: currentIndex});
  liked.push(currentIndex);
  $("#like_button_area").css("display", "none");
  $("#liked_button_area").css("display", "block");
}

function modifyPattern(){
  state = "EDIT";
  publishMessage("performer", {type :"editing", index:myIndex});

  $("#submit_pane").css("visibility", "visible");
  $("#bottom_banner").css("visibility", "hidden");
  $("#top_banner").css("visibility", "hidden");
}

function mingle(){
  state = "MINGLE";
  $("#mingle_pane").css("visibility", "visible");
  $("#like_button_area").css("visibility", "visible");
  $("#liked_button_area").css("visibility", "visible");

  if ( liked.indexOf(currentIndex) == -1){
    $("#like_button_area").css("display", "block");
    $("#liked_button_area").css("display", "none");
  }
  else{
    $("#like_button_area").css("display", "none");
    $("#liked_button_area").css("display", "block");
  }
  $("#bottom_banner").css("visibility", "hidden");
  $("#top_banner").css("visibility", "hidden");
  for (var i=0; i < pattern.length; i++){
    var note = new Note();
    note.setPosition(pattern[i].x, pattern[i].y);
    note.distance = pattern[i].distance;
    originalPattern[i] = note;
  }

}

function exit(){
  state = "WAIT";
  publishMessage("performer", {type :"whereami", index: myIndex});
  $("#waiting-message").css("visibility", "visible");
  $("#mingle_pane").css("visibility", "hidden");
  $("#like_button_area").css("visibility", "hidden");
  $("#liked_button_area").css("visibility", "hidden");

  for (var i=0; i < pattern.length; i++){
    pattern[i].setPosition(originalPattern[i].x, originalPattern[i].y);
    pattern[i].distance = originalPattern[i].distance;
  }
}
//it is either NAME, EDIT, WAIT, CHECK, MINGLE

function stateTransition(_state){
  state = _state;
  switch(state){
    case "NAME":
    break;
    case "EDIT":
    break;
    case "WAIT":
    break;
    case "CHECK":
    break;
    case "MINGLE":
    break;
    default:
    if(DEBUG) alert("unknown state:" + _state);
    break;
  }
  return;
}

$(document).ready(function () {


// Initially, hide them all
  hideAllMessages();

  // Show message
 /* for(var i=0;i<myMessages.length;i++)
  {
    showMessage(myMessages[i]);
  }
  */

  // When message is clicked, hide it
  $('.message').click(function(){
    $(this).animate({top: -$(this).outerHeight()}, 500);
  });

  $("#question-message").css("visibility", "hidden");

  $("#waiting-message").css("visibility", "hidden");

  $('#answer_yes').button().click(function(){
    playSample('yes', true);
    $("#question-message").css("visibility","hidden");
  })

  $('#answer_no').button().click(function(){
    playSample('no', true);
    $("#question-message").css("visibility","hidden");
  });

  $(".tenpercent").each(function() {
    var height =  window.innerHeight * 0.08; // Max width for the image
    $(this).css("height", height);
  });

  NORESPONSE2 = true;

  (function loopPublish2(){
    setTimeout(function(){
      if (NORESPONSE2){
        publishMessage("performer", {type:"state", my_id:my_id});
        loopPublish2();
      }

    }, 3000);
  })();

  // Parse messages received from PubNub platform

/* $('#initial-message').bPopup({
    modalClose: false,
    opacity: 0.7,
    positionStyle: 'absolute',
  //  position: [50%, 20],
    escClose :false
  });
*/

  // this is moved here to support iOS : http://stackoverflow.com/questions/12517000/no-sound-on-ios-6-web-audio-api

  $("#start").button().css({ margin:'5px'}).click(function(){

    $("#name_error_msg").text("");

    strScreenName = $("#screenname").val();
    if ( strScreenName.length > 12) {
      $("#name_error_msg").text("screen name is too long");
      return;
    }

    if ( textAlphanumeric(strScreenName) == false ) {
      $("#name_error_msg").text("Please, use combination of alphabets and numbers for the screen name. ");
      return;
    }
    NORESPONSE1 = true;
    publishMessage("performer", {"type":"create", "my_id":my_id, "nickname": strScreenName});
    (function loopPublish1(){
      setTimeout(function(){
        if (NORESPONSE1){
          publishMessage("performer", {"type":"create", "my_id":my_id, "nickname": strScreenName});
          loopPublish1();
        }

      }, 3000);
    })();
    $("#name_error_msg").text("Waiting for response...");

    //$('#initial-message').bPopup().close();

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
  var playBarNoteElse = -1;
  var intervalBetweenPattern = 1000;
  var interval = intervalBetweenPattern;
  var intervalElse = intervalBetweenPattern;
  var progress = 0;
  var progressElse = 0;
  var lastPingTime = Date.now();
  var lastPingTimeElse = Date.now();
  var speed = 0.3; // 300 pixel per second (1000 ms);
  var speedElse = 0.3; // 300 pixel per second (1000 ms);


  function init() {
    // Initialise our object
   // obj = {x:50, y:50, w:70, h:70};
    canvas = $("#patternCanvas")[0];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.9;
    w = canvas.width;
    h = canvas.height;
    noteSize = Math.min(w,h)/12;

    randomizeNote();

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
    ctx.clearRect(0, 0, w, h);
    var weightSum = 0;
    for (var i=0; i< selectedScale.length; i++){
      weightSum += selectedScaleWeight[i];
    }
    var accHeight = 0;
    if ( state == "EDIT" || state == "MINGLE" || state == "CHECK"){
       for (var i=0; i< selectedScale.length; i++){
        ctx.beginPath();
        var height = h * selectedScaleWeight[selectedScale.length - i - 1] / weightSum;

        ctx.rect(0, accHeight, w, height);
        accHeight += height;
        if ( i % 2 == 0)
          ctx.fillStyle = '#f8f8f5';
        else
          ctx.fillStyle = '#e9e3e0';
        ctx.fill();
     /*   ctx.lineWidth = 3;
        ctx.strokeStyle = '#661A4C';
        ctx.stroke();
      */}

    }

    if ( state == "EDIT" || state == "MINGLE"){


      for (var i=0; i< patternSize; i++){
      //  ctx.fillRect(pattern[i].x, pattern[i].y, pattern[i].size, pattern[i].size);
        drawCircle(ctx,pattern[i].x * w, pattern[i].y* h, noteSize, '#83eb9f' );
        if ( i < patternSize-1)
          drawLine(ctx,pattern[i].x* w, pattern[i].y* h, pattern[i+1].x* w, pattern[i+1].y* h, '#57bd72');
        drawCircle(ctx,pattern[i].x* w, pattern[i].y* h, noteSize/3, '#57bd72' );
      }

      if (playBarNote >= 0){
        var playBarCircleX = pattern[playBarNote].x * (1-progress) + pattern[playBarNote+1].x * (progress);
        var playBarCircleY = pattern[playBarNote].y * (1-progress) + pattern[playBarNote+1].y * (progress);
        drawCircle(ctx,playBarCircleX* w, playBarCircleY* h, noteSize/2 , '#fdff85' );
     }
   }

   if ( state == "CHECK" || state == "MINGLE"){

      for (var i=0; i< patternElse.length; i++){
      //  ctx.fillRect(pattern[i].x, pattern[i].y, pattern[i].size, pattern[i].size);
        drawCircle(ctx,patternElse[i].x * w, patternElse[i].y* h, noteSize-2, '#ff969d' );
        if ( i < patternElse.length-1)
          drawLine(ctx,patternElse[i].x* w, patternElse[i].y* h, patternElse[i+1].x* w, patternElse[i+1].y* h, '#d16970');
        drawCircle(ctx,patternElse[i].x* w, patternElse[i].y* h, noteSize/3, '#d16970' );
      }
      if (playBarNoteElse >= 0){
        var playBarCircleX = patternElse[playBarNoteElse].x * (1-progressElse) + patternElse[playBarNoteElse+1].x * (progressElse);
        var playBarCircleY = patternElse[playBarNoteElse].y * (1-progressElse) + patternElse[playBarNoteElse+1].y * (progressElse);
        drawCircle(ctx,playBarCircleX* w, playBarCircleY* h, noteSize/2 , '#fdff85' );
     }
   }
    // Draw our object in its new position
  }

  var animate = function() {

    window.requestAnimFrame(animate);
    if (state == "NAME" )
      return;
    var currentTime = Date.now();
    var intervalInSec = interval/1000;
    var oscType = ["sine","sine","triangle","triangle","sawtooth","square","triangle","sawtooth","square" ];
    //var oscType = ["triangle"];
    var detune = 20;
    var maxNumOsc = oscType.length;

    if (state == "EDIT" || state == "MINGLE" || state == "WAIT"){
      progress = (currentTime - lastPingTime ) / interval;
      if (playBarNote < 0 && lastPingTime + interval < currentTime){
        playBarNote++;
        lastPingTime = currentTime;
        interval = pattern[playBarNote].distance / speed;
        intervalInSec = interval/1000;
        progress = 0;

      //  synth.noteon(60, 127, context.currentTime);
      //  synth.noteoff(60,0,context.currentTime + 1);
        if (soundEnabled){

          var numOsc = Math.floor(pattern[playBarNote].x * maxNumOsc )  + 1;
          var numDetune = Math.floor(pattern[playBarNote].x * detune );
       //   var pitchIndex = Math.floor((1 - pattern[playBarNote].y) * selectedScale.length);
          var pitchIndex =getPicthIndex(1 - pattern[playBarNote].y);
          var octave = Math.floor(pitchIndex / selectedScale.length);
          var voice  =  new ScissorVoice(baseNote + selectedScale[pitchIndex] + octave * 12,numOsc,oscType, detune);
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
      else if (playBarNote >= 0 && lastPingTime + interval < currentTime){
        playBarNote++;
        progress = 0;
        var numOsc = Math.floor(pattern[playBarNote].x * maxNumOsc )  + 1;
        var numDetune = Math.floor(pattern[playBarNote].x * detune );
        //var pitchIndex = Math.floor((1 - pattern[playBarNote].y) * selectedScale.length);
        var pitchIndex =getPicthIndex(1 - pattern[playBarNote].y);
        var octave = Math.floor(pitchIndex / selectedScale.length);

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
          var voice  =  new ScissorVoice(baseNote + selectedScale[pitchIndex] + octave * 12,numOsc,oscType, detune);
          voice.stop( context.currentTime + intervalInSec * 0.7);
          voice.connect(reverb);
          voice.output.play(0,intervalInSec*0.1,intervalInSec*0.1,intervalInSec*0.4,intervalInSec*0.1,voice.maxGain*2.0,voice.maxGain );
        }
      }
    } // end of if (state == "EDIT" || state == "DATE"){


    if (state == "CHECK" || state == "MINGLE"){
      progressElse = (currentTime - lastPingTimeElse ) / intervalElse;
      if (playBarNoteElse < 0 && lastPingTimeElse + intervalElse < currentTime){
        playBarNoteElse++;
        progressElse=0;
        lastPingTimeElse = currentTime;
        intervalElse = patternElse[playBarNoteElse].distance / speedElse;
        intervalInSec = interval/1000;
      //  synth.noteon(60, 127, context.currentTime);
      //  synth.noteoff(60,0,context.currentTime + 1);
        if (soundEnabled){

          var numOsc = Math.floor(patternElse[playBarNoteElse].x * maxNumOsc )  + 1;
          var numDetune = Math.floor(patternElse[playBarNoteElse].x * detune );
          //var pitchIndex = Math.floor((1 - patternElse[playBarNoteElse].y) * selectedScale.length);
          var pitchIndex =getPicthIndex(1 - patternElse[playBarNoteElse].y);
          var octave = Math.floor(pitchIndex / selectedScale.length);
          var voice  =  new ScissorVoice(baseNote + selectedScale[pitchIndex] + octave * 12,numOsc,oscType, detune);
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
      else if (playBarNoteElse >= 0 && lastPingTimeElse + intervalElse < currentTime){
        playBarNoteElse++;
        progressElse = 0;
        var numOsc = Math.floor(patternElse[playBarNoteElse].x * maxNumOsc )  + 1;
        var numDetune = Math.floor(patternElse[playBarNoteElse].x * detune );
//        var pitchIndex = Math.floor((1 - patternElse[playBarNoteElse].y) * selectedScale.length);
        var pitchIndex =getPicthIndex(1 - patternElse[playBarNoteElse].y);

        var octave = Math.floor(pitchIndex / selectedScale.length);

        lastPingTimeElse = currentTime;
        //      synth.noteon(60 + pentatonicScale[playBarNote], 127, context.currentTime);
    //    synth.noteoff(60 + pentatonicScale[playBarNote],0,context.currentTime + 1);

        if (playBarNoteElse == patternElse.length-1)
        {
          intervalElse = intervalBetweenPattern;
          playBarNoteElse = -1;
      //    console.log("end! (" + playBarNote + "," + interval);
        }else{
          intervalElse = patternElse[playBarNoteElse].distance / speedElse;
    //      console.log("next! (" + pattern[playBarNote].distance + "," + interval);
        }
        intervalInSec = interval/1000;
        if ( soundEnabled){
          //synth.onData('noteon', {"pitch":60+ pentatonicScale[playBarNote], "time":context.currentTime});
          //synth.onData('noteoff', {"pitch":60+ pentatonicScale[playBarNote], "time":context.currentTime+1});
          var voice  =  new ScissorVoice(baseNote + selectedScale[pitchIndex] + octave * 12,numOsc,oscType, detune);
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
    } // end of if (state == "EDIT" || state == "DATE"){

   // if (state == "CHECK" || state == "DATE"){

    //}
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
    pattern[selectedNote].setPosition((e.pageX -  noteSize/2)/w
        ,(e.pageY -  noteSize/2)/h);
    pattern[selectedNote].distance = dist(pattern[selectedNote].x * w, pattern[selectedNote].y * h,
      pattern[(1+selectedNote)%patternSize].x * w, pattern[(1+selectedNote)%patternSize].y * h);
    if ( selectedNote > 0)
      pattern[selectedNote-1].distance = dist(pattern[selectedNote].x* w, pattern[selectedNote].y* h,
      pattern[selectedNote-1].x* w, pattern[selectedNote-1].y* h);

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

    // Is touch close enough to our object?

    // Assign new coordinates to our object
    pattern[selectedNote].setPosition((e.pageX -  noteSize/2)/w
        ,(e.pageY -  noteSize/2)/h);
    pattern[selectedNote].distance = dist(pattern[selectedNote].x * w, pattern[selectedNote].y * h,
      pattern[(1+selectedNote)%patternSize].x * w, pattern[(1+selectedNote)%patternSize].y * h);
    if ( selectedNote > 0)
      pattern[selectedNote-1].distance = dist(pattern[selectedNote].x* w, pattern[selectedNote].y* h,
      pattern[selectedNote-1].x* w, pattern[selectedNote-1].y* h);

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
      var distance = dist(e.pageX, e.pageY, pattern[i].x * w, pattern[i].y * h);
      if ( minDistance >= distance){
        minDistance = distance;
        tempNoteID = i;
      }
    }

    if(tempNoteID > -1 && minDistance < noteSize) {
      selectedNote = tempNoteID;
    }
  });

  $(document).bind('touchstart',function(event){
    // Left mouse button was pressed, set flag
    var minDistance = 100000;
    var tempNoteID = -1;
    var e = event.originalEvent.changedTouches[0];

    for (var i=0; i< patternSize; i++){
      var distance = dist(e.pageX, e.pageY, pattern[i].x * w, pattern[i].y * h);
      if ( minDistance >= distance){
        minDistance = distance;
        tempNoteID = i;
      }
    }

    if(tempNoteID > -1 && minDistance < noteSize) {
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
