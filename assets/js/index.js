let localStream;
let username;
let remoteUser;
let peerConnection;
let sendChannel;
let receiveChannel;

var msgInput = document.querySelector('#msg-input');
var msgSendBtn = document.querySelector('.msg-send-button');
var chatTextArea = document.querySelector('.chat-text-area');


let url = new URL(window.location.href);
username = url.searchParams.get('username');
remoteUser = url.searchParams.get('remoteuser');

let init = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
    });

    document.getElementById('user-1').srcObject = localStream;

    createOffer();
};

init();


let socket = io.connect();

socket.on('connect',()=>{
    if(socket.connected) {
        socket.emit('userconnect',{
            displayName: username,
        });
    }
});

const iceServers = [
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.freeswitch.org:3478' }
  ]


let createPeerConnection = async () =>{
    
    peerConnection = new RTCPeerConnection({ iceServers });

    remoteStream = new MediaStream();

    document.getElementById('user-2').srcObject = remoteStream;

    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track,localStream);
    });

    peerConnection.ontrack = async (event) => {
        event.streams[0].getTracks().forEach((track)=>{
            remoteStream.addTrack(track);
        });
    }

    remoteStream.oninactive=()=>{
        remoteStream.getTracks().forEach((track)=>{
            track.enabled = !track.enabled;
        });
        peerConnection.close();
    }

    peerConnection.onicecandidate = async (event) =>{
        if(event.candidate){
            socket.emit('candidateSentToUser',{
                username : username,
                remoteUser : remoteUser,
                iceCandidateData : event.candidate
            });
        }
    }


    sendChannel = peerConnection.createDataChannel('sendDataChannel');

    sendChannel.onopen=()=>{

        console.log('Data channel is open');

        onSendChannelStateChange();
    }

    // sendChannel.onmessage=onSendChannelMsgCallback;

    peerConnection.ondatachannel=receiveChannelCallback;


}

function receiveChannelCallback(event){
    receiveChannel=event.channel;
    receiveChannel.onmessage=onReceiveChannelMsgCallback;
    receiveChannel.onopen=onReceiveChannelStateChange;
    receiveChannel.onclose=onReceiveChannelStateChange;
}

function onReceiveChannelMsgCallback(event){
    chatTextArea.innerHTML+= "<div style='margin: 2px 0;'><b>Stranger: </b>"+event.data+"</div>";
}

function onReceiveChannelStateChange(){
    const readystate = receiveChannel.readystate;
    console.log('receive channel state is ',readystate);
}



function sendData(){
    const msgData = msgInput.value;
    chatTextArea.innerHTML += "<div style='margin: 2px 0;'><b>Me: </b>"+msgData+"</div>";
    
    if(sendChannel){
        onSendChannelStateChange();
        sendChannel.send(msgData);
        msgInput.value="";
    }
    else{
        receiveChannel.send(msgData);
    }
}


function onSendChannelStateChange(){
    const readystate = sendChannel.readystate;
    console.log('send channel state is ',readystate);
}

let createOffer = async () =>{

    createPeerConnection();

    let offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    socket.emit('offerSentToRemote',{
        username : username,
        remoteUser : remoteUser,
        offer : peerConnection.localDescription
    })

};


let createAnswer = async (data) => {
    
    remoteUser = data.username;

    createPeerConnection();

    await peerConnection.setRemoteDescription(data.offer);

    let answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    socket.emit('answerSentToUser',{
        answer : answer,
        sender : data.remoteUser,
        receiver : data.username
    });

}

socket.on('receiveOffer',(data)=>{
    createAnswer(data);
})


let addAnswer = async (data) => {
        await peerConnection.setRemoteDescription(data.answer);
}

socket.on('receiveAnswer',(data)=>{
    addAnswer(data);
});


socket.on('candidateReceiver',(data)=>{
    peerConnection.addIceCandidate(data.iceCandidateData);
});


msgSendBtn.addEventListener('click',(event)=>{
    sendData();
});

