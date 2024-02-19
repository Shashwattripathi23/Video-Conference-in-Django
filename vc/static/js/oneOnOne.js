console.log("bro");

var labelUsername = document.querySelector("#username");
var friendUsername = document.querySelector("#friend");
var inputUsername = document.querySelector("#userinput");
var btnjoin = document.querySelector("#join");
var webSocket;
var username;
var receiver_channel_name;
var mapPeers = {};
var recVideo = document.querySelector("#receiver-video");
var call = false;
var startVC = document.querySelector("#btn-video-call");
startVC.addEventListener("click", initiateVC);

var startAC = document.querySelector("#btn-audio-call");
startAC.addEventListener("click", initiateAC);

function initiateAC() {
  console.log("vc button pressed");
  if (callInitiated) {
    return;
  }

  audioCall();
  sendSignal("old-peerAC", {});

  console.log("Printing mapPeers:");
  for (const username in mapPeers) {
    if (mapPeers.hasOwnProperty(username)) {
      const peerData = mapPeers[username];
      console.log(`Username: ${username}`);
      console.log(`Peer: `, peerData[0]); // RTCPeerConnection object
      console.log(`Data Channel: `, peerData[1]); // Data Channel object
    }
  }

  callInitiated = true;
}

var callInitiated = false;

function initiateVC() {
  console.log("vc button pressed");
  if (callInitiated) {
    return;
  }

  videoCall();
  sendSignal("old-peer", {});

  console.log("Printing mapPeers:");
  for (const username in mapPeers) {
    if (mapPeers.hasOwnProperty(username)) {
      const peerData = mapPeers[username];
      console.log(`Username: ${username}`);
      console.log(`Peer: `, peerData[0]); // RTCPeerConnection object
      console.log(`Data Channel: `, peerData[1]); // Data Channel object
    }
  }

  callInitiated = true;
}

var selfPeer;
btnjoin.addEventListener("click", () => {
  username = inputUsername.value;

  if (username == "") {
    return;
  }

  //   var selfPeer = new RTCPeerConnection(null);
  //   mapPeers[username] = [selfPeer, null];
  inputUsername.value = "";
  inputUsername.disabled = true;
  inputUsername.style.visibility = "hidden";

  btnjoin.disabled = true;
  btnjoin.style.visibility = "hidden";
  labelUsername.innerHTML = username;

  var loc = window.location;
  var wsStart = "ws://";

  if (loc.protocol == "/https:") {
    wsStart = "wss://";
  }

  var endpoint = wsStart + loc.host + loc.pathname;

  console.log(endpoint);

  webSocket = new WebSocket(endpoint);

  webSocket.addEventListener("open", (e) => {
    console.log("opened");

    sendSignal("new-peer", {});
  });

  webSocket.addEventListener("message", websocketonmessage);

  webSocket.addEventListener("close", (e) => {
    console.log("closed");
  });

  webSocket.addEventListener("error", (e) => {
    console.log("error");
  });
});

