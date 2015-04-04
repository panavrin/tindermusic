//alert("test");

// PubNub code

  // Get an unique pubnub id
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

  // Parse messages received from PubNub platform
  function parseMessage( message ) {
      if (typeof message.nextDivName !== 'undefined') {
        setNextDivName(message.nextDivName);
      } else {
        console.log(JSON.stringify(message))
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

  // Set the name of the next div
  function setNextDivName(divName) {
      var actualTindered =  document.getElementById('tindered');
      actualTindered.innerHTML = "";
      actualTindered.appendChild(document.createTextNode(divName));
  }
