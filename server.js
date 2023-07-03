const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config({path: 'config.env'});

const PORT = process.env.PORT || 8080;

const app = express();

app.use(bodyparser.urlencoded({extended: true}));

app.use(bodyparser.json());

app.set('view engine', 'ejs');

app.use('/css',express.static(path.resolve(__dirname,'assets/css')));
app.use('/img',express.static(path.resolve(__dirname,'assets/img')));
app.use('/js',express.static(path.resolve(__dirname,'assets/js')));

let userName;
let remoteUserName;

var server = app.listen(PORT,()=>{
    console.log(`server is running on http://localhost:${PORT}`);
});

app.get('/',(req,res)=>{
    res.render('index');
});

app.get('/options',(req,res)=>{
    res.render('options',{user:userName,ruser:remoteUserName});
});


app.get('/video_chat',(req,res)=>{
    res.render('video_chat');
});

app.post('/username',(req,res)=>{
    userName = req.body.username;
    remoteUserName = req.body.remoteusername;
    return res.redirect('/options');
});

const io = require('socket.io')(server,{
    allowEI03:true
});


var userConnection = [];

io.on('connection',(socket)=>{
    console.log('socket id is ',socket.id);
    socket.on('userconnect',(data)=>{
        console.log('user is ',data.displayName);
        userConnection.push({
            connectionId: socket.id,
            userId: data.displayName
        });
        
        var userCount = userConnection.length;
        console.log('user count is ',userCount);
    });

    socket.on('offerSentToRemote',(data)=>{
        var offerReceiver = userConnection.find((o)=>o.userId===data.remoteUser);
        
        if(offerReceiver){
            console.log(`offerReceiver is ${offerReceiver.userId}`);
            socket.to(offerReceiver.connectionId).emit('receiveOffer',data);
        }

    }); 
    
    socket.on('answerSentToUser',(data)=>{
        var answerReceiver = userConnection.find((o)=>o.userId===data.receiver);

        if(answerReceiver){
            console.log(`answerReceiver is ${answerReceiver.userId} `);
            socket.to(answerReceiver.connectionId).emit('receiveAnswer',data);
        }
    });

    socket.on('candidateSentToUser',(data)=>{
        var candidateReceiver = userConnection.find((o)=>o.userId===data.remoteUser);

        if(candidateReceiver){
            console.log(`candidateReceiver is ${candidateReceiver.userId}`);
            socket.to(candidateReceiver.connectionId).emit('candidateReceiver',data);
        }
    });
    
    socket.on('disconnect',()=>{
        var disUser = userConnection.find((p)=>p.connectionId = socket.id);
        if(disUser){
            userConnection = userConnection.filter((p)=>p.connectionId = !socket.id);
        }
    });

});




