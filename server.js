require ('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')

const Comments = require('./models/commentModel')

const app = express()
app.use(express.json())
app.use(cors())

const http = require('http').createServer(app)
const io = require('socket.io')(http)


// socket io server
let users = []
io.on('connection', socket => {
    console.log(socket.id + ':connected = socket.id')
    socket.on('joinRoom', id => {

        const user = {userId: socket.id , room:id}
        const check = users.every(user => user.userId !== socket.id)

        if(check) {
            users.push(user)
            socket.join(user.room)
        }else{
            users.map(user => {
                if(user.userId === socket.id){
                    if(user.room !== id){
                        socket.leave(user.room)
                        socket.join(id)
                        user.room = id
                    }
                }
            })
        }
        // console.log("user", users)
        // console.log("socket", socket.adapter.rooms)
    })

    socket.on('createComment' ,async msg =>  {
        const {username, content, product_id , createdAt, rating ,send} = msg
       
        const newComment = new Comments({
            username, 
            content,
            product_id,
            createdAt,
            rating
        })

        if(send === 'replyComment'){
            const {_id,username,content,product_id,createdAt,rating} = newComment

            const comment = await Comments.findById(product_id)
            if(comment){
                comment.reply.push({
                    _id,username,content,createdAt,rating
                })
                await comment.save()
                io.to(comment.product_id).emit('sendReplyCommentToClient' , comment)
            }
        }else{
            await newComment.save()
            io.to(newComment.product_id).emit('sendCommentToClient' , newComment)
        }
    })

    socket.on('disconnect', () => {
        console.log(socket.id + 'disconnected')
    })
})

// Routers
app.use('/api' , require('./routes/productRouter'))
app.use('/api' , require('./routes/commentRouter'))

// Connection to mongodb 
const URI = process.env.MONGODB_URL
mongoose.connect(URI , {
    useCreateIndex: true,
    useFindAndModify : false,
    useNewUrlPasses: true,
    useUnifiedTopology: true
}, err => {
    if(err) throw err;
    console.log('connected to mongoodb')
})

if(process.env.NODE_ENV === 'production'){
    app.use(express.static('client/build'))
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'))
    })
}

const PORT = process.env.PORT || 5000
// Listen server
http.listen(PORT,()=>{
    console.log('Server is running on port ' , PORT)
})

