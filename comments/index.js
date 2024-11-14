const express = require('express')
const bodyParser = require('body-parser')
const { randomBytes } = require('crypto')   
const cors = require('cors')
const axios = require('axios')
const { type } = require('os')

const app = express()

app.use(bodyParser.json())
app.use(cors())

const commentsByPostId = {} 

app.get('/posts/:id/comments', (req, res) => {
    console.log(`Fetching comments for post ${req.params.id}`);
    const comments = commentsByPostId[req.params.id] || [];
    console.log(`Fetched comments:`, comments);
    res.send(comments);
});



app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex')
    const { content } = req.body

    const comments = commentsByPostId[req.params.id] || [] 

    comments.push({ id: commentId, content, status: "pending" })

    commentsByPostId[req.params.id] = comments

    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            content,
            postId: req.params.id,
            status: "pending"
        }  
    } )
    
    res.status(201).send(comments)
})

app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    console.log('Event Received:', type);

    if (type === 'CommentModerated') {
        const { postId, id, status, content } = data;
        const comments = commentsByPostId[postId] || []; 
        const comment = comments.find(comment => comment.id === id);

        if (comment) {
            comment.status = status; 
            console.log(`Comment ${id} status updated to: ${status}`);


            await axios.post('http://event-bus-srv:4005/events', {
                type: "CommentUpdated",
                data: {
                    id,
                    status,
                    postId,
                    content
                }
            });
        } else {
            console.log(`Comment with id ${id} not found for post ${postId}`);
        }
    }


    if (type === 'CommentUpdated') {
        const { postId, id, status, content } = data;
        const comments = commentsByPostId[postId] || [];
        const comment = comments.find(comment => comment.id === id);
        
        if (comment) {
            comment.status = status; 
            console.log(`Comment ${id} status updated to: ${status}`);
        
        } else {
            console.log(`Comment with id ${id} not found for post ${postId}`);
        }
    }

    res.send({});
});




app.listen(4001, () => {
    console.log("Listening on 4001")
})