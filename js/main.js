'use strict';

const mediaStreamConstraints = {
  video: true,
};

const offerOptions = {
  offerToRecieveVideo:1,
};

let startTime = null;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;

let localPeerConnection;
let remotePeerConnection;

function gotLocalMediaStream(mediaStream) {
  localStream = mediaStream;
  localVideo.srcObject = mediaStream;
  trace(`Recieved local stream.`);
  callButton.disabled = false;
}

function gotRemoteMediaStream(event){
  const mediaStream = event.stream;
  remoteVideo.srcObject = mediaStream;
  remoteStream = mediaStream;
  trace(`Remote peer connection recieved remote stream.`);
}

function logVideoLoaded(event){
  const video = event.target;
  trace(`${video.id} videoWidth: ${video.videoWidth}px, ` +
        `videoHeight: ${video.videoHeight}px.`);
}

function logResizedVideo(event){
  logVideoLoaded(event);

  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    startTime = null;
    trace(`Setup time: ${elapsedTime.toFixed(3)}ms.`);
  }
}

localVideo.addEventListener('loadedmetadata', logVideoLoaded);
remoteVideo.addEventListener('loadedmetadata',logVideoLoaded);
remoteVideo.addEventListener('onresize', logResizedVideo);

function handleConnection(event){
  const peerConnection = event.target;
  const iceCandidate = event.candidate;

  if(iceCandidate){
    const newIceCandidate = new RTCIceCandidate(iceCandidate);
    const otherPeer = getOtherPeer(peerConnection);

    otherPeer.addIceCandidate(iceCandidate)
      .then(()=>{
        handleConnectionSuccess(peerConnection);
      }).catch((error)=>{
        handleConnectionFailure(peerConnection,error);
      });

      trace(`${getPeerName(peerConnection)} ICE candidate:\n` +
          `${event.candidate.candidate}.`);
  }

}

function handleConnectionSuccess(peerConnection){
  trace(`${getPeerName(peerConnection)} addIceCandidate success.`)
}

function handleConnectionFailure(peerConnection,error){
  trace(`${getPeerName(peerConnection)} failed to add ICE Candidate:\n`+
        `${error.toString()}.`);
}

function handleConnectionChange(event){
  const peerConnection = event.target;
  console.log('ICE state change event: ', event);
  trace(`${getPeerName(peerConnection)} ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

function setSessionDescriptionError(error){
  trace(`Failed to create session description: ${error.toString()}.`)
}

function setDescriptionSuccess(peerConnection, functionName) {
  const peerName = getPeerName(peerConnection);
  trace(`${peerName} ${functionName} complete.`);
}

function setLocalDescriptionSuccess(peerConnection){
  setDescriptionSuccess(peerConnection, 'setLocalDescription');
}

function setRemoteDescriptionSuccess(peerConnection) {
  setDescriptionSuccess(peerConnection, 'setRemoteDescription');
}

function handleLocalMediaStreamError(error) {
  console.log('navigator.getUserMedia error: ', error);
}

function createdOffer(description){
  trace(`Offer frm localPeerConnection:\n${description.sdp}`);

  trace(`localPeerConnection setLocalDescription start.`);
  localPeerConnection.set.LocalDescription(description)
    .then(()=>{
      setLocalDescriptionSuccess(localPeerConnection);
    }).catch(serSessionDescriptionError);

    trace(`remotePeerConnection setRemoteDescription start.`);
    remotePeerConnection.setRemoteDescription(description)
      .then(createdAnswer)
      .catch(serSessionDescriptionError);
}

function createdAnswer(description){
  trace(`Amswer from remotePeerConnection:\n${description.sdp}`);

  trace(`remotePeerConnection setLocalDescription start.`);
  remotePeerConnection.setLocalDescriptionSuccess(description)
    .then(()=>{
      setLocalDescriptionSuccess(remotePeerConnection);
    }).catch(setSessionDescriptionError);

  trace(`localPeerConnection setRemoteDescription start.`);
  localPeerConnection.setRemoteDescription(description)
    .then(()=>{
      serRemoteDescriptionSuccess(localPeerConnection);
    }).catch(setSessionDescriptionError);
}

const startButton=document.getElementById('startButton');
startButton.addEventListener('click', startAction);
const callButton=document.getElementById('callButton');
callButton.addEventListener('click',callAction);
const hangupButton=document.getElementById('hangupButton');
hangupButton.addEventListener('click',hangupAction);

callButton.disabled=true;
hangupButton.disabled=true;

function startAction(){
  startButton.disabled=true;
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(gotLocalMediaStream).catch(handleLocalMediaStreamError);
  trace(`Requestion local stream.`);
}

function callAction(){
  callButton.disabled=true;
  hangupButton.disabled=true;

  trace(`Starting call.`);
  startTime = window.performance.now();

  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.lenght>0){
    trace(`Using video devise: ${videoTracks[0].label}.`)
  }
  if (audioTracks.lenght>0){
    trace(`Using video devise: ${audioTracks[0].label}.`)
  }

  const servers = null;

  localPeerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object localPeerConnection.');

  localPeerConnection.addEventListener('icecandidate', handleConnection);
  localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange)

  remotePeerConnection = new RTCPeerConnection(servers);
  trace('Created local peer connection object remotePeerConnection.');

  remotePeerConnection.addEventListener('icecandidate', handleConnection);
  remotePeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange)

  localPeerConnection.addStream(localStream);
  trace(`Added local stream to localPeerConnection`);

  trace(`localPeerConnection createOffer start.`);
  localPeerConnection.createOffer(offerOptions)
    .then(createdOffer).catch(setSessionDescriptionError);
}

function hangupAction(){
  localPeerConnection.close();
  remotePeerConnection.close();
  localPeerConnection = null;
  remotePeerConnection = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
  trace(`Ending Call`);
}

function getOtherPeer(peerConnection){
  return (peerConnection == localPeerConnection) ?
    remotePeerConnection : localPeerConnection;  
}

function getPeerName(peerConnection) {
  return (peerConnection === localPeerConnection) ?
      'localPeerConnection' : 'remotePeerConnection';
}

function trace(text) {
  text = text.trim();
  const now = (window.performance.now() / 1000).toFixed(3);

  console.log(now, text);
}


navigator.mediaDevices.getUserMedia(mediaStreamConstraints).
  then(gotLocalMediaStream).
  catch(handleLocalMediaStreamError);