function websocketonmessage(event) {
  var parsedData = JSON.parse(event.data);
  var peerUsername = parsedData["peer"];
  var action = parsedData["action"];

  if (username == peerUsername) {
    return;
  }

  if (document.querySelector("#friend").textContent == "No one") {
    document.querySelector("#friend").textContent = peerUsername;
  }
  receiver_channel_name = parsedData["message"]["receiver_channel_name"];

  if (action == "old-peerAC") {
    console.log("signal received from", peerUsername);
    // Create the modal dialog
    var modal = document.createElement("div");
    modal.classList.add("modal");

    // Modal content
    var modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    // Add text to modal content
    var question = document.createElement("p");
    question.textContent = "Do you want to connect to the audio call?";

    audioCall(peerUsername);
    // Add buttons
    var btnYes = document.createElement("button");
    btnYes.textContent = "Yes";
    btnYes.addEventListener("click", function () {
      console.log("before vc");
      createExistingOfferer(peerUsername, receiver_channel_name);

      setTimeout(() => {
        sendSignal("old-peerAccept", {});
      }, 2);

      modal.style.display = "none";
    });

    var btnNo = document.createElement("button");
    btnNo.textContent = "No";
    btnNo.addEventListener("click", function () {
      modal.style.display = "none";
    });

    modalContent.appendChild(question);
    modalContent.appendChild(btnYes);
    modalContent.appendChild(btnNo);

    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    modal.style.display = "block";
  }
  if (action == "old-peer") {
    console.log("signal received from", peerUsername);
    // Create the modal dialog
    var modal = document.createElement("div");
    modal.classList.add("modal");

    // Modal content
    var modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    // Add text to modal content
    var question = document.createElement("p");
    question.textContent = "Do you want to connect to the video call?";

    videoCall(peerUsername);
    // Add buttons
    var btnYes = document.createElement("button");
    btnYes.textContent = "Yes";
    btnYes.addEventListener("click", function () {
      console.log("before vc");
      createExistingOfferer(peerUsername, receiver_channel_name);

      setTimeout(() => {
        sendSignal("old-peerAccept", {});
      }, 2);

      modal.style.display = "none";
    });

    var btnNo = document.createElement("button");
    btnNo.textContent = "No";
    btnNo.addEventListener("click", function () {
      modal.style.display = "none";
    });

    modalContent.appendChild(question);
    modalContent.appendChild(btnYes);
    modalContent.appendChild(btnNo);

    modal.appendChild(modalContent);

    document.body.appendChild(modal);

    modal.style.display = "block";
  }
  if (action == "old-peerAccept") {
    createExistingOfferer(peerUsername, receiver_channel_name);
    return;
  }

  if (action == "allow") {
    console.log("allow");
    videoCall(peerUsername);

    createExistingOfferer(peerUsername, receiver_channel_name);
  }
  if (action == "new-peer") {
    createOfferer(peerUsername, receiver_channel_name);
    return;
  }
  if (action == "screenPeer") {
    console.log("received screenPeer");
    createScreenOfferer(peerUsername, receiver_channel_name);
    setTimeout(() => {
      sendSignal("screenPeerAccept", {});
    }, 2000);
    return;
  }
  if (action == "screenPeerAccept") {
    console.log("received screenPeer");
    createScreenOfferer(peerUsername, receiver_channel_name);
    return;
  }

  if (action == "new-Screenoffer") {
    var offer = parsedData["message"]["sdp"];
    console.log("received newSCreenOffer");
    createScreenAnswerer(offer, peerUsername, receiver_channel_name);

    return;
  }

  if (action == "new-offer") {
    var offer = parsedData["message"]["sdp"];

    createAnswerer(offer, peerUsername, receiver_channel_name);

    return;
  }
  if (action == "new-Exoffer" || action == "old-peerAccept") {
    var offer = parsedData["message"]["sdp"];

    createExistingAnswerer(offer, peerUsername, receiver_channel_name);

    return;
  }
  console.log(message);

  if (action == "new-answer") {
    var answer = parsedData["message"]["sdp"];

    var peer = mapPeers[peerUsername][0];

    peer.setRemoteDescription(answer);

    return;
  }
  if (action == "new-Screenanswer") {
    var answer = parsedData["message"]["sdp"];
    console.log("received newScreenAnswer");
    var peer = mapPeers[peerUsername][0];
    var remoteScreenVideo = createScreenVideo(peerUsername);
    setOnTrack(peer, remoteScreenVideo);
    peer.setRemoteDescription(answer);

    return;
  }

  if (action == "new-Exanswer") {
    var answer = parsedData["message"]["sdp"];

    var peer = mapPeers[peerUsername][0];

    peer.setRemoteDescription(answer);

    return;
  }
}

function addLocalTracks(peer) {
  console.log("calling addLocalTracks");
  localStream.getTracks().forEach((track) => {
    console.log("adding", track);
    peer.addTrack(track, localStream);
  });
  return;
}

// var screenStream = new MediaStream();
// document.querySelector("#btn-screenShare").addEventListener("click", () => {
//   var screenMedia = navigator
// });

function sendSignal(action, message) {
  var jstr = JSON.stringify({
    message: message,
    action: action,
    peer: username,
  });

  webSocket.send(jstr);
}
const abtn = document.querySelector("#toggle-mic");
const vbtn = document.querySelector("#toggle-camera");
var localVideo = document.querySelector("#sender-video");
let localStream = new MediaStream();

