// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get comments by post id
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment
app.post('/posts/:id/comments', (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;
  const postId = req.params.id;

  // Store comment
  const comments = commentsByPostId[postId] || [];
  comments.push({ id: commentId, content, status: 'pending' });
  commentsByPostId[postId] = comments;

  // Emit event
  req.app.get('eventBus').emit('CommentCreated', {
    id: commentId,
    content,
    postId,
    status: 'pending',
  });

  res.status(201).send(comments);
});

// Handle events
app.post('/events', async (req, res) => {
  const { type, data } = req.body;

  // Handle comment moderation
  if (type === 'CommentModerated') {
    const { id, postId, status, content } = data;
    const comments = commentsByPostId[postId];
    const comment = comments.find((comment) => {
      return comment.id === id;
    });

    // Update comment status
    comment.status = status;

    // Emit event
    await req.app.get('eventBus').emit('CommentUpdated', {
      id,
      postId,
      status,
      content,
    });
  }

  res.send({});
});

// Listen to port
app.listen(4001, () => {
  console.log('Listening on port 4001');
});