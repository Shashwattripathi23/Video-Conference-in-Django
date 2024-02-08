console.log("main js");

var labelUsername = document.querySelector("#username");
var inputUsername = document.querySelector("#userinput");
var btnjoin = document.querySelector("#join");
var webSocket;
var username;

var mapPeers = {};

function websocketonmessage(event) {
  var parsedData = JSON.parse(event.data);
  var peerUsername = parsedData["peer"];
  var action = parsedData["action"];

  if (username == peerUsername) {
    return;
  }

  var receiver_channel_name = parsedData["message"]["receiver_channel_name"];

  if (action == "new-peer") {
    createOfferer(peerUsername, receiver_channel_name);
    return;
  }

  if (action == "new-offer") {
    var offer = parsedData["message"]["sdp"];

    createAnswerer(offer, peerUsername, receiver_channel_name);

    return;
  }
  console.log(message);

  if (action == "new-answer") {
    var answer = parsedData["message"]["sdp"];

    var peer = mapPeers[peerUsername][0];

    peer.setRemoteDescription(answer);

    return;
  }
}

btnjoin.addEventListener("click", () => {
  username = inputUsername.value;

  if (username == "") {
    return;
  }

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

var localStream = new MediaStream();
const constraints = {
  video: true,
  audio: true,
};

const localVideo = document.querySelector("#local");
const abtn = document.querySelector("#audio");
const vbtn = document.querySelector("#videoB");

var userMedia = navigator.mediaDevices
  .getUserMedia(constraints)
  .then((stream) => {
    localStream = stream;
    localVideo.srcObject = localStream;
    localVideo.muted = true;

    var audioTrack = stream.getAudioTracks();
    var videoTrack = stream.getVideoTracks();

    audioTrack[0].enabled = true;
    videoTrack[0].enabled = true;

    abtn.addEventListener("click", () => {
      audioTrack[0].enabled = !audioTrack[0].enabled;
    });
    vbtn.addEventListener("click", () => {
      videoTrack[0].enabled = !videoTrack[0].enabled;
    });
  })
  .catch((error) => {
    console.log(error);
  });

var sbtn = document.querySelector("#sub");
sbtn.addEventListener("click", sendMessageOnClick);
var messagelist = document.querySelector("#message");
var messageInput = document.querySelector("#msg");

function sendMessageOnClick() {
  var message = messageInput.value;
  var li = document.createElement("li");
  li.appendChild(document.createTextNode("Me :" + message));
  messagelist.appendChild(li);

  var datachannels = getDataChannels();

  message = username + ": " + message;

  for (index in datachannels) {
    datachannels[index].send(message);
  }

  messageInput.value = "";
}

function sendSignal(action, message) {
  var jstr = JSON.stringify({
    message: message,
    action: action,
    peer: username,
  });

  webSocket.send(jstr);
}

function createOfferer(peerUsername, receiver_channel_name) {
  var peer = new RTCPeerConnection(null);

  addLocalTracks(peer);
  var dc = peer.createDataChannel("channel");
  dc.addEventListener("open", () => {
    console.log("opened");
  });
  dc.addEventListener("message", dcOnMessage);

  var remoteVideo = createVideo(peerUsername);
  setOnTrack(peer, remoteVideo);

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
      console.log("new ice Candidate", JSON.stringify(peer.localDescription));
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

function createAnswerer(offer, peerUsername, receiver_channel_name) {
  var peer = new RTCPeerConnection(null);

  addLocalTracks(peer);

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
      console.log("new ice Candidate", JSON.stringify(peer.localDescription));
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

function addLocalTracks(peer) {
  localStream.getTracks().forEach((track) => {
    peer.addTrack(track, localStream);
  });
  return;
}

function dcOnMessage(event) {
  var message = event.data;

  var li = document.createElement("li");
  li.appendChild(document.createTextNode(message));
  messagelist.appendChild(li);
}

function createVideo(peerUsername) {
  var videoContainer = document.querySelector("#video");

  var remoteVideo = document.createElement("video");

  remoteVideo.id = peerUsername + "-video";
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;

  var videoWrapper = document.createElement("div");

  videoContainer.appendChild(videoWrapper);

  videoWrapper.appendChild(remoteVideo);

  return remoteVideo;
}

function setOnTrack(peer, remoteVideo) {
  var remoteStream = new MediaStream();

  remoteVideo.srcObject = remoteStream;
  peer.addEventListener("track", async (event) => {
    remoteStream.addTrack(event.track, remoteStream);
  });
}

function removeVideo(video) {
  var videoWrapper = video.parentNode;
  videoWrapper.parentNode.removeChild(videoWrapper);
}

function getDataChannels() {
  var dataChannels = [];

  for (peerUsername in mapPeers) {
    var dataChannel = mapPeers[peerUsername][1];

    dataChannels.push(dataChannel);
  }

  return dataChannels;
}