var videoconstraints = {
  video: true,
  audio: true,
};
var audioconstraints = {
  video: false,
  audio: true,
};
function videoCall() {
  navigator.mediaDevices
    .getUserMedia(videoconstraints)
    .then((stream) => {
      localStream = stream;
      localVideo.srcObject = localStream;
      localVideo.muted = true;
      var audioTrack = stream.getAudioTracks();
      var videoTrack = stream.getVideoTracks();
      abtn.addEventListener("click", () => {
        audioTrack[0].enabled = !audioTrack[0].enabled;
      });
      vbtn.addEventListener("click", () => {
        videoTrack[0].enabled = !videoTrack[0].enabled;
        console.log("button");
      });
      audioTrack[0].enabled = true;
      videoTrack[0].enabled = true;
    })
    .catch((error) => {});
}
function audioCall() {
  navigator.mediaDevices
    .getUserMedia(audioconstraints)
    .then((stream) => {
      localStream = stream;
      localVideo.srcObject = localStream;
      localVideo.muted = true;
      var audioTrack = stream.getAudioTracks();
      var videoTrack = stream.getVideoTracks();
      abtn.addEventListener("click", () => {
        audioTrack[0].enabled = !audioTrack[0].enabled;
      });
      vbtn.addEventListener("click", () => {
        videoTrack[0].enabled = !videoTrack[0].enabled;
        console.log("button");
      });
      audioTrack[0].enabled = true;
      videoTrack[0].enabled = true;
    })
    .catch((error) => {});
}

function findPeerByUsername(peerUsername) {
  for (const [username, peerData] of Object.entries(mapPeers)) {
    if (username === peerUsername) {
      return peerData[0];
    }
  }
  return null;
}

function createOfferer(peerUsername, receiver_channel_name) {
  console.log("createOffer");
  var peer = new RTCPeerConnection(null);

  // addLocalTracks(peer);
  var dc = peer.createDataChannel("channel");
  dc.addEventListener("open", () => {
    console.log("opened");
  });
  dc.addEventListener("message", dcOnMessage);

  var remoteVideo = createVideo(peerUsername);
  // setOnTrack(peer, remoteVideo);

  mapPeers[peerUsername] = [peer, dc];
  peer.addEventListener("iceconnectionstatechange", () => {
    var iceconnectionstatechange = peer.iceConnectionState;
    if (
      iceconnectionstatechange === "failed" ||
      iceconnectionstatechange === "disconnected" ||
      iceconnectionstatechange === "closed"
    ) {
      delete mapPeers[peerUsername];

      if (iceconnectionstatechange != "closed") {
        peer.close();
      }
      removeVideo(remoteVideo);
    }
  });
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // console.log("new ice Candidate", JSON.stringify(peer.localDescription));
      return;
    }

    sendSignal("new-offer", {
      sdp: peer.localDescription,
      receiver_channel_name: receiver_channel_name,
    });
  });

  peer.createOffer().then((o) => {
    peer.setLocalDescription(o).then(() => {
      console.log("local des set");
    });
  });
}

function setOnTrack(peer, remoteVideo) {
  var remoteStream = new MediaStream();
  console.log("calling Set on Track");
  remoteVideo.srcObject = remoteStream;

  peer.addEventListener("track", (event) => {
    console.log("Received track:", event.track);
    remoteStream.addTrack(event.track);
  });
}

function createVideo(peerUsername) {
  var videoContainer = document.querySelector("#receiver");

  var remoteVideo = document.createElement("video");

  remoteVideo.id = peerUsername + "video";
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;

  var videoWrapper = document.createElement("div");

  videoContainer.appendChild(videoWrapper);

  videoWrapper.appendChild(remoteVideo);

  return remoteVideo;
}
function createVideo(peerUsername) {
  var videoContainer = document.querySelector("#receiver");

  var remoteVideo = document.createElement("video");

  remoteVideo.id = peerUsername + "Screenvideo";
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;

  var videoWrapper = document.createElement("div");

  videoContainer.appendChild(videoWrapper);

  videoWrapper.appendChild(remoteVideo);

  return remoteVideo;
}

//   if (Object.keys(mapPeers).length >= 1) {
//     console.log("Cannot create more than 2 peers");
//     return;
function createAnswerer(offer, peerUsername, receiver_channel_name) {
  console.log("createAnswer");
  var peer = new RTCPeerConnection(null); // here instead of null, credentials of turn or stun server will come

  // addLocalTracks(peer);

  // setOnTrack(peer, remoteScreenVideo);
  // addScreenLocalTracks(peer);

  var remoteVideo = createVideo(peerUsername);
  setOnTrack(peer, remoteVideo);

  peer.addEventListener("datachannel", (e) => {
    peer.dc = e.channel;

    peer.dc.addEventListener("open", () => {
      console.log("opened");
    });
    peer.dc.addEventListener("message", dcOnMessage);
    mapPeers[peerUsername] = [peer, peer.dc];
  });

  peer.addEventListener("iceconnectionstatechange", () => {
    var iceconnectionstatechange = peer.iceConnectionState;
    if (
      iceconnectionstatechange === "failed" ||
      iceconnectionstatechange === "disconnected" ||
      iceconnectionstatechange === "closed"
    ) {
      delete mapPeers[peerUsername];

      if (iceconnectionstatechange != "closed") {
        peer.close();
      }
      removeVideo(remoteVideo);
    }
  });
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // console.log("new ice Candidate", JSON.stringify(peer.localDescription));
      return;
    }

    sendSignal("new-answer", {
      sdp: peer.localDescription,
      receiver_channel_name: receiver_channel_name,
    });
  });

  peer
    .setRemoteDescription(offer)
    .then(() => {
      console.log("remote des set for", peerUsername);

      return peer.createAnswer();
    })
    .then((a) => {
      console.log("answer created");

      peer.setLocalDescription(a);
    });
}

function getDataChannels() {
  var dataChannels = [];

  for (peerUsername in mapPeers) {
    var dataChannel = mapPeers[peerUsername][1];

    dataChannels.push(dataChannel);
  }

  return dataChannels;
}

function dcOnMessage(event) {
  var message = event.data;
  if (message == "new screen share") {
  }
  var li = document.createElement("li");
  li.appendChild(document.createTextNode(message));
  messagelist.appendChild(li);
}

var sbtn = document.querySelector("#btn-send");
sbtn.addEventListener("click", sendMessageOnClick);
var messagelist = document.querySelector("#message");
var messageInput = document.querySelector("#input-box");

function sendMessageOnClick() {
  var message = messageInput.value;
  var li = document.createElement("li");
  li.appendChild(document.createTextNode("Me :" + message));
  messagelist.appendChild(li);

  message = username + ": " + message;

  var datachannels = getDataChannels();
  for (index in datachannels) {
    datachannels[index].send(message);
  }

  messageInput.value = "";
}

function createExistingOfferer(peerUsername, receiver_channel_name) {
  console.log("creating existing offerrer");
  var peer = new RTCPeerConnection(null);
  addLocalTracks(peer);

  var remoteVideo = createVideo(peerUsername);
  setOnTrack(peer, remoteVideo);

  var dc = peer.createDataChannel("channel");
  dc.addEventListener("open", () => {
    console.log("opened");
  });
  dc.addEventListener("message", dcOnMessage);

  mapPeers[peerUsername] = [peer, dc];
  peer.addEventListener("iceconnectionstatechange", () => {
    var iceconnectionstatechange = peer.iceConnectionState;
    if (
      iceconnectionstatechange === "failed" ||
      iceconnectionstatechange === "disconnected" ||
      iceconnectionstatechange === "closed"
    ) {
      delete mapPeers[peerUsername];

      if (iceconnectionstatechange != "closed") {
        peer.close();
      }
      removeVideo(remoteVideo);
    }
  });
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // console.log("new ice Candidate", JSON.stringify(peer.localDescription));
      return;
    }

    sendSignal("new-Exoffer", {
      sdp: peer.localDescription,
      receiver_channel_name: receiver_channel_name,
    });
  });

  peer.createOffer().then((o) => {
    peer.setLocalDescription(o).then(() => {
      console.log("local des set");
    });
  });
}

function createExistingAnswerer(offer, peerUsername, receiver_channel_name) {
  var peer = new RTCPeerConnection(null); // here instead of null, credentials of turn or stun server will come
  console.log("creating existing answerer");
  addLocalTracks(peer);
  var remoteScreenVideo = createVideo(peerUsername);
  setOnTrack(peer, remoteScreenVideo);

  peer.addEventListener("datachannel", (e) => {
    peer.dc = e.channel;

    peer.dc.addEventListener("open", () => {
      console.log("opened");
    });
    peer.dc.addEventListener("message", dcOnMessage);
    mapPeers[peerUsername] = [peer, peer.dc];
  });

  peer.addEventListener("iceconnectionstatechange", () => {
    var iceconnectionstatechange = peer.iceConnectionState;
    if (
      iceconnectionstatechange === "failed" ||
      iceconnectionstatechange === "disconnected" ||
      iceconnectionstatechange === "closed"
    ) {
      delete mapPeers[peerUsername];

      if (iceconnectionstatechange != "closed") {
        peer.close();
      }
      removeVideo(remoteVideo);
    }
  });
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // console.log("new ice Candidate", JSON.stringify(peer.localDescription));
      return;
    }

    sendSignal("new-Exanswer", {
      sdp: peer.localDescription,
      receiver_channel_name: receiver_channel_name,
    });
  });

  peer
    .setRemoteDescription(offer)
    .then(() => {
      console.log("remote des set for", peerUsername);

      return peer.createAnswer();
    })
    .then((a) => {
      console.log("answer created");

      peer.setLocalDescription(a);
    });
}

var screenStream = new MediaStream();

ssbut = document.querySelector("#btn-screenShare");
ssbut.addEventListener("click", () => {
  var screenMedia = navigator.mediaDevices
    .getDisplayMedia({
      video: true,
      audio: true,
    })
    .then((stream) => {
      screenStream = stream;
      var screenVideo = createScreenVideo(username);
      screenVideo.srcObject = stream;
      sendSignal("screenPeer", {});
    })
    .catch((error) => {
      console.log(error);
    });
});

function createScreenVideo(peerUsername) {
  var videoContainer = document.querySelector("#receiver");

  var remoteVideo = document.createElement("video");

  remoteVideo.id = peerUsername + "screenVideo";
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;

  var videoWrapper = document.createElement("div");

  videoContainer.appendChild(videoWrapper);

  videoWrapper.appendChild(remoteVideo);

  return remoteVideo;
}

function createScreenOfferer(peerUsername, receiver_channel_name) {
  console.log("creating existing offerrer");
  var peer = new RTCPeerConnection(null);
  addScreenTracks(peer);
  var remoteScreenVideo = createScreenVideo(peerUsername);
  setOnTrack(peer, remoteScreenVideo);
  var dc = peer.createDataChannel("channel");
  dc.addEventListener("open", () => {
    console.log("opened");
  });
  dc.addEventListener("message", dcOnMessage);

  mapPeers[peerUsername] = [peer, dc];
  peer.addEventListener("iceconnectionstatechange", () => {
    var iceconnectionstatechange = peer.iceConnectionState;
    if (
      iceconnectionstatechange === "failed" ||
      iceconnectionstatechange === "disconnected" ||
      iceconnectionstatechange === "closed"
    ) {
      delete mapPeers[peerUsername];

      if (iceconnectionstatechange != "closed") {
        peer.close();
      }
      removeVideo(remoteVideo);
    }
  });
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // console.log("new ice Candidate", JSON.stringify(peer.localDescription));
      return;
    }

    sendSignal("new-Screenoffer", {
      sdp: peer.localDescription,
      receiver_channel_name: receiver_channel_name,
    });
  });

  peer.createOffer().then((o) => {
    peer.setLocalDescription(o).then(() => {
      console.log("local des set");
    });
  });
}

function addScreenTracks(peer) {
  console.log("calling addScreenTracks");
  screenStream.getTracks().forEach((track) => {
    console.log("adding", track);
    peer.addTrack(track, screenStream);
  });
  return;
}

function createScreenAnswerer(offer, peerUsername, receiver_channel_name) {
  var peer = new RTCPeerConnection(null); // here instead of null, credentials of turn or stun server will come
  console.log("creating Screen answerer");
  addScreenTracks(peer);
  var remoteScreenVideo = createScreenVideo(peerUsername);
  setOnTrack(peer, remoteScreenVideo);

  peer.addEventListener("datachannel", (e) => {
    peer.dc = e.channel;

    peer.dc.addEventListener("open", () => {
      console.log("opened");
    });
    peer.dc.addEventListener("message", dcOnMessage);
    mapPeers[peerUsername] = [peer, peer.dc];
  });

  peer.addEventListener("iceconnectionstatechange", () => {
    var iceconnectionstatechange = peer.iceConnectionState;
    if (
      iceconnectionstatechange === "failed" ||
      iceconnectionstatechange === "disconnected" ||
      iceconnectionstatechange === "closed"
    ) {
      delete mapPeers[peerUsername];

      if (iceconnectionstatechange != "closed") {
        peer.close();
      }
      removeVideo(remoteVideo);
    }
  });
  peer.addEventListener("icecandidate", (event) => {
    if (event.candidate) {
      // console.log("new ice Candidate", JSON.stringify(peer.localDescription));
      return;
    }

    sendSignal("new-Screenanswer", {
      sdp: peer.localDescription,
      receiver_channel_name: receiver_channel_name,
    });
  });

  peer
    .setRemoteDescription(offer)
    .then(() => {
      console.log("remote des set for", peerUsername);

      return peer.createAnswer();
    })
    .then((a) => {
      console.log("answer created");

      peer.setLocalDescription(a);
    });
}